-- Verdant IoT database schema (SQLite)
CREATE TABLE IF NOT EXISTS devices (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'sensor',
  location    TEXT DEFAULT '',
  firmware    TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'healthy',   -- healthy | warning | critical | offline
  last_seen   TEXT,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS telemetry (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id  TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  ts         TEXT NOT NULL,
  metrics    TEXT NOT NULL                        -- JSON: {"temperature": 41.2, ...}
);
CREATE INDEX IF NOT EXISTS idx_telemetry_device ON telemetry(device_id, id DESC);

CREATE TABLE IF NOT EXISTS incidents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  rule        TEXT NOT NULL,
  metric      TEXT NOT NULL,
  severity    TEXT NOT NULL,                      -- warning | critical
  title       TEXT NOT NULL,
  detail      TEXT NOT NULL,
  value       REAL,
  status      TEXT NOT NULL DEFAULT 'open',       -- open | resolved
  opened_at   TEXT NOT NULL,
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status, opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_device ON incidents(device_id, status);

CREATE TABLE IF NOT EXISTS chat_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id  TEXT,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  mode       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
