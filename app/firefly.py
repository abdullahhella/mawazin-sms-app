"""Firefly III client — account lookup and transaction creation."""

import json
import logging
from datetime import datetime, timedelta

import httpx

from . import config

logger = logging.getLogger("mawazin.firefly")


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {config.FIREFLY_TOKEN}",
        "Content-Type": "application/json",
        "Accept": "application/vnd.api+json",
    }


async def list_asset_accounts() -> list[dict]:
    """Fetch all asset accounts from Firefly."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{config.FIREFLY_URL}/api/v1/accounts?type=asset&limit=50",
            headers=_headers(),
        )
        resp.raise_for_status()
        return [
            {
                "id": a["id"],
                "name": a["attributes"]["name"],
                "type": a["attributes"].get("type", ""),
                "role": a["attributes"].get("account_role", ""),
                "currency_code": a["attributes"].get("currency_code", "SAR"),
            }
            for a in resp.json().get("data", [])
        ]


def _build_currency_fields(currency: str, amount) -> dict:
    """Build currency fields. Non-SAR uses foreign_currency on SAR accounts."""
    currency = (currency or "SAR").upper()
    fields = {"currency_code": "SAR"}
    if currency != "SAR":
        fields["foreign_currency_code"] = currency
        fields["foreign_amount"] = str(amount)
    return fields


async def create_transaction(
    txn_type: str,
    amount: float,
    currency: str,
    source_name: str,
    destination_name: str,
    date: str,
    description: str,
    notes: str = "",
    tags: list[str] | None = None,
    category: str | None = None,
) -> dict | None:
    """Post a transaction to Firefly. Returns {id, data} or None on failure."""
    txn_data = {
        "type": txn_type,
        "date": date,
        "amount": str(amount),
        "description": description,
        "source_name": source_name,
        "destination_name": destination_name,
        "notes": notes,
        "tags": tags or ["source:sms"],
        **_build_currency_fields(currency, amount),
    }
    if category:
        txn_data["category_name"] = category

    payload = {"transactions": [txn_data]}

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            f"{config.FIREFLY_URL}/api/v1/transactions",
            headers=_headers(),
            json=payload,
        )
        if resp.status_code in (200, 201):
            data = resp.json().get("data", {})
            logger.info(f"Firefly created txn {data.get('id')}: {description} {currency} {amount}")
            return data
        logger.error(f"Firefly create failed [{resp.status_code}]: {resp.text[:500]}")
        return None


async def find_duplicate(amount: float, merchant: str, date: str, window_days: int = 7) -> str | None:
    """Check if a similar transaction already exists within the time window. Returns txn_id if found."""
    try:
        date_from = (datetime.fromisoformat(date) - timedelta(days=window_days)).strftime("%Y-%m-%d")
    except ValueError:
        date_from = date

    query_parts = [f"amount:{amount}", f"date_after:{date_from}"]
    if merchant:
        # Use first word of merchant for fuzzy match
        first_word = merchant.split()[0] if merchant.split() else merchant
        if len(first_word) >= 3:
            query_parts.append(f"description_contains:{first_word}")
    query = " ".join(query_parts)

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(
                f"{config.FIREFLY_URL}/api/v1/search/transactions",
                headers=_headers(),
                params={"query": query, "limit": 5},
            )
            resp.raise_for_status()
            data = resp.json().get("data", [])
            if data:
                return data[0].get("id")
        except Exception as e:
            logger.warning(f"Duplicate check failed: {e}")
    return None
