from fastapi import APIRouter, HTTPException

from . import database as db
from .ai import orchestrator
from .schemas import ChatIn, TelemetryIn
from .services import monitor, queries

router = APIRouter(prefix="/api")


@router.get("/health")
def health():
    return {"ok": True, "time": monitor.now()}


@router.post("/telemetry", status_code=202)
def telemetry(payload: TelemetryIn):
    monitor.ingest(payload)
    return {"accepted": True}


@router.get("/summary")
def summary():
    counts = {r["status"]: r["c"] for r in db.query("SELECT status, COUNT(*) c FROM devices GROUP BY status")}
    total = sum(counts.values())
    return {"total": total, "healthy": counts.get("healthy", 0), "warning": counts.get("warning", 0),
            "critical": counts.get("critical", 0), "offline": counts.get("offline", 0),
            "open_incidents": len(queries.open_incidents()), "updated": monitor.now()}


@router.get("/devices")
def devices():
    return [queries.device_view(d) for d in queries.all_devices()]


@router.get("/devices/{device_id}")
def device(device_id: str):
    d = queries.get_device(device_id)
    if not d:
        raise HTTPException(404, "Device not found")
    return {**queries.device_view(d), "incidents": queries.recent_incidents(device_id, 10)}


@router.get("/devices/{device_id}/telemetry")
def device_telemetry(device_id: str, limit: int = 60):
    if not queries.get_device(device_id):
        raise HTTPException(404, "Device not found")
    return queries.recent_telemetry(device_id, min(max(limit, 5), 300))


@router.get("/incidents")
def incidents(limit: int = 15):
    return queries.recent_incidents(limit=min(max(limit, 1), 100))


@router.post("/chat")
def chat(body: ChatIn):
    return orchestrator.run(body.message, body.device_id, body.history)
