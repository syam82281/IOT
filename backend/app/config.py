import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DB_DIR = Path(os.getenv("DB_DIR", ROOT / "database"))
DB_PATH = DB_DIR / "iot.db"
SCHEMA_PATH = DB_DIR / "schema.sql"

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "").strip()
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5")

OFFLINE_AFTER_SECONDS = int(os.getenv("OFFLINE_AFTER_SECONDS", "20"))
KEEP_READINGS_PER_DEVICE = 500
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")]
