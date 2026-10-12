"""LLM provider. Anthropic Messages API over plain HTTP (no SDK needed)."""
import json

import httpx

from .. import config
from .prompts import SYSTEM_PROMPT


def _clean_history(history):
    """Keep the last turns, strictly alternating user/assistant, starting with user."""
    out = []
    for m in history[-6:]:
        if m.role not in ("user", "assistant") or not m.content.strip():
            continue
        if out and out[-1]["role"] == m.role:
            continue
        if not out and m.role != "user":
            continue
        out.append({"role": m.role, "content": m.content[:1500]})
    if out and out[-1]["role"] == "user":
        out.pop()
    return out


def ask_claude(message, ctx, history, intent):
    user_turn = (f"Question type: {intent}\n\nLive monitoring context (JSON):\n{json.dumps(ctx, default=str)}\n\n"
                 f"User question: {message}")
    r = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={"x-api-key": config.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01",
                 "content-type": "application/json"},
        json={"model": config.ANTHROPIC_MODEL, "max_tokens": 700, "system": SYSTEM_PROMPT,
              "messages": _clean_history(history) + [{"role": "user", "content": user_turn}]},
        timeout=40,
    )
    r.raise_for_status()
    return "".join(b.get("text", "") for b in r.json()["content"] if b.get("type") == "text").strip()
