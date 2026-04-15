# Mawazin SMS

SMS parser and auto-entry service for [Firefly III](https://firefly-iii.org).

Receives bank SMS via HTTP webhook, parses them with a local LLM (Gemma), and auto-creates transactions in Firefly III. Sends a Telegram summary after each batch run.

## Features

- **Parses multi-bank SMS** — EmiratesNBD, D360, STC Bank, Riyad, BSF, SNB, barq app, and more
- **Arabic + English** — no bank-specific regex to maintain
- **Card-to-account mapping** — configurable via API (future dashboard)
- **Duplicate detection** — avoids re-creating transactions already in Firefly
- **Scheduled batch processing** — every N hours (default 3)
- **Telegram summaries** — review each batch in chat
- **iOS-friendly** — designed for iOS Shortcut ingestion

## Architecture

```
iPhone Messages ──► iOS Shortcut ──HTTP POST──► /sms/ingest
                                                     │
                                              SQLite queue
                                                     │
                                      (every 3hr) ──►│
                                                     ▼
                                              LLM parser (Gemma)
                                                     │
                                              Firefly III API
                                                     │
                                              Telegram summary
```

## Install on TrueNAS SCALE (Custom App)

### 1. Create the TrueNAS app

In TrueNAS, go to **Apps → Discover Apps → Custom App** and fill in:

- **Application Name**: `mawazin-sms`
- **Container Image**: `ghcr.io/abdullahhella/mawazin-sms:latest` (or build locally)
- **Port Forwarding**: container `8000` → host `8000` (or any free port)

### 2. Or use docker-compose on TrueNAS

```bash
cd /mnt/YOUR_POOL/apps
git clone https://github.com/abdullahhella/mawazin-sms.git
cd mawazin-sms
cp .env.example .env
# Edit .env with your tokens
docker compose up -d
```

### 3. Environment variables

| Variable | Required | Description |
|---|---|---|
| `FIREFLY_URL` | yes | Firefly III base URL |
| `FIREFLY_TOKEN` | yes | Firefly Personal Access Token |
| `LLM_URL` | yes | OpenAI-compatible endpoint (Ollama) |
| `LLM_MODEL` | yes | Model name (`gemma3:4b`) |
| `TELEGRAM_BOT_TOKEN` | no | Bot token for summaries |
| `TELEGRAM_CHAT_ID` | no | Chat to send summaries to |
| `INGEST_API_KEY` | yes | Secret — required on every ingest request |
| `BATCH_INTERVAL_HOURS` | no | Auto-process every N hours (default `3`, set `0` to disable) |
| `DEDUP_WINDOW_DAYS` | no | Look back N days for duplicates (default `7`) |
| `FALLBACK_ACCOUNT_NAME` | no | Firefly account name for SMS with unmapped cards |
| `DB_PATH` | no | SQLite path (default `/data/mawazin.db`) |

### 4. Persistent volume

The SQLite DB lives at `/data/mawazin.db` inside the container. In TrueNAS, mount a dataset to `/data` so the DB survives container restarts and upgrades.

## API Reference

Full docs at `http://your-host:8000/docs` (Swagger UI).

### `POST /sms/ingest` — accept a batch of SMS

```bash
curl -X POST http://your-host:8000/sms/ingest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret" \
  -d '{
    "messages": [
      {
        "bank": "EmiratesNBD",
        "message": "POS Purchase (Apple Pay) Card: Visa card XX2838 Amount: SAR 54.92 Merchant: ALNAHDI PHARMACY On: 2026-04-15 10:30:00",
        "received_at": "2026-04-15T10:30:00Z"
      }
    ]
  }'
```

Response:
```json
{ "received": 1, "queued": 1, "duplicates": 0 }
```

### `POST /sms/process` — trigger batch now (instead of waiting 3hr)

```bash
curl -X POST http://your-host:8000/sms/process
```

### `GET /sms/pending` — list unprocessed SMS

### `GET /sms/runs` — recent batch runs with stats

### `GET /cards` — list known cards

```bash
curl http://your-host:8000/cards?unmapped_only=true
```

### `PUT /cards/{fragment}` — assign a card to a Firefly account

```bash
curl -X PUT http://your-host:8000/cards/XX2838 \
  -H "Content-Type: application/json" \
  -d '{"firefly_account_id": "9", "firefly_account_name": "Emirates Credit Card"}'
```

### `GET /cards/accounts` — list Firefly asset accounts (for the dashboard dropdown)

## iOS Shortcut (sender)

Create a Shortcut that:
1. Finds Messages from your bank sender list (last 3 hours)
2. For each message, builds `{bank, message, received_at}`
3. POSTs the batch to `/sms/ingest` with your `X-API-Key`

Trigger: **Personal Automation → When I connect to [VPN]** → Run Shortcut.

(A sample `.shortcut` file will be added later.)

## Developing locally

```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Set env vars (or use a .env loader)
export FIREFLY_URL=... FIREFLY_TOKEN=... LLM_URL=... INGEST_API_KEY=dev

uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` for the Swagger UI.

## License

MIT
