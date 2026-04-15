"""SMS ingestion and processing API routes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from .. import config, db, processor

router = APIRouter(prefix="/sms", tags=["sms"])


class SmsItem(BaseModel):
    bank: str = Field(..., min_length=1, max_length=100)
    message: str = Field(..., min_length=1)
    received_at: Optional[str] = None  # ISO format; defaults to now


class IngestRequest(BaseModel):
    messages: list[SmsItem]


class IngestResponse(BaseModel):
    received: int
    queued: int
    duplicates: int


def _require_api_key(x_api_key: str | None):
    if config.INGEST_API_KEY and x_api_key != config.INGEST_API_KEY:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key")


@router.post("/ingest", response_model=IngestResponse)
async def ingest_sms(
    req: IngestRequest,
    x_api_key: str = Header(None, alias="X-API-Key"),
):
    """Accept a batch of SMS messages from the iOS Shortcut."""
    _require_api_key(x_api_key)

    received = len(req.messages)
    queued = 0
    duplicates = 0
    now_iso = datetime.utcnow().isoformat(timespec="seconds") + "Z"

    for item in req.messages:
        received_at = item.received_at or now_iso
        sms_id = db.enqueue_sms(item.bank, item.message, received_at)
        if sms_id:
            queued += 1
        else:
            duplicates += 1

    return IngestResponse(received=received, queued=queued, duplicates=duplicates)


@router.get("/pending")
async def list_pending(limit: int = 50):
    """List pending SMS waiting to be processed."""
    return db.get_pending_sms(limit=limit)


@router.post("/process")
async def trigger_process(limit: int = 100):
    """Manually trigger a batch processing run."""
    stats = await processor.process_batch(limit=limit)
    return stats


@router.get("/runs")
async def list_runs(limit: int = 20):
    """List recent processing runs."""
    return db.recent_runs(limit=limit)
