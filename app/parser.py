"""SMS parser using Gemma LLM. Extracts transaction data + card fragment."""

import json
import logging
import re

import httpx

from . import config

logger = logging.getLogger("mawazin.parser")

SMS_PARSER_PROMPT = """You are a bank SMS parser. Extract transaction data from SMS messages.

RULES:
- If the SMS is NOT a financial transaction (marketing, OTP, beneficiary added/activated, maintenance, insufficient balance, confirmation of delivery, promotional offers, system update, login, password reset, loyalty points, app notification, credit card statement, minimum due reminder, scheduled payment notice, reversal of a previous transaction), return: {"action": "skip", "reason": "short reason"}
- If it IS a transaction, return the JSON below.

TRANSACTION JSON:
{"action": "create", "type": "withdrawal|deposit|transfer", "amount": number, "currency": "SAR", "merchant": "merchant or person name", "date": "YYYY-MM-DD", "card": "last4 or null", "notes": "brief context"}

TYPE RULES:
- Purchase / POS / online purchase / bill payment / SADAD payment = "withdrawal"
- Incoming transfer / salary / adding money to wallet / refund = "deposit"
- Outgoing transfer to a person or own card = "transfer"
- Credit card payment (paying your own card) = "transfer"
- Reversal / refund of a previous charge = "deposit"

MERCHANT RULES:
- Extract the actual merchant/store/person name, NOT "Apple Pay" or "POS" or "Via"
- For purchases: merchant is from "From:", "Merchant:", "من:", "لدى:", "At:" field
- For transfers: use the person's name from "To:" or "From:"
- For the Saudi banking pattern "شراء عبر نقاط بيع...من:X" the merchant is X

CARD RULES:
- Extract the card fragment as shown in the SMS: "XX2838", "*5492", "*0154", "**9073", "***7186"
- Keep the prefix (XX, *, **, ***) exactly as it appears
- If no card mentioned, use null

DATE RULES:
- ALWAYS output date as YYYY-MM-DD format
- If SMS shows "25/12/25" that means 2025-12-25
- If SMS shows "01/01/26" that means 2026-01-01
- If SMS shows "21-12-2025" that means 2025-12-21
- If SMS shows "2025-12-30 16:56" extract just 2025-12-30
- If date is ambiguous or missing, use null

AMOUNT RULES:
- Must be a positive number
- If amount is 0 or missing, return skip with reason "zero_amount_auth_hold"

RESPOND WITH ONLY A SINGLE JSON OBJECT. No other text. No markdown."""


# Card fragment patterns seen in Saudi bank SMS
CARD_PATTERNS = [
    re.compile(r"\b(XX\d{3,4})\b"),                    # EmiratesNBD: XX2838
    re.compile(r"(\*{1,3}\d{3,4})"),                   # various: *5492, **9073, ***7186
    re.compile(r"\b(\d{3,4}\*)"),                      # RiyadBank: 6045*
    re.compile(r"Card:\s*(\*?\d{3,4}\*?)"),            # Fallback
]


def extract_card_fragment(sms: str) -> str | None:
    """Find the card fragment in the SMS text."""
    for pattern in CARD_PATTERNS:
        match = pattern.search(sms)
        if match:
            return match.group(1)
    return None


def extract_json(text: str) -> dict | None:
    """Robust JSON extractor with fallbacks for Gemma's output quirks."""
    text = text.strip()
    # Strip markdown fences
    text = re.sub(r"```(?:json)?\s*\n?", "", text)
    text = re.sub(r"\n?```", "", text)
    text = text.strip()
    # Fix broken arrays
    text = re.sub(r"\]\s*,\s*\[", ",", text)

    # Direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Brace depth tracking — find outermost {...}
    depth = 0
    start = None
    for i, c in enumerate(text):
        if c == "{":
            if depth == 0:
                start = i
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0 and start is not None:
                candidate = text[start:i + 1]
                candidate = re.sub(r"\]\s*,\s*\[", ",", candidate)
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    start = None
    return None


def validate_date(date_str: str) -> str | None:
    """Validate and normalize date to YYYY-MM-DD. Returns None if invalid."""
    if not date_str:
        return None
    # Already YYYY-MM-DD
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})", date_str)
    if m:
        year, month, day = m.groups()
        if 2020 <= int(year) <= 2030 and 1 <= int(month) <= 12 and 1 <= int(day) <= 31:
            return f"{year}-{month}-{day}"
    # DD/MM/YY
    m = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})", date_str)
    if m:
        d, mo, y = m.groups()
        if len(y) == 2:
            y = "20" + y
        try:
            return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"
        except ValueError:
            return None
    # DD-MM-YYYY
    m = re.match(r"^(\d{1,2})-(\d{1,2})-(\d{4})", date_str)
    if m:
        d, mo, y = m.groups()
        try:
            return f"{int(y):04d}-{int(mo):02d}-{int(d):02d}"
        except ValueError:
            return None
    return None


def compute_confidence(parsed: dict, raw_sms: str) -> int:
    """Compute confidence score 0-100 based on parse quality."""
    action = parsed.get("action")

    if action == "error":
        return 0

    if action == "skip":
        return 90

    if action == "create":
        amount = parsed.get("amount")
        if amount is None or amount == 0:
            return 25

        merchant = parsed.get("merchant")
        if not merchant or merchant.strip().lower() in ("apple pay", "via", "pos", "atheer"):
            return 50

        date = parsed.get("date", "")
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
            return 70

        tx_type = parsed.get("type")
        if tx_type not in ("withdrawal", "deposit", "transfer"):
            return 70

        return 95

    return 50


async def parse_sms(sms: str, bank: str, retry: int = 0) -> dict:
    """Parse a single SMS. Returns enriched parse result including confidence + card fragment."""
    messages = [
        {"role": "system", "content": SMS_PARSER_PROMPT},
        {"role": "user", "content": f"Bank: {bank}\nSMS: {sms}"},
    ]
    payload = {
        "model": config.LLM_MODEL,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": 300,
    }

    raw_content = ""
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(f"{config.LLM_URL}/chat/completions", json=payload)
            resp.raise_for_status()
            raw_content = resp.json()["choices"][0]["message"]["content"]

        parsed = extract_json(raw_content)

        if parsed is None:
            if retry < 1:
                logger.warning(f"JSON parse failed, retrying. Bank={bank} Raw={raw_content[:150]}")
                return await parse_sms(sms, bank, retry=retry + 1)
            logger.error(f"JSON parse failed after retry. Bank={bank} Raw={raw_content[:300]}")
            return {
                "action": "error",
                "reason": "json_parse_failed",
                "raw_llm_response": raw_content[:500],
                "confidence": 0,
            }

    except Exception as e:
        logger.exception(f"LLM call failed for bank={bank}")
        return {
            "action": "error",
            "reason": str(e)[:200],
            "confidence": 0,
        }

    # Normalize date
    if parsed.get("action") == "create":
        parsed["date"] = validate_date(parsed.get("date", ""))

        # Extract card fragment - prefer regex from raw SMS (more reliable than LLM)
        card = extract_card_fragment(sms)
        if card:
            parsed["card"] = card
        elif not parsed.get("card"):
            parsed["card"] = None

    # Compute confidence
    parsed["confidence"] = compute_confidence(parsed, sms)
    parsed["raw_llm_response"] = raw_content[:500]

    return parsed
