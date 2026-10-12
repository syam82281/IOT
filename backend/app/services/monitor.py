"""Ingest telemetry, detect failures, open / resolve incidents."""
import asyncio
import json
from datetime import datetime, timezone

from .. import config, database as db
from ..rules import OFFLINE_RULE, RULES, SEVERITY_RANK, label, unit

OPS = {">": lambda v, t: v > t, "<": lambda v, t: v < t}


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse(ts):
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def _best_rule(metric, value):
    hits = [r for r in RULES if r["metric"] == metric and OPS[r["op"]](value, r["threshold"])]
    return max(hits, key=lambda r: SEVERITY_RANK[r["severity"]]) if hits else None


def _detail(rule, value):
    side = "above" if rule["op"] == ">" else "below"
    u = unit(rule["metric"])
    return f"{label(rule['metric'])} is {round(value, 1):g} {u}, {side} the {rule['severity']} limit of {rule['threshold']:g} {u}.".replace(" .", ".")


def _resolve(incident_id, ts):
    db.execute("UPDATE incidents SET status='resolved', resolved_at=? WHERE id=?", (ts, incident_id))


def _refresh_status(device_id):
    open_rows = db.query("SELECT rule, severity FROM incidents WHERE device_id=? AND status='open'", (device_id,))
    if any(r["rule"] == OFFLINE_RULE["key"] for r in open_rows):
        status = "offline"
    elif any(r["severity"] == "critical" for r in open_rows):
        status = "critical"
    elif open_rows:
        status = "warning"
    else:
        status = "healthy"
    db.execute("UPDATE devices SET status=? WHERE id=?", (status, device_id))


def ingest(p):
    ts = now()
    existing = db.one("SELECT id FROM devices WHERE id=?", (p.device_id,))
    if not existing:
        db.execute("INSERT INTO devices(id,name,type,location,firmware,status,last_seen,created_at) "
                   "VALUES(?,?,?,?,?, 'healthy', ?, ?)",
                   (p.device_id, p.name or p.device_id, p.type or "sensor", p.location or "",
                    p.firmware or "", ts, ts))
    else:
        db.execute("UPDATE devices SET name=COALESCE(?,name), type=COALESCE(?,type), "
                   "location=COALESCE(?,location), firmware=COALESCE(?,firmware), last_seen=? WHERE id=?",
                   (p.name, p.type, p.location, p.firmware, ts, p.device_id))

    db.execute("INSERT INTO telemetry(device_id, ts, metrics) VALUES(?,?,?)", (p.device_id, ts, json.dumps(p.metrics)))
    db.execute("DELETE FROM telemetry WHERE device_id=? AND id NOT IN "
               "(SELECT id FROM telemetry WHERE device_id=? ORDER BY id DESC LIMIT ?)",
               (p.device_id, p.device_id, config.KEEP_READINGS_PER_DEVICE))

    # Device is talking again -> close any offline incident.
    for row in db.query("SELECT id FROM incidents WHERE device_id=? AND status='open' AND rule=?",
                        (p.device_id, OFFLINE_RULE["key"])):
        _resolve(row["id"], ts)

    _evaluate(p.device_id, p.metrics, ts)
    _refresh_status(p.device_id)


def _evaluate(device_id, metrics, ts):
    open_rows = {r["metric"]: r for r in db.query(
        "SELECT * FROM incidents WHERE device_id=? AND status='open' AND metric!='heartbeat'", (device_id,))}
    for metric, value in metrics.items():
        rule = _best_rule(metric, value)
        current = open_rows.get(metric)
        if rule is None:
            if current:
                _resolve(current["id"], ts)
            continue
        if current and current["rule"] == rule["key"]:
            db.execute("UPDATE incidents SET value=?, detail=? WHERE id=?", (value, _detail(rule, value), current["id"]))
            continue
        if current:
            _resolve(current["id"], ts)
        db.execute("INSERT INTO incidents(device_id,rule,metric,severity,title,detail,value,status,opened_at) "
                   "VALUES(?,?,?,?,?,?,?, 'open', ?)",
                   (device_id, rule["key"], metric, rule["severity"], rule["title"], _detail(rule, value), value, ts))


def sweep_offline():
    """Mark devices that stopped sending data."""
    limit = config.OFFLINE_AFTER_SECONDS
    ts = now()
    for d in db.query("SELECT id, last_seen, status FROM devices"):
        if d["status"] == "offline" or not d["last_seen"]:
            continue
        silent = (parse(ts) - parse(d["last_seen"])).total_seconds()
        if silent > limit:
            db.execute("INSERT INTO incidents(device_id,rule,metric,severity,title,detail,status,opened_at) "
                       "VALUES(?,?,?,?,?,?, 'open', ?)",
                       (d["id"], OFFLINE_RULE["key"], "heartbeat", "critical", OFFLINE_RULE["title"],
                        f"No data received for over {limit} seconds (last seen {d['last_seen']}).", ts))
            _refresh_status(d["id"])


async def sweep_loop():
    while True:
        await asyncio.sleep(5)
        try:
            await asyncio.to_thread(sweep_offline)
        except Exception as exc:  # keep the loop alive
            print("sweep error:", exc)
