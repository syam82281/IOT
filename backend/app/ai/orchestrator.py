"""AI orchestration pipeline:

  question -> 1) classify intent -> 2) find the device -> 3) gather live context (tools)
           -> 4) ask the LLM (if a key exists) -> 5) fall back to the local engine -> answer
"""
from .. import config, database as db
from ..services.monitor import now
from . import local, providers, tools

FIX_WORDS = ("fix", "solve", "resolve", "repair", "prevent", "what should", "what do i do", "recover")
WHY_WORDS = ("why", "reason", "cause", "fail", "broke", "down", "problem", "issue", "wrong", "error", "how")
STATUS_WORDS = ("status", "summary", "overview", "health", "how many", "online", "all devices")


def classify(message):
    m = message.lower()
    if any(w in m for w in FIX_WORDS):
        return "fix"
    if any(w in m for w in STATUS_WORDS):
        return "status"
    if any(w in m for w in WHY_WORDS):
        return "diagnose"
    return "general"


def run(message, device_id=None, history=None):
    history = history or []
    intent = classify(message)
    did = tools.resolve_device(message, device_id)
    ctx = tools.device_context(did) if did else tools.fleet_context()

    mode, text = "built-in", None
    if config.ANTHROPIC_API_KEY:
        try:
            text = providers.ask_claude(message, ctx, history, intent)
            mode = "claude"
        except Exception as exc:
            print("LLM failed, using built-in engine:", exc)
    if not text:
        text = local.answer(intent, ctx)

    db.execute("INSERT INTO chat_logs(device_id,question,answer,mode,created_at) VALUES(?,?,?,?,?)",
               (did, message, text, mode, now()))
    return {"answer": text, "intent": intent, "device_id": did,
            "scope": ctx["scope"], "engine": mode}
