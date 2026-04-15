"""Configuration for Mawazin Telegram Bot."""

import os

# --- Telegram ---
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
# Restrict bot to specific Telegram user IDs (comma-separated). Empty = allow all.
ALLOWED_USERS = [int(x) for x in os.environ.get("ALLOWED_USERS", "").split(",") if x.strip()]

# --- Whisper (Speech-to-Text) ---
WHISPER_URL = os.environ.get("WHISPER_URL", "http://localhost:9000/v1")
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "Systran/faster-whisper-small")

# --- Gemma / LLM (Intent Parsing) ---
LLM_URL = os.environ.get("LLM_URL", "http://localhost:11434/v1")
LLM_MODEL = os.environ.get("LLM_MODEL", "gemma3:4b")

# --- Firefly III ---
FIREFLY_URL = os.environ.get("FIREFLY_URL", "http://localhost:8080")
FIREFLY_TOKEN = os.environ.get("FIREFLY_TOKEN", "")

# --- Matching ---
MATCH_WINDOW_DAYS = int(os.environ.get("MATCH_WINDOW_DAYS", "3"))
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.8"))
