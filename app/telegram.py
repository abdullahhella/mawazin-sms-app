"""Telegram notifier for batch summaries."""

import logging

import httpx

from . import config

logger = logging.getLogger("mawazin.telegram")


async def send_message(text: str) -> bool:
    """Send a message to the configured Telegram chat."""
    if not config.TELEGRAM_BOT_TOKEN or not config.TELEGRAM_CHAT_ID:
        logger.warning("Telegram not configured; skipping summary")
        return False

    url = f"https://api.telegram.org/bot{config.TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": config.TELEGRAM_CHAT_ID,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return True
        except Exception as e:
            logger.exception(f"Failed to send Telegram message: {e}")
            return False


def format_batch_summary(stats: dict, created_txns: list[dict], unmapped_cards: list[str]) -> str:
    """Build an HTML summary message for a batch run."""
    lines = [
        "<b>📊 SMS Batch Summary</b>",
        "",
        f"📥 Processed: {stats.get('processed', 0)}",
        f"✅ Created: {stats.get('created', 0)}",
        f"⏭️ Skipped: {stats.get('skipped', 0)}",
        f"♻️ Duplicates: {stats.get('duplicates', 0)}",
    ]
    if stats.get("errored"):
        lines.append(f"❌ Errors: {stats['errored']}")

    if created_txns:
        lines.append("")
        lines.append("<b>New transactions:</b>")
        for t in created_txns[:15]:
            amt = t.get("amount", 0)
            cur = t.get("currency", "SAR")
            merch = (t.get("merchant") or "?")[:30]
            acc = (t.get("account") or "?")[:20]
            lines.append(f"• {cur} {amt:,.2f} — {merch} ({acc})")
        if len(created_txns) > 15:
            lines.append(f"... and {len(created_txns) - 15} more")

    if unmapped_cards:
        lines.append("")
        lines.append("<b>⚠️ Unmapped cards:</b>")
        for c in unmapped_cards[:5]:
            lines.append(f"• {c}")
        lines.append("Open the dashboard to assign them to accounts.")

    return "\n".join(lines)
