"""Batch processor — reads pending SMS, parses, creates Firefly transactions, sends summary."""

import logging
from datetime import datetime

from . import config, db, firefly, parser, telegram

logger = logging.getLogger("mawazin.processor")


async def process_batch(limit: int = 100) -> dict:
    """Process all pending SMS. Returns stats dict."""
    run_id = db.start_run()
    stats = {
        "processed": 0,
        "created": 0,
        "skipped": 0,
        "errored": 0,
        "duplicates": 0,
        "summary_sent": False,
    }
    created_txns = []
    unmapped_cards = set()

    try:
        pending = db.get_pending_sms(limit=limit)
        logger.info(f"Processing batch of {len(pending)} SMS")

        # Pre-fetch account list once
        accounts = await firefly.list_asset_accounts()
        fallback_account = _pick_fallback_account(accounts)

        for sms_row in pending:
            stats["processed"] += 1
            sms_id = sms_row["id"]
            bank = sms_row["bank"]
            message = sms_row["message"]

            try:
                parsed = await parser.parse_sms(message, bank)
                action = parsed.get("action")

                # Persist card seen (even before mapping exists)
                card = parsed.get("card")
                if card:
                    db.upsert_card(card, bank)

                if action == "skip":
                    db.mark_sms_skipped(sms_id, parsed.get("reason", "skipped"))
                    db.insert_parsed({
                        "sms_id": sms_id,
                        "action": "skip",
                        "confidence": parsed.get("confidence"),
                        "notes": parsed.get("reason"),
                        "raw_llm_response": parsed.get("raw_llm_response"),
                    })
                    stats["skipped"] += 1
                    continue

                if action == "error":
                    db.mark_sms_processed(sms_id, error=parsed.get("reason", "unknown"))
                    db.insert_parsed({
                        "sms_id": sms_id,
                        "action": "error",
                        "confidence": 0,
                        "notes": parsed.get("reason"),
                        "raw_llm_response": parsed.get("raw_llm_response"),
                    })
                    stats["errored"] += 1
                    continue

                # action == "create"
                amount = parsed.get("amount")
                if amount is None or amount == 0:
                    db.mark_sms_skipped(sms_id, "zero_amount")
                    stats["skipped"] += 1
                    continue

                # Resolve source account via card mapping
                source_account = None
                if card:
                    mapping = db.get_card_mapping(card)
                    if mapping and mapping.get("firefly_account_id"):
                        source_account = mapping["firefly_account_name"]

                if not source_account:
                    source_account = fallback_account
                    if card:
                        unmapped_cards.add(card)

                merchant = parsed.get("merchant") or "Unknown"
                txn_date = parsed.get("date") or datetime.now().strftime("%Y-%m-%d")

                # Duplicate check
                duplicate_id = await firefly.find_duplicate(
                    amount=float(amount),
                    merchant=merchant,
                    date=txn_date,
                    window_days=config.DEDUP_WINDOW_DAYS,
                )
                if duplicate_id:
                    logger.info(f"Skipping duplicate of Firefly txn {duplicate_id}")
                    db.mark_sms_processed(sms_id, firefly_txn_id=f"dup:{duplicate_id}")
                    db.insert_parsed({
                        "sms_id": sms_id,
                        "action": "duplicate",
                        "type": parsed.get("type"),
                        "amount": amount,
                        "currency": parsed.get("currency", "SAR"),
                        "merchant": merchant,
                        "card_fragment": card,
                        "txn_date": txn_date,
                        "confidence": parsed.get("confidence"),
                        "firefly_txn_id": duplicate_id,
                        "notes": "duplicate match",
                        "raw_llm_response": parsed.get("raw_llm_response"),
                    })
                    stats["duplicates"] += 1
                    continue

                # Create in Firefly
                tx_type = parsed.get("type", "withdrawal")
                notes = f"Raw SMS: {message}"
                if parsed.get("notes"):
                    notes = f"{parsed['notes']}\n---\n{notes}"

                fresult = await firefly.create_transaction(
                    txn_type=tx_type,
                    amount=float(amount),
                    currency=parsed.get("currency", "SAR"),
                    source_name=source_account,
                    destination_name=merchant,
                    date=txn_date,
                    description=merchant,
                    notes=notes,
                    tags=["source:sms", f"bank:{bank}"],
                )

                if fresult:
                    firefly_txn_id = fresult.get("id")
                    db.mark_sms_processed(sms_id, firefly_txn_id=firefly_txn_id)
                    db.insert_parsed({
                        "sms_id": sms_id,
                        "action": "create",
                        "type": tx_type,
                        "amount": amount,
                        "currency": parsed.get("currency", "SAR"),
                        "merchant": merchant,
                        "card_fragment": card,
                        "txn_date": txn_date,
                        "confidence": parsed.get("confidence"),
                        "firefly_account_name": source_account,
                        "firefly_txn_id": firefly_txn_id,
                        "notes": parsed.get("notes"),
                        "raw_llm_response": parsed.get("raw_llm_response"),
                    })
                    stats["created"] += 1
                    created_txns.append({
                        "amount": amount,
                        "currency": parsed.get("currency", "SAR"),
                        "merchant": merchant,
                        "account": source_account,
                        "firefly_id": firefly_txn_id,
                    })
                else:
                    db.mark_sms_processed(sms_id, error="firefly_create_failed")
                    stats["errored"] += 1

            except Exception as e:
                logger.exception(f"Error processing SMS {sms_id}")
                db.mark_sms_processed(sms_id, error=str(e)[:200])
                stats["errored"] += 1

        # Send Telegram summary
        if stats["processed"] > 0:
            summary = telegram.format_batch_summary(stats, created_txns, sorted(unmapped_cards))
            sent = await telegram.send_message(summary)
            stats["summary_sent"] = sent

        db.finish_run(run_id, stats)
        return stats

    except Exception as e:
        logger.exception("Batch processing failed")
        db.finish_run(run_id, stats, error=str(e)[:500])
        raise


def _pick_fallback_account(accounts: list[dict]) -> str:
    """Pick a fallback account: use configured name, else first asset account."""
    if config.FALLBACK_ACCOUNT_NAME:
        for a in accounts:
            if a["name"] == config.FALLBACK_ACCOUNT_NAME:
                return a["name"]
    if accounts:
        return accounts[0]["name"]
    return "Unknown Account"
