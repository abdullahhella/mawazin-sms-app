"""FastAPI service — SMS ingestion, card mapping, and batch processing."""

import asyncio
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import config, db, processor
from .api import cards, sms

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("mawazin")

app = FastAPI(
    title="Mawazin SMS",
    description="SMS parsing and auto-entry for Firefly III",
    version="0.1.0",
)

# CORS — allow dashboard (tighten in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sms.router)
app.include_router(cards.router)

scheduler = AsyncIOScheduler()


@app.on_event("startup")
async def on_startup():
    db.init_db()
    logger.info(f"DB initialized at {config.DB_PATH}")

    # Schedule batch processing
    if config.BATCH_INTERVAL_HOURS > 0:
        scheduler.add_job(
            run_batch,
            "interval",
            hours=config.BATCH_INTERVAL_HOURS,
            id="batch_processor",
            replace_existing=True,
        )
        scheduler.start()
        logger.info(f"Scheduler started: batch every {config.BATCH_INTERVAL_HOURS}h")


@app.on_event("shutdown")
async def on_shutdown():
    if scheduler.running:
        scheduler.shutdown()


async def run_batch():
    """Wrapper for scheduled batch runs."""
    try:
        logger.info("Starting scheduled batch run")
        stats = await processor.process_batch()
        logger.info(f"Batch complete: {stats}")
    except Exception:
        logger.exception("Scheduled batch run failed")


@app.get("/")
async def root():
    return {
        "service": "mawazin-sms",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
