"""SQLite database layer."""

import sqlite3
import os
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS sms_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bank TEXT NOT NULL,
    message TEXT NOT NULL,
    received_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    processed_at TEXT,
    firefly_txn_id TEXT,
    UNIQUE(bank, message, received_at)
);

CREATE INDEX IF NOT EXISTS idx_sms_status ON sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_sms_received ON sms_queue(received_at);

CREATE TABLE IF NOT EXISTS sms_parsed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sms_id INTEGER NOT NULL REFERENCES sms_queue(id),
    action TEXT NOT NULL,
    type TEXT,
    amount REAL,
    currency TEXT,
    merchant TEXT,
    card_fragment TEXT,
    txn_date TEXT,
    confidence INTEGER,
    firefly_account_id TEXT,
    firefly_account_name TEXT,
    firefly_txn_id TEXT,
    notes TEXT,
    raw_llm_response TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_parsed_sms ON sms_parsed(sms_id);
CREATE INDEX IF NOT EXISTS idx_parsed_date ON sms_parsed(txn_date);

CREATE TABLE IF NOT EXISTS card_mappings (
    card_fragment TEXT PRIMARY KEY,
    bank TEXT,
    firefly_account_id TEXT,
    firefly_account_name TEXT,
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_used_at TEXT,
    sms_count INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS processing_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    sms_processed INTEGER DEFAULT 0,
    sms_created INTEGER DEFAULT 0,
    sms_skipped INTEGER DEFAULT 0,
    sms_errored INTEGER DEFAULT 0,
    sms_duplicates INTEGER DEFAULT 0,
    summary_sent INTEGER DEFAULT 0,
    error TEXT
);
"""


def init_db():
    """Create database and tables if they don't exist."""
    db_path = Path(config.DB_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    with get_conn() as conn:
        conn.executescript(SCHEMA)
        conn.commit()


@contextmanager
def get_conn():
    """Context manager for SQLite connection. Returns Row-based connection."""
    conn = sqlite3.connect(config.DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


# --- SMS Queue Operations ---

def enqueue_sms(bank: str, message: str, received_at: str) -> int | None:
    """Add SMS to queue. Returns ID or None if duplicate."""
    try:
        with get_conn() as conn:
            cur = conn.execute(
                """INSERT INTO sms_queue (bank, message, received_at, status)
                   VALUES (?, ?, ?, 'pending')""",
                (bank, message, received_at),
            )
            conn.commit()
            return cur.lastrowid
    except sqlite3.IntegrityError:
        return None  # duplicate


def get_pending_sms(limit: int = 100) -> list[dict]:
    """Fetch pending SMS ordered by received date."""
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT * FROM sms_queue WHERE status = 'pending'
               ORDER BY received_at ASC LIMIT ?""",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]


def mark_sms_processed(sms_id: int, firefly_txn_id: str | None = None, error: str | None = None):
    """Mark an SMS as processed (or errored)."""
    status = "errored" if error else "processed"
    with get_conn() as conn:
        conn.execute(
            """UPDATE sms_queue
               SET status = ?, processed_at = datetime('now'),
                   firefly_txn_id = ?, error = ?
               WHERE id = ?""",
            (status, firefly_txn_id, error, sms_id),
        )
        conn.commit()


def mark_sms_skipped(sms_id: int, reason: str):
    """Mark an SMS as skipped (non-transaction)."""
    with get_conn() as conn:
        conn.execute(
            """UPDATE sms_queue
               SET status = 'skipped', processed_at = datetime('now'), error = ?
               WHERE id = ?""",
            (reason, sms_id),
        )
        conn.commit()


# --- Parsed SMS ---

def insert_parsed(parsed: dict) -> int:
    """Save parsed SMS record."""
    with get_conn() as conn:
        cur = conn.execute(
            """INSERT INTO sms_parsed
               (sms_id, action, type, amount, currency, merchant, card_fragment,
                txn_date, confidence, firefly_account_id, firefly_account_name,
                firefly_txn_id, notes, raw_llm_response)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                parsed.get("sms_id"),
                parsed.get("action"),
                parsed.get("type"),
                parsed.get("amount"),
                parsed.get("currency"),
                parsed.get("merchant"),
                parsed.get("card_fragment"),
                parsed.get("txn_date"),
                parsed.get("confidence"),
                parsed.get("firefly_account_id"),
                parsed.get("firefly_account_name"),
                parsed.get("firefly_txn_id"),
                parsed.get("notes"),
                parsed.get("raw_llm_response"),
            ),
        )
        conn.commit()
        return cur.lastrowid


# --- Card Mappings ---

def upsert_card(card_fragment: str, bank: str) -> None:
    """Create card mapping entry (without account assignment) if new."""
    with get_conn() as conn:
        conn.execute(
            """INSERT INTO card_mappings (card_fragment, bank, last_used_at, sms_count)
               VALUES (?, ?, datetime('now'), 1)
               ON CONFLICT(card_fragment) DO UPDATE SET
                 last_used_at = datetime('now'),
                 sms_count = sms_count + 1,
                 bank = COALESCE(card_mappings.bank, excluded.bank)""",
            (card_fragment, bank),
        )
        conn.commit()


def get_card_mapping(card_fragment: str) -> dict | None:
    """Look up a card's Firefly account mapping."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM card_mappings WHERE card_fragment = ?",
            (card_fragment,),
        ).fetchone()
        return dict(row) if row else None


def list_cards() -> list[dict]:
    """List all card mappings."""
    with get_conn() as conn:
        rows = conn.execute(
            """SELECT * FROM card_mappings
               ORDER BY (firefly_account_id IS NULL) DESC, sms_count DESC"""
        ).fetchall()
        return [dict(r) for r in rows]


def set_card_account(card_fragment: str, account_id: str, account_name: str) -> bool:
    """Assign a Firefly account to a card."""
    with get_conn() as conn:
        cur = conn.execute(
            """UPDATE card_mappings
               SET firefly_account_id = ?, firefly_account_name = ?, updated_at = datetime('now')
               WHERE card_fragment = ?""",
            (account_id, account_name, card_fragment),
        )
        conn.commit()
        return cur.rowcount > 0


# --- Processing Runs ---

def start_run() -> int:
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO processing_runs (started_at) VALUES (datetime('now'))"
        )
        conn.commit()
        return cur.lastrowid


def finish_run(run_id: int, stats: dict, error: str | None = None):
    with get_conn() as conn:
        conn.execute(
            """UPDATE processing_runs
               SET completed_at = datetime('now'),
                   sms_processed = ?, sms_created = ?, sms_skipped = ?,
                   sms_errored = ?, sms_duplicates = ?, summary_sent = ?, error = ?
               WHERE id = ?""",
            (
                stats.get("processed", 0),
                stats.get("created", 0),
                stats.get("skipped", 0),
                stats.get("errored", 0),
                stats.get("duplicates", 0),
                int(stats.get("summary_sent", False)),
                error,
                run_id,
            ),
        )
        conn.commit()


def recent_runs(limit: int = 20) -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM processing_runs ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]
