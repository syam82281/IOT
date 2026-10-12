"""Read helpers shared by the API routes and the AI tools."""
from .. import database as db

PRIMARY_ORDER = ["gas_ppm", "soil_moisture", "vibration", "temperature", "cpu", "battery", "rssi"]


def all_devices():
    return db.query("SELECT * FROM devices ORDER BY name")


def get_device(device_id):
    return db.one("SELECT * FROM devices WHERE id = ?", (device_id,))


def recent_telemetry(device_id, limit=60):
    rows = db.query("SELECT ts, metrics FROM telemetry WHERE device_id = ? ORDER BY id DESC LIMIT ?",
                    (device_id, limit))
    rows.reverse()
    return [{"ts": r["ts"], "metrics": db.loads(r["metrics"])} for r in rows]


def open_incidents(device_id=None):
    if device_id:
        return db.query("SELECT * FROM incidents WHERE status='open' AND device_id=? ORDER BY id DESC", (device_id,))
    return db.query("SELECT * FROM incidents WHERE status='open' ORDER BY id DESC")


def recent_incidents(device_id=None, limit=15):
    if device_id:
        return db.query("SELECT i.*, d.name AS device_name FROM incidents i JOIN devices d ON d.id=i.device_id "
                        "WHERE i.device_id=? ORDER BY i.id DESC LIMIT ?", (device_id, limit))
    return db.query("SELECT i.*, d.name AS device_name FROM incidents i JOIN devices d ON d.id=i.device_id "
                    "ORDER BY (i.status='open') DESC, i.id DESC LIMIT ?", (limit,))


def device_view(d):
    """Device row + latest metrics + small trend for the dashboard list."""
    readings = recent_telemetry(d["id"], 24)
    latest = readings[-1]["metrics"] if readings else {}
    primary = next((m for m in PRIMARY_ORDER if m in latest), next(iter(latest), None))
    trend = [r["metrics"].get(primary) for r in readings if primary in r["metrics"]]
    open_inc = open_incidents(d["id"])
    issues = {}
    for i in open_inc:
        if issues.get(i["metric"]) != "critical":
            issues[i["metric"]] = i["severity"]
    if primary not in latest and issues:
        primary = next((m for m in issues if m in latest), primary)
    return {**d, "latest": latest, "primary_metric": primary, "trend": trend,
            "issues": issues, "open_incidents": len(open_inc)}
