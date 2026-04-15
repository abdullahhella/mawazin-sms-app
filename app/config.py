"""Configuration loaded from environment variables."""

import os

# --- Database ---
DB_PATH = os.environ.get("DB_PATH", "/data/mawazin.db")

# --- LLM (SMS Parsing) ---
LLM_URL = os.environ.get("LLM_URL", "http://localhost:11434/v1")
LLM_MODEL = os.environ.get("LLM_MODEL", "gemma3:4b")

# --- Firefly III ---
FIREFLY_URL = os.environ.get("FIREFLY_URL", "http://localhost:8080")
FIREFLY_TOKEN = os.environ.get("FIREFLY_TOKEN", "")

# --- Telegram (for batch summaries) ---
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

# --- Auth (protect the /sms/ingest endpoint) ---
INGEST_API_KEY = os.environ.get("INGEST_API_KEY", "change-me")

# --- Batch Processing ---
BATCH_INTERVAL_HOURS = int(os.environ.get("BATCH_INTERVAL_HOURS", "3"))
DEDUP_WINDOW_DAYS = int(os.environ.get("DEDUP_WINDOW_DAYS", "7"))

# --- Fallback account when card mapping is missing ---
FALLBACK_ACCOUNT_NAME = os.environ.get("FALLBACK_ACCOUNT_NAME", "")
