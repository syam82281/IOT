"""Context tools. The orchestrator calls these to gather facts before any model is asked to explain."""
from ..rules import RULES_BY_KEY, label, unit
from ..services import queries


def resolve_device(message, device_id=None):
    if device_id and queries.get_device(device_id):
        return device_id
    low = message.lower()
    for d in queries.all_devices():
        if d["id"].lower() in low or d["name"].lower() in low:
            return d["id"]
    return None


def _trend(series):
    vals = [v for v in series if v is not None]
    if len(vals) < 3:
        return None
    lo, hi = min(vals), max(vals)
    rng = hi - lo
    steps = [abs(b - a) for a, b in zip(vals, vals[1:])]
    if rng < 1e-9 or rng < abs(hi) * 0.02:
        pattern = "stable"
    elif max(steps) > 0.6 * rng:
        pattern = "sudden jump"
    else:
        pattern = "gradual change"
    return {"count": len(vals), "first": round(vals[0], 2), "last": round(vals[-1], 2),
            "min": round(lo, 2), "max": round(hi, 2), "pattern": pattern}


def _issue(inc):
    rule = RULES_BY_KEY.get(inc["rule"], {})
    return {"title": inc["title"], "severity": inc["severity"], "metric": inc["metric"],
            "metric_label": label(inc["metric"]), "unit": unit(inc["metric"]), "value": inc["value"],
            "detail": inc["detail"], "opened_at": inc["opened_at"], "status": inc["status"],
            "likely_causes": rule.get("causes", []), "recommended_fixes": rule.get("fixes", [])}


def device_context(device_id):
    d = queries.get_device(device_id)
    readings = queries.recent_telemetry(device_id, 30)
    latest = readings[-1]["metrics"] if readings else {}
    trends = {m: _trend([r["metrics"].get(m) for r in readings]) for m in latest}
    open_inc = queries.open_incidents(device_id)
    recent = [i for i in queries.recent_incidents(device_id, 6) if i["status"] == "resolved"][:3]
    return {"scope": "device",
            "device": {k: d[k] for k in ("id", "name", "type", "location", "firmware", "status", "last_seen")},
            "latest_readings": latest, "trends": {k: v for k, v in trends.items() if v},
            "open_issues": [_issue(i) for i in open_inc],
            "recently_resolved": [_issue(i) for i in recent]}


def fleet_context():
    devices = queries.all_devices()
    open_inc = queries.open_incidents()
    names = {d["id"]: d["name"] for d in devices}
    counts = {}
    for d in devices:
        counts[d["status"]] = counts.get(d["status"], 0) + 1
    return {"scope": "fleet", "device_count": len(devices), "status_counts": counts,
            "devices": [{"id": d["id"], "name": d["name"], "type": d["type"], "status": d["status"]} for d in devices],
            "open_issues": [{"device": names.get(i["device_id"]), "device_id": i["device_id"], **_issue(i)} for i in open_inc]}
