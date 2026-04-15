"""
Mawazin Telegram Bot v3 — Agent Mode
Gemma acts as a conversational agent, asking follow-ups until all info is gathered.

Features:
  - Multi-turn conversation via Gemma
  - Multi-pending: fire off many transactions, confirm each independently
  - Payee validation against Firefly expense accounts
  - Split/debt handling with auto-creation of debt accounts
  - Debt account picker (list existing + create new)
  - Account-aware (knows your Firefly accounts)
  - Persistent messages (draft stays after confirm/cancel)
  - /e command to edit recent transactions
"""

import json
import logging
import re
from datetime import datetime, timedelta

import httpx
from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

import config

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("mawazin")

# ─────────────────────────────────────────────
# Firefly Data Cache
# ─────────────────────────────────────────────

_cache = {
    "asset_accounts": [],
    "expense_accounts": [],   # payees
    "debt_accounts": [],      # liabilities
}


def _default_source_account() -> str:
    """Return the first asset account name from cache, or a last-resort fallback."""
    if _cache.get("asset_accounts"):
        return _cache["asset_accounts"][0]["name"]
    return "Unknown Account"


async def refresh_cache():
    """Fetch all account types from Firefly and cache them."""
    headers = _firefly_headers()
    async with httpx.AsyncClient(timeout=15) as client:
        # Asset accounts
        r = await client.get(f"{config.FIREFLY_URL}/api/v1/accounts?type=asset&limit=50", headers=headers)
        r.raise_for_status()
        _cache["asset_accounts"] = [
            {"id": a["id"], "name": a["attributes"]["name"], "role": a["attributes"].get("account_role", "")}
            for a in r.json().get("data", [])
        ]

        # Expense accounts (payees)
        r = await client.get(f"{config.FIREFLY_URL}/api/v1/accounts?type=expense&limit=100", headers=headers)
        r.raise_for_status()
        _cache["expense_accounts"] = [
            {"id": a["id"], "name": a["attributes"]["name"]}
            for a in r.json().get("data", [])
        ]

        # Liability/debt accounts
        r = await client.get(f"{config.FIREFLY_URL}/api/v1/accounts?type=liabilities&limit=50", headers=headers)
        r.raise_for_status()
        _cache["debt_accounts"] = [
            {"id": a["id"], "name": a["attributes"]["name"],
             "direction": a["attributes"].get("liability_direction", ""),
             "type": a["attributes"].get("liability_type", "")}
            for a in r.json().get("data", [])
        ]

    logger.info(
        f"Cache refreshed: {len(_cache['asset_accounts'])} asset, "
        f"{len(_cache['expense_accounts'])} expense, "
        f"{len(_cache['debt_accounts'])} debt accounts"
    )


# ─────────────────────────────────────────────
# Whisper Client
# ─────────────────────────────────────────────

async def transcribe(audio_bytes: bytes, filename: str = "voice.ogg") -> str:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{config.WHISPER_URL}/audio/transcriptions",
            files={"file": (filename, audio_bytes, "audio/ogg")},
            data={"model": config.WHISPER_MODEL, "language": "ar", "response_format": "json"},
        )
        resp.raise_for_status()
        return resp.json()["text"].strip()


# ─────────────────────────────────────────────
# Gemma Agent
# ─────────────────────────────────────────────

def build_agent_system_prompt() -> str:
    today = datetime.now().strftime("%Y-%m-%d")
    default_src = _default_source_account()

    assets = ", ".join(f'"{a["name"]}"' for a in _cache["asset_accounts"])
    payees = ", ".join(f'"{a["name"]}"' for a in _cache["expense_accounts"])
    debts = ", ".join(f'"{a["name"]}"' for a in _cache["debt_accounts"]) or "none"

    return f"""You are a JSON-only financial transaction bot. Today is {today}.
RESPOND WITH ONLY A JSON OBJECT. No text before or after. No markdown.

ACCOUNTS: {assets}
PAYEES: {payees}
DEBT ACCOUNTS: {debts}

If info is clear, return: {{"action":"create","transactions":[...],"summary":"..."}}
If info is missing (no amount/no payee), return: {{"action":"ask","message":"question"}}

ONLY ask if amount is truly missing. If user says "50 sar" that IS enough — use "{default_src}" as default source and "other" as category.

Transaction fields: type("withdrawal"/"deposit"/"transfer"), amount(number), currency(use currency user mentions: "USD","SAR",etc — default "SAR" only if none stated), source_account(MUST be one of ACCOUNTS above — NEVER a payee name), destination(payee name), category(pharmacy/food/groceries/transport/shopping/transfer/salary/bills/entertainment/telecom/fuel/health/education/rent/other), date("{today}"), notes(string or null), tags(["source:voice"])
IMPORTANT: source_account is always YOUR bank account ({default_src}, Cash wallet, etc). destination is WHERE you spent money (Starbucks, STC, etc). Never swap them.

SPLIT WITH DEBT: When user pays full and someone owes a share:
1. ONE withdrawal for YOUR SHARE ONLY (total - what others owe) from bank → payee
2. ONE debt record per person: type "withdrawal", amount=their share, source_account "DEBT_ACCOUNT", destination=person name, tags include "NEEDS_DEBT_ACCOUNT"
Example: "100 total, Saleh owes 40" → withdrawal 60 (your share) + debt record 40 (Saleh's share). Bank outflow in Firefly = 60 only.

EXAMPLES:
"50 at starbucks" → {{"action":"create","transactions":[{{"type":"withdrawal","amount":50,"currency":"SAR","source_account":"{default_src}","destination":"Starbucks","category":"food","date":"{today}","notes":null,"tags":["source:voice"]}}],"summary":"50 SAR at Starbucks"}}

"haircut 60 cash" → {{"action":"create","transactions":[{{"type":"withdrawal","amount":60,"currency":"SAR","source_account":"Cash wallet","destination":"Barber","category":"other","date":"{today}","notes":null,"tags":["source:voice"]}}],"summary":"60 SAR haircut from cash"}}

"dinner 500, khalid owes 250" → {{"action":"create","transactions":[{{"type":"withdrawal","amount":250,"currency":"SAR","source_account":"{default_src}","destination":"Restaurants","category":"food","date":"{today}","notes":"split with Khalid (total 500, my share 250)","tags":["source:voice"]}},{{"type":"withdrawal","amount":250,"currency":"SAR","source_account":"DEBT_ACCOUNT","destination":"Khalid","category":"transfer","date":"{today}","notes":"Khalid owes 250 of 500","tags":["source:voice","NEEDS_DEBT_ACCOUNT"]}}],"summary":"500 dinner, my share 250, Khalid owes 250"}}

"lent ahmed 1000" → {{"action":"create","transactions":[{{"type":"transfer","amount":1000,"currency":"SAR","source_account":"{default_src}","destination":"Ahmed","category":"transfer","date":"{today}","notes":"loan to Ahmed","tags":["source:voice","NEEDS_DEBT_ACCOUNT"]}}],"summary":"Lent 1000 to Ahmed"}}

"transfer 5000 from rajhi to snb" → {{"action":"create","transactions":[{{"type":"transfer","amount":5000,"currency":"SAR","source_account":"{default_src}","destination":"SNB Savings","category":"transfer","date":"{today}","notes":null,"tags":["source:voice"]}}],"summary":"Transfer 5000 to SNB"}}

"salary 15000 in rajhi" → {{"action":"create","transactions":[{{"type":"deposit","amount":15000,"currency":"SAR","source_account":"{default_src}","destination":"Salary","category":"salary","date":"{today}","notes":null,"tags":["source:voice"]}}],"summary":"Salary 15000"}}

Match user language. "cash" or "كاش" means source_account="Cash wallet". "rajhi" or "الراجحي" means "{default_src}". "snb" or "الأهلي" means "SNB Savings"."""


def extract_json(text: str) -> dict | None:
    """Try multiple strategies to extract JSON from LLM response."""
    text = text.strip()
    # Strip markdown fences — handle all common patterns
    text = re.sub(r"```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```", "", text)
    text = text.strip()

    # Fix common Gemma JSON errors: ],[ -> , (broken arrays)
    text = re.sub(r"\]\s*,\s*\[", ",", text)

    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to find the outermost { ... } including nested (most reliable)
    depth = 0
    start = None
    for i, c in enumerate(text):
        if c == '{':
            if depth == 0:
                start = i
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0 and start is not None:
                candidate = text[start:i + 1]
                # Also fix broken arrays in the candidate
                candidate = re.sub(r"\]\s*,\s*\[", ",", candidate)
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    start = None  # Try next top-level object

    return None


TYPE_MAP = {
    "payment": "withdrawal",
    "expense": "withdrawal",
    "spend": "withdrawal",
    "income": "deposit",
    "receive": "deposit",
    "refund": "deposit",
}


def normalize_transaction(txn: dict, today: str):
    """Fix common LLM issues in a transaction dict."""
    # Fix type
    t = (txn.get("type") or "withdrawal").lower()
    txn["type"] = TYPE_MAP.get(t, t)
    if txn["type"] not in ("withdrawal", "deposit", "transfer"):
        txn["type"] = "withdrawal"

    # Fix date
    d = txn.get("date") or ""
    if not d or not d.startswith("202"):
        txn["date"] = today

    # Ensure tags
    if not txn.get("tags"):
        txn["tags"] = ["source:voice"]

    # Ensure category
    if not txn.get("category"):
        txn["category"] = "other"

    # Fix source_account: must be a known asset account, not a payee/expense
    valid_sources = {a["name"] for a in _cache.get("asset_accounts", [])}
    src = txn.get("source_account", "")
    if src and src != "DEBT_ACCOUNT" and src not in valid_sources:
        # LLM put the payee name as source — fix it
        logger.warning(f"Invalid source_account '{src}', defaulting to {_default_source_account()}")
        txn["source_account"] = _default_source_account()


async def call_agent(conversation: list[dict], retry: int = 0) -> dict:
    """Call Gemma with conversation history. Retry once on parse failure."""
    if not _cache["asset_accounts"]:
        await refresh_cache()

    system_prompt = build_agent_system_prompt()
    messages = [{"role": "system", "content": system_prompt}] + conversation

    # On retry, add a reminder to return JSON only
    if retry > 0:
        messages.append({"role": "user", "content": "RESPOND WITH ONLY A JSON OBJECT. No other text."})

    payload = {
        "model": config.LLM_MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 2000,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(f"{config.LLM_URL}/chat/completions", json=payload)
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]

    parsed = extract_json(content)

    if parsed is None:
        if retry < 1:
            logger.warning(f"JSON parse failed, retrying. Raw: {content[:200]}")
            return await call_agent(conversation, retry=retry + 1)
        logger.error(f"JSON parse failed after retry: {content[:300]}")
        # Last resort: if the content looks like a question, wrap it as ask
        return {"action": "ask", "message": content[:200] if len(content) > 10 else "Could you rephrase that?"}

    # Log parsed response
    logger.info(f"Gemma parsed: {json.dumps(parsed, ensure_ascii=False)[:500]}")

    # Normalize all transactions
    today = datetime.now().strftime("%Y-%m-%d")
    if parsed.get("action") == "create":
        for txn in parsed.get("transactions", []):
            normalize_transaction(txn, today)
        # Validate: if any transaction has no amount, convert to ask
        for txn in parsed.get("transactions", []):
            amt = txn.get("amount")
            if amt is None or (isinstance(amt, (int, float)) and amt <= 0):
                logger.warning(f"Transaction missing amount, converting to ask")
                return {"action": "ask", "message": "How much was the amount?"}

    return parsed


# ─────────────────────────────────────────────
# Firefly III Client
# ─────────────────────────────────────────────

def _firefly_headers() -> dict:
    return {
        "Authorization": f"Bearer {config.FIREFLY_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/vnd.api+json",
    }


async def firefly_create_debt_account(name: str, currency: str = "SAR") -> dict | None:
    """Create a new debt/liability account in Firefly."""
    payload = {
        "name": name,
        "type": "liabilities",
        "liability_type": "debt",
        "liability_direction": "credit",  # "I am owed this" — they owe the user
        "currency_code": currency,
        "opening_balance": "0",
        "opening_balance_date": datetime.now().strftime("%Y-%m-%d"),
        "interest": "0",
        "interest_period": "monthly",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{config.FIREFLY_URL}/api/v1/accounts",
            headers=_firefly_headers(),
            json=payload,
        )
        if resp.status_code in (200, 201):
            data = resp.json().get("data", {})
            # Update cache
            _cache["debt_accounts"].append({
                "id": data["id"],
                "name": data["attributes"]["name"],
                "direction": "credit",
                "type": "debt",
            })
            logger.info(f"Created debt account: {name} (ID: {data['id']})")
            return data
        logger.error(f"Failed to create debt account: {resp.status_code} {resp.text[:300]}")
        return None


def _build_currency_fields(currency: str, amount) -> dict:
    """Build currency fields. Non-SAR uses foreign_currency on SAR accounts."""
    currency = (currency or "SAR").upper()
    fields = {"currency_code": "SAR"}
    if currency != "SAR":
        fields["foreign_currency_code"] = currency
        fields["foreign_amount"] = str(amount)
    return fields


async def _firefly_post_transaction(txn_data: dict) -> dict | None:
    """Post a single transaction to Firefly. Returns data or None."""
    payload = {"transactions": [txn_data]}
    logger.info(f"Firefly payload: {json.dumps(txn_data, ensure_ascii=False)[:500]}")
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{config.FIREFLY_URL}/api/v1/transactions",
            headers=_firefly_headers(),
            json=payload,
        )
        if resp.status_code in (200, 201):
            return resp.json().get("data", {})
        logger.error(f"Firefly create failed [{resp.status_code}]: {resp.text[:500]}")
        return None


async def _firefly_update_transaction(txn_id: str, updates: dict) -> dict | None:
    """Update a transaction in Firefly via PUT. Fetches existing data first and merges."""
    async with httpx.AsyncClient(timeout=15) as client:
        # Fetch existing transaction
        resp = await client.get(
            f"{config.FIREFLY_URL}/api/v1/transactions/{txn_id}",
            headers=_firefly_headers(),
        )
        if resp.status_code != 200:
            logger.error(f"Firefly fetch for update failed [{resp.status_code}]: {resp.text[:300]}")
            return None

        existing = resp.json().get("data", {}).get("attributes", {}).get("transactions", [])
        if not existing:
            logger.error(f"No transaction splits found for ID {txn_id}")
            return None

        # Build clean payload: only send fields Firefly accepts on PUT
        ALLOWED_FIELDS = {
            "type", "date", "amount", "description", "currency_id", "currency_code",
            "foreign_amount", "foreign_currency_id", "foreign_currency_code",
            "source_id", "source_name", "destination_id", "destination_name",
            "category_id", "category_name", "bill_id", "bill_name",
            "notes", "tags", "external_url",
        }

        raw = existing[0]
        txn_data = {k: v for k, v in raw.items() if k in ALLOWED_FIELDS}

        # If changing source/destination by name, null out old ID so name takes effect
        if "source_name" in updates:
            txn_data["source_id"] = None
        if "destination_name" in updates:
            txn_data["destination_id"] = None

        txn_data.update(updates)

        # Fix tags: Firefly returns tag objects, but PUT expects strings
        tags = txn_data.get("tags")
        if tags and isinstance(tags, list):
            txn_data["tags"] = [
                t.get("tag", "") if isinstance(t, dict) else str(t) for t in tags
            ]

        payload = {"transactions": [txn_data]}
        logger.info(f"Firefly PUT /transactions/{txn_id}: {json.dumps(updates, ensure_ascii=False)}")
        resp = await client.put(
            f"{config.FIREFLY_URL}/api/v1/transactions/{txn_id}",
            headers=_firefly_headers(),
            json=payload,
        )
        if resp.status_code in (200, 201):
            result = resp.json().get("data", {})
            logger.info(f"Firefly update OK for transaction {txn_id}")
            return result
        logger.error(f"Firefly update failed [{resp.status_code}]: {resp.text[:500]}")
        return None


async def _firefly_get_recent_transactions(limit: int = 5) -> list[dict]:
    """Fetch the most recent transactions from Firefly."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{config.FIREFLY_URL}/api/v1/transactions?limit={limit}&type=all",
            headers=_firefly_headers(),
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])

    results = []
    for item in data:
        txn_id = item.get("id")
        attrs = item.get("attributes", {})
        splits = attrs.get("transactions", [])
        if not splits:
            continue
        t = splits[0]
        results.append({
            "id": txn_id,
            "description": t.get("description", ""),
            "amount": t.get("amount", "0"),
            "currency_code": t.get("currency_code", "SAR"),
            "foreign_amount": t.get("foreign_amount"),
            "foreign_currency_code": t.get("foreign_currency_code"),
            "type": t.get("type", ""),
            "date": t.get("date", "")[:10],
            "source_name": t.get("source_name", ""),
            "destination_name": t.get("destination_name", ""),
            "category_name": t.get("category_name", ""),
            "notes": t.get("notes", ""),
            "tags": [tag.get("tag", "") if isinstance(tag, dict) else str(tag) for tag in (t.get("tags") or [])],
        })
    return results


async def firefly_create_transaction(txn: dict) -> dict | None:
    """Create a single transaction in Firefly.

    For debt transactions (has _debt_account_id):
      - type=withdrawal, source=bank, destination=person's debt account name
      - Firefly auto-detects debt account: bank -amount, debt +amount, net worth unchanged
    For normal transactions:
      - type=withdrawal/deposit/transfer as usual
    """
    tags = txn.get("tags", ["source:voice"])
    is_debt_txn = txn.get("_debt_account_id") is not None
    currency = (txn.get("currency") or "SAR").upper()
    amount = txn["amount"]

    txn_data = {
        "type": "withdrawal",
        "date": txn["date"],
        "amount": str(amount),
        "notes": txn.get("notes") or "",
        "tags": tags,
        **_build_currency_fields(currency, amount),
    }

    if is_debt_txn:
        # Debt: withdrawal from bank to debt account
        # Bank goes down, debt account goes up, net worth unchanged
        person = txn.get("destination", "Unknown")
        source_account = txn.get("_debt_source_account", _default_source_account())
        txn_data["description"] = txn.get("notes") or f"Loan to {person}"
        txn_data["source_name"] = source_account
        txn_data["destination_name"] = person  # Firefly matches to debt account by name
    else:
        txn_data["type"] = txn.get("type", "withdrawal")
        txn_data["description"] = txn.get("description") or txn.get("destination", "Unknown")
        txn_data["source_name"] = txn["source_account"]
        txn_data["destination_name"] = txn.get("destination", "Unknown")
        txn_data["category_name"] = txn.get("category", "other")

    return await _firefly_post_transaction(txn_data)


async def firefly_search_transactions(amount=None, merchant=None, days_back=3) -> list[dict]:
    """Search recent transactions for enrichment matching."""
    params = {"limit": 20}
    query_parts = []
    if amount is not None:
        query_parts.append(f"amount:{amount}")
    if merchant:
        query_parts.append(f"description_contains:{merchant}")
    date_from = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    query_parts.append(f"date_after:{date_from}")
    params["query"] = " ".join(query_parts)

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{config.FIREFLY_URL}/api/v1/search/transactions",
            headers=_firefly_headers(),
            params=params,
        )
        resp.raise_for_status()
        data = resp.json().get("data", [])

    results = []
    for item in data:
        txn = item.get("attributes", {}).get("transactions", [{}])[0]
        results.append({
            "id": item.get("id"),
            "description": txn.get("description", ""),
            "amount": txn.get("amount", ""),
            "date": txn.get("date", ""),
            "source_name": txn.get("source_name", ""),
            "destination_name": txn.get("destination_name", ""),
        })
    return results


# ─────────────────────────────────────────────
# Helpers: pending state (multi-pending)
# ─────────────────────────────────────────────

def _get_pending(context) -> dict:
    """Get the pending transactions dict {msg_id: agent_resp}."""
    if "pending" not in context.user_data:
        context.user_data["pending"] = {}
    return context.user_data["pending"]


def _set_pending(context, msg_id: int, data: dict):
    """Store a pending transaction keyed by the bot's reply message ID."""
    if "pending" not in context.user_data:
        context.user_data["pending"] = {}
    context.user_data["pending"][msg_id] = data


def _pop_pending(context, msg_id: int) -> dict | None:
    """Remove and return a pending transaction by message ID."""
    return context.user_data.get("pending", {}).pop(msg_id, None)


def _get_edit_state(context) -> dict:
    """Get the edit state dict for /e command."""
    if "edit_state" not in context.user_data:
        context.user_data["edit_state"] = {}
    return context.user_data["edit_state"]


# ─────────────────────────────────────────────
# Bot Handlers
# ─────────────────────────────────────────────

def is_allowed(user_id: int) -> bool:
    if not config.ALLOWED_USERS:
        return True
    return user_id in config.ALLOWED_USERS


def get_conversation(context: ContextTypes.DEFAULT_TYPE) -> list[dict]:
    """Get or initialize conversation history for this user."""
    if "conversation" not in context.user_data:
        context.user_data["conversation"] = []
    return context.user_data["conversation"]


def format_draft(agent_resp: dict) -> str:
    """Format the agent's create response as a readable draft."""
    lines = ["--- Transaction Draft ---"]
    for i, txn in enumerate(agent_resp.get("transactions", []), 1):
        if len(agent_resp.get("transactions", [])) > 1:
            lines.append(f"\nTransaction {i}:")
        lines.append(f"  Type:     {txn.get('type', '?')}")
        lines.append(f"  Amount:   {txn.get('currency', 'SAR')} {txn.get('amount', 0):,.2f}")
        lines.append(f"  From:     {txn.get('source_account', '?')}")
        lines.append(f"  To:       {txn.get('destination', '?')}")
        lines.append(f"  Category: {txn.get('category', '?')}")
        lines.append(f"  Date:     {txn.get('date', '?')}")
        if txn.get("notes"):
            lines.append(f"  Notes:    {txn['notes']}")
        tags = txn.get("tags", [])
        if "NEEDS_DEBT_ACCOUNT" in tags:
            lines.append(f"  ** Will create debt account for: {txn.get('destination', '?')}")

    summary = agent_resp.get("summary", "")
    if summary:
        lines.append(f"\n{summary}")

    return "\n".join(lines)


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start command — refresh cache and show help."""
    await refresh_cache()
    context.user_data["conversation"] = []

    assets = "\n".join(f"  - {a['name']}" for a in _cache["asset_accounts"])
    payees = ", ".join(a["name"] for a in _cache["expense_accounts"][:10])
    debts = ", ".join(a["name"] for a in _cache["debt_accounts"]) or "(none)"

    await update.message.reply_text(
        "Mawazin Bot v3 (Agent Mode)\n\n"
        "Talk to me naturally — voice or text.\n"
        "I'll ask questions until I have everything, then show a draft.\n\n"
        f"Your accounts:\n{assets}\n\n"
        f"Known payees: {payees}{'...' if len(_cache['expense_accounts']) > 10 else ''}\n"
        f"Debt accounts: {debts}\n\n"
        "Commands:\n"
        "  /start - Refresh & reset\n"
        "  /reset - Clear conversation\n"
        "  /accounts - Show all accounts\n"
        "  /e - Edit recent transactions"
    )


async def cmd_reset(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Reset conversation history."""
    context.user_data["conversation"] = []
    # Don't clear pending — those drafts are still valid on screen
    await update.message.reply_text("Conversation cleared. Start fresh.")


async def cmd_accounts(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show all accounts."""
    await refresh_cache()
    lines = ["Asset accounts:"]
    for a in _cache["asset_accounts"]:
        lines.append(f"  - {a['name']} ({a['role']})")
    lines.append("\nKnown payees:")
    for a in _cache["expense_accounts"]:
        lines.append(f"  - {a['name']}")
    lines.append("\nDebt accounts:")
    for a in _cache["debt_accounts"]:
        lines.append(f"  - {a['name']}")
    if not _cache["debt_accounts"]:
        lines.append("  (none)")
    await update.message.reply_text("\n".join(lines))


# ─────────────────────────────────────────────
# /e — Edit recent transactions
# ─────────────────────────────────────────────

async def cmd_edit(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Show the latest transactions for editing."""
    if not is_allowed(update.effective_user.id):
        return

    # Parse optional count: /e 10
    args = (update.message.text or "").split()
    count = 5
    if len(args) > 1:
        try:
            count = min(int(args[1]), 20)
        except ValueError:
            pass

    msg = await update.message.reply_text("Fetching recent transactions...")

    try:
        txns = await _firefly_get_recent_transactions(limit=count)
    except Exception as e:
        await msg.edit_text(f"Error fetching transactions: {e}")
        return

    if not txns:
        await msg.edit_text("No transactions found.")
        return

    # Store the fetched transactions for callback reference
    edit_state = _get_edit_state(context)
    edit_state["transactions"] = txns
    edit_state["list_msg_id"] = msg.message_id

    lines = ["Recent Transactions:"]
    buttons = []
    for i, t in enumerate(txns):
        amt_display = f"{t['currency_code']} {float(t['amount']):,.2f}"
        if t.get("foreign_amount") and t.get("foreign_currency_code"):
            amt_display = f"{t['foreign_currency_code']} {float(t['foreign_amount']):,.2f}"
        lines.append(
            f"\n{i+1}. {t['description']}\n"
            f"   {t['type']} | {amt_display}\n"
            f"   {t['source_name']} → {t['destination_name']}\n"
            f"   {t['date']} | {t.get('category_name', '')}"
        )
        buttons.append([InlineKeyboardButton(
            f"Edit #{i+1}: {t['description'][:25]}", callback_data=f"edittxn:{i}"
        )])

    await msg.edit_text(
        "\n".join(lines),
        reply_markup=InlineKeyboardMarkup(buttons),
    )


async def _handle_edit_callback(query, context, data: str):
    """Handle all edit-related callbacks."""
    edit_state = _get_edit_state(context)
    txns = edit_state.get("transactions", [])
    original_text = query.message.text or ""

    # --- Select transaction to edit ---
    if data.startswith("edittxn:"):
        idx = int(data.split(":")[1])
        if idx >= len(txns):
            await query.edit_message_text("Transaction not found.")
            return
        t = txns[idx]
        edit_state["editing_idx"] = idx
        edit_state["editing_msg_id"] = query.message.message_id

        amt_display = f"{t['currency_code']} {float(t['amount']):,.2f}"
        if t.get("foreign_amount") and t.get("foreign_currency_code"):
            amt_display += f" ({t['foreign_currency_code']} {float(t['foreign_amount']):,.2f})"

        detail = (
            f"Editing: {t['description']}\n\n"
            f"  Type:     {t['type']}\n"
            f"  Amount:   {amt_display}\n"
            f"  From:     {t['source_name']}\n"
            f"  To:       {t['destination_name']}\n"
            f"  Category: {t.get('category_name', '')}\n"
            f"  Date:     {t['date']}\n"
            f"  Notes:    {t.get('notes', '') or '(none)'}\n"
            f"\nWhat would you like to change?"
        )

        buttons = [
            [
                InlineKeyboardButton("Amount", callback_data="editfield:amount"),
                InlineKeyboardButton("Source", callback_data="editfield:source"),
            ],
            [
                InlineKeyboardButton("Destination", callback_data="editfield:destination"),
                InlineKeyboardButton("Category", callback_data="editfield:category"),
            ],
            [
                InlineKeyboardButton("Notes", callback_data="editfield:notes"),
                InlineKeyboardButton("Date", callback_data="editfield:date"),
            ],
            [InlineKeyboardButton("Delete", callback_data="editfield:delete")],
            [InlineKeyboardButton("Back to list", callback_data="editback")],
        ]

        # Add source account buttons for quick switch
        if t["type"] in ("withdrawal", "transfer"):
            src_buttons = [
                InlineKeyboardButton(a["name"][:18], callback_data=f"editsrc:{a['name'][:40]}")
                for a in _cache["asset_accounts"][:4]
            ]
            if src_buttons:
                buttons.insert(2, src_buttons)

        await query.edit_message_text(detail, reply_markup=InlineKeyboardMarkup(buttons))
        return

    # --- Quick source change ---
    if data.startswith("editsrc:"):
        acc_name = data[8:]
        idx = edit_state.get("editing_idx")
        if idx is not None and idx < len(txns):
            t = txns[idx]
            result = await _firefly_update_transaction(t["id"], {
                "source_name": acc_name,
            })
            if result:
                t["source_name"] = acc_name
                await query.edit_message_text(
                    f"Updated source to: {acc_name}\n\n"
                    f"{t['description']} | {t['currency_code']} {float(t['amount']):,.2f}\n"
                    f"{t['source_name']} → {t['destination_name']}",
                    reply_markup=InlineKeyboardMarkup([
                        [InlineKeyboardButton("Back to list", callback_data="editback")],
                    ])
                )
            else:
                await query.edit_message_text(
                    "Failed to update. Check logs.",
                    reply_markup=InlineKeyboardMarkup([
                        [InlineKeyboardButton("Back to list", callback_data="editback")],
                    ])
                )
        return

    # --- Field edit request (sets awaiting_edit so next text message updates it) ---
    if data.startswith("editfield:"):
        field = data.split(":")[1]
        idx = edit_state.get("editing_idx")
        if idx is None or idx >= len(txns):
            return

        if field == "delete":
            t = txns[idx]
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.delete(
                    f"{config.FIREFLY_URL}/api/v1/transactions/{t['id']}",
                    headers=_firefly_headers(),
                )
            if resp.status_code in (200, 204):
                await query.edit_message_text(
                    f"Deleted: {t['description']} {t['currency_code']} {float(t['amount']):,.2f}"
                )
                txns.pop(idx)
            else:
                await query.edit_message_text(
                    f"Delete failed [{resp.status_code}]",
                    reply_markup=InlineKeyboardMarkup([
                        [InlineKeyboardButton("Back to list", callback_data="editback")],
                    ])
                )
            return

        field_labels = {
            "amount": "Enter new amount (number):",
            "source": "Enter new source account name:",
            "destination": "Enter new destination/payee:",
            "category": "Enter new category:",
            "notes": "Enter new notes (or 'clear' to remove):",
            "date": "Enter new date (YYYY-MM-DD):",
        }
        edit_state["awaiting_edit"] = field
        await query.edit_message_text(
            field_labels.get(field, f"Enter new {field}:"),
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("Cancel edit", callback_data="editback")],
            ])
        )
        return

    # --- Back to list ---
    if data == "editback":
        edit_state.pop("awaiting_edit", None)
        edit_state.pop("editing_idx", None)
        # Re-show the list
        lines = ["Recent Transactions:"]
        buttons = []
        for i, t in enumerate(txns):
            amt_display = f"{t['currency_code']} {float(t['amount']):,.2f}"
            if t.get("foreign_amount") and t.get("foreign_currency_code"):
                amt_display = f"{t['foreign_currency_code']} {float(t['foreign_amount']):,.2f}"
            lines.append(
                f"\n{i+1}. {t['description']}\n"
                f"   {t['type']} | {amt_display}\n"
                f"   {t['source_name']} → {t['destination_name']}\n"
                f"   {t['date']} | {t.get('category_name', '')}"
            )
            buttons.append([InlineKeyboardButton(
                f"Edit #{i+1}: {t['description'][:25]}", callback_data=f"edittxn:{i}"
            )])
        await query.edit_message_text(
            "\n".join(lines),
            reply_markup=InlineKeyboardMarkup(buttons),
        )
        return


async def _handle_edit_text_input(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """If user is in edit mode, handle text as field update. Returns True if handled."""
    edit_state = _get_edit_state(context)
    field = edit_state.get("awaiting_edit")
    idx = edit_state.get("editing_idx")
    txns = edit_state.get("transactions", [])

    if not field or idx is None or idx >= len(txns):
        return False

    text = update.message.text.strip()
    t = txns[idx]

    # Map field name to Firefly API field
    update_data = {}
    if field == "amount":
        try:
            new_amount = float(text.replace(",", ""))
        except ValueError:
            await update.message.reply_text("Invalid amount. Enter a number.")
            return True
        update_data["amount"] = str(new_amount)
        t["amount"] = str(new_amount)
    elif field == "source":
        update_data["source_name"] = text
        t["source_name"] = text
    elif field == "destination":
        update_data["destination_name"] = text
        t["destination_name"] = text
    elif field == "category":
        update_data["category_name"] = text
        t["category_name"] = text
    elif field == "notes":
        new_notes = "" if text.lower() == "clear" else text
        update_data["notes"] = new_notes
        t["notes"] = new_notes
    elif field == "date":
        update_data["date"] = text
        t["date"] = text

    result = await _firefly_update_transaction(t["id"], update_data)

    edit_state.pop("awaiting_edit", None)

    if result:
        await update.message.reply_text(
            f"Updated {field} to: {text}\n\nUse /e to see updated list."
        )
    else:
        await update.message.reply_text(f"Failed to update {field}. Check logs.\n\nUse /e to retry.")

    return True


# ─────────────────────────────────────────────
# Message handlers
# ─────────────────────────────────────────────

async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle voice messages — transcribe then process."""
    if not is_allowed(update.effective_user.id):
        return

    msg = await update.message.reply_text("Transcribing...")

    voice = update.message.voice or update.message.audio
    file = await context.bot.get_file(voice.file_id)
    voice_bytes = await file.download_as_bytearray()

    try:
        transcript = await transcribe(bytes(voice_bytes))
    except Exception as e:
        await msg.edit_text(f"Transcription failed: {e}")
        return

    await msg.edit_text(f'Heard: "{transcript}"\n\nThinking...')
    await _process_message(update, context, msg, transcript)


async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle text messages."""
    if not is_allowed(update.effective_user.id):
        return

    # Check if user is in edit mode — handle text as field update
    if await _handle_edit_text_input(update, context):
        return

    text = update.message.text.strip()
    msg = await update.message.reply_text("Thinking...")
    await _process_message(update, context, msg, text)


async def _process_message(update, context, msg, user_text: str):
    """Core agent loop: add message to history, call Gemma, handle response."""
    conversation = get_conversation(context)
    conversation.append({"role": "user", "content": user_text})

    try:
        agent_resp = await call_agent(conversation)
    except Exception as e:
        await msg.edit_text(f"Agent error: {e}")
        return

    action = agent_resp.get("action", "ask")

    if action == "ask":
        # Agent needs more info — show question
        question = agent_resp.get("message", "Could you tell me more?")
        conversation.append({"role": "assistant", "content": json.dumps(agent_resp, ensure_ascii=False)})
        await msg.edit_text(question)

    elif action == "create":
        # Agent has gathered everything — show draft for confirmation
        conversation.append({"role": "assistant", "content": json.dumps(agent_resp, ensure_ascii=False)})

        # Inject raw user text into notes for every transaction
        for txn in agent_resp.get("transactions", []):
            existing_notes = txn.get("notes") or ""
            if existing_notes:
                txn["notes"] = f"{existing_notes}\n---\nRaw: {user_text}"
            else:
                txn["notes"] = f"Raw: {user_text}"

        # Store pending keyed by this bot message ID
        _set_pending(context, msg.message_id, agent_resp)

        # Reset conversation so next message starts fresh
        context.user_data["conversation"] = []

        draft = format_draft(agent_resp)

        # Check if any transactions need debt account creation
        needs_debt = any(
            "NEEDS_DEBT_ACCOUNT" in txn.get("tags", [])
            for txn in agent_resp.get("transactions", [])
        )

        buttons = []

        if needs_debt:
            # Show debt account picker
            debt_names = [a["name"] for a in _cache["debt_accounts"]]
            if debt_names:
                buttons.append([InlineKeyboardButton(
                    f"Use existing: {n}", callback_data=f"usedebt:{n[:40]}"
                ) for n in debt_names[:3]])
            # Find the person name from the debt transaction
            for txn in agent_resp.get("transactions", []):
                if "NEEDS_DEBT_ACCOUNT" in txn.get("tags", []):
                    person = txn.get("destination", "Unknown")
                    buttons.append([InlineKeyboardButton(
                        f'Create debt account: "{person}"',
                        callback_data=f"newdebt:{person[:40]}"
                    )])

        # Account picker for source
        buttons.append([
            InlineKeyboardButton(a["name"][:18], callback_data=f"src:{a['name'][:40]}")
            for a in _cache["asset_accounts"][:3]
        ])
        if len(_cache["asset_accounts"]) > 3:
            buttons.append([
                InlineKeyboardButton(a["name"][:18], callback_data=f"src:{a['name'][:40]}")
                for a in _cache["asset_accounts"][3:6]
            ])

        buttons.append([
            InlineKeyboardButton("Confirm", callback_data="confirm"),
            InlineKeyboardButton("Cancel", callback_data="cancel"),
        ])

        await msg.edit_text(draft, reply_markup=InlineKeyboardMarkup(buttons))


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle inline keyboard presses."""
    query = update.callback_query
    await query.answer()
    data = query.data
    original_text = query.message.text or ""
    msg_id = query.message.message_id

    # --- Route edit callbacks ---
    if data.startswith("edit"):
        await _handle_edit_callback(query, context, data)
        return

    # --- Get pending for THIS message ---
    pending = _get_pending(context).get(msg_id)

    # --- Cancel ---
    if data == "cancel":
        _pop_pending(context, msg_id)
        await query.edit_message_text(original_text + "\n\n--- CANCELLED ---")
        return

    # --- Change source account ---
    if data.startswith("src:"):
        acc_name = data[4:]
        if pending:
            for txn in pending.get("transactions", []):
                if txn.get("type") in ("withdrawal", "transfer"):
                    txn["source_account"] = acc_name
            _set_pending(context, msg_id, pending)
            draft = format_draft(pending)
            await _refresh_draft(query, context, draft, msg_id)
        return

    # --- Use existing debt account ---
    if data.startswith("usedebt:"):
        debt_name = data[8:]
        if pending:
            for txn in pending.get("transactions", []):
                tags = txn.get("tags", [])
                if "NEEDS_DEBT_ACCOUNT" in tags:
                    txn["destination"] = debt_name
                    txn["tags"] = [t for t in tags if t != "NEEDS_DEBT_ACCOUNT"]
            _set_pending(context, msg_id, pending)
            draft = format_draft(pending)
            await _refresh_draft(query, context, draft, msg_id)
        return

    # --- Create new debt account ---
    if data.startswith("newdebt:"):
        person_name = data[8:]
        if pending:
            # Create the debt account in Firefly
            result = await firefly_create_debt_account(person_name)
            if result:
                # Update the transaction
                for txn in pending.get("transactions", []):
                    tags = txn.get("tags", [])
                    if "NEEDS_DEBT_ACCOUNT" in tags:
                        txn["destination"] = person_name
                        txn["tags"] = [t for t in tags if t != "NEEDS_DEBT_ACCOUNT"]
                _set_pending(context, msg_id, pending)
                draft = format_draft(pending)
                draft = f"[Created debt account: {person_name}]\n\n" + draft
                await _refresh_draft(query, context, draft, msg_id)
            else:
                await query.edit_message_text(
                    original_text + f"\n\nFailed to create debt account for {person_name}."
                )
        return

    # --- Confirm ---
    if data == "confirm":
        if not pending:
            await query.edit_message_text(original_text + "\n\n--- EXPIRED ---")
            return

        txns = pending.get("transactions", [])

        # Find the bank account from the main (non-debt) transaction
        bank_account = _default_source_account()
        for txn in txns:
            src = txn.get("source_account", "")
            if src and src != "DEBT_ACCOUNT":
                bank_account = src
                break

        results = []
        for txn in txns:
            tags = txn.get("tags", [])

            # Resolve debt account: find or create, set _debt_account_id
            if "NEEDS_DEBT_ACCOUNT" in tags:
                person = txn.get("destination", "Unknown")
                # Check if already exists in cache
                debt_acc = next((a for a in _cache["debt_accounts"] if a["name"].lower() == person.lower()), None)
                if not debt_acc:
                    acc_result = await firefly_create_debt_account(person, txn.get("currency", "SAR"))
                    if acc_result:
                        debt_acc = {"id": acc_result["id"], "name": person}
                if debt_acc:
                    txn["_debt_account_id"] = debt_acc["id"]
                    txn["_debt_source_account"] = bank_account
                    txn["tags"] = [t for t in tags if t != "NEEDS_DEBT_ACCOUNT"]
                    txn["tags"].append(f"debt:{person}")
                else:
                    results.append(f"FAILED: Could not create debt account for {person}")
                    continue

            # Also handle already-resolved debt txns (user picked existing debt account)
            if txn.get("type") in ("transfer", "withdrawal") and not txn.get("_debt_account_id"):
                dest = txn.get("destination", "")
                debt_acc = next((a for a in _cache["debt_accounts"] if a["name"].lower() == dest.lower()), None)
                if debt_acc:
                    txn["_debt_account_id"] = debt_acc["id"]
                    txn["_debt_source_account"] = bank_account
                    if f"debt:{dest}" not in txn.get("tags", []):
                        txn.setdefault("tags", []).append(f"debt:{dest}")

            result = await firefly_create_transaction(txn)
            if result:
                results.append(f"ID {result.get('id', '?')}: {txn.get('destination', '?')} {txn.get('currency', 'SAR')} {txn['amount']:,.2f}")
            else:
                results.append(f"FAILED: {txn.get('destination', '?')} {txn['amount']:,.2f}")

        _pop_pending(context, msg_id)

        result_text = "\n".join(f"  {r}" for r in results)
        await query.edit_message_text(
            original_text + f"\n\n--- CONFIRMED ---\n{result_text}"
        )
        return


async def _refresh_draft(query, context, draft: str, msg_id: int):
    """Refresh the draft message with updated keyboard."""
    pending = _get_pending(context).get(msg_id, {})

    needs_debt = any(
        "NEEDS_DEBT_ACCOUNT" in txn.get("tags", [])
        for txn in pending.get("transactions", [])
    )

    buttons = []

    if needs_debt:
        debt_names = [a["name"] for a in _cache["debt_accounts"]]
        for n in debt_names[:3]:
            buttons.append([InlineKeyboardButton(f"Use: {n}", callback_data=f"usedebt:{n[:40]}")])
        for txn in pending.get("transactions", []):
            if "NEEDS_DEBT_ACCOUNT" in txn.get("tags", []):
                person = txn.get("destination", "Unknown")
                buttons.append([InlineKeyboardButton(
                    f'Create: "{person}"', callback_data=f"newdebt:{person[:40]}"
                )])

    buttons.append([
        InlineKeyboardButton(a["name"][:18], callback_data=f"src:{a['name'][:40]}")
        for a in _cache["asset_accounts"][:3]
    ])
    if len(_cache["asset_accounts"]) > 3:
        buttons.append([
            InlineKeyboardButton(a["name"][:18], callback_data=f"src:{a['name'][:40]}")
            for a in _cache["asset_accounts"][3:6]
        ])

    buttons.append([
        InlineKeyboardButton("Confirm", callback_data="confirm"),
        InlineKeyboardButton("Cancel", callback_data="cancel"),
    ])

    await query.edit_message_text(draft, reply_markup=InlineKeyboardMarkup(buttons))


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def main():
    if config.TELEGRAM_BOT_TOKEN == "YOUR_BOT_TOKEN_HERE":
        print("ERROR: Set TELEGRAM_BOT_TOKEN in config.py or env var.")
        return

    app = Application.builder().token(config.TELEGRAM_BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("reset", cmd_reset))
    app.add_handler(CommandHandler("accounts", cmd_accounts))
    app.add_handler(CommandHandler("e", cmd_edit))
    app.add_handler(MessageHandler(filters.VOICE | filters.AUDIO, handle_voice))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text))
    app.add_handler(CallbackQueryHandler(handle_callback))

    logger.info("Mawazin bot v3 (agent mode) starting...")
    app.run_polling()


if __name__ == "__main__":
    main()
