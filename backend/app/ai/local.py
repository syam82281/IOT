"""Built-in diagnosis engine. Answers from the rule knowledge base when no LLM key is set (or the LLM fails)."""


def _num(v, unit=""):
    return f"{round(v, 1):g} {unit}".strip()


def _how_it_developed(issue, trends):
    t = trends.get(issue["metric"])
    if not t:
        return None
    u = issue["unit"]
    if t["pattern"] == "stable":
        return f"It has stayed near {_num(t['last'], u)} for the last {t['count']} readings, so this looks like a steady condition."
    way = "rose" if t["last"] > t["first"] else "fell"
    kind = ("It changed suddenly, which points to an event (power dip, load spike, reset or a physical change)."
            if t["pattern"] == "sudden jump"
            else "It moved step by step, which points to a building problem (heat, drain, leak or drift).")
    return (f"Over the last {t['count']} readings it {way} from {_num(t['first'], u)} to {_num(t['last'], u)} "
            f"(range {_num(t['min'], u)} to {_num(t['max'], u)}). {kind}")


def _device_diagnosis(ctx, with_fixes=True, with_why=True):
    d, issues, trends = ctx["device"], ctx["open_issues"], ctx["trends"]
    if not issues:
        text = f"**{d['name']}** looks healthy right now. All readings are inside their safe limits."
        if ctx["recently_resolved"]:
            r = ctx["recently_resolved"][0]
            text += f"\n\nIt recovered recently from **{r['title'].lower()}**, so keep an eye on it."
        return text
    out = [f"**{d['name']}** is **{d['status']}** with {len(issues)} open issue{'s' if len(issues) > 1 else ''}."]
    for i in issues:
        out.append(f"\n**{i['title']}** ({i['severity']})")
        out.append(f"- What happened: {i['detail']}")
        if with_why:
            how = _how_it_developed(i, trends)
            if how:
                out.append(f"- How it developed: {how}")
            out.append("- Likely reasons:")
            out += [f"  - {c}" for c in i["likely_causes"][:3]]
        if with_fixes:
            out.append("- What to do:")
            out += [f"  - {f}" for f in i["recommended_fixes"][:3]]
    return "\n".join(out)


def _fleet_status(ctx):
    c = ctx["status_counts"]
    parts = [f"{n} {s}" for s, n in sorted(c.items())]
    text = f"You have **{ctx['device_count']} devices**: " + ", ".join(parts) + "."
    if ctx["open_issues"]:
        text += "\n\nOpen issues:"
        for i in ctx["open_issues"][:8]:
            text += f"\n- **{i['device']}**: {i['title']} ({i['severity']})"
        text += "\n\nSelect a device or name it and I will explain why it failed and how to fix it."
    else:
        text += " Everything is calm."
    return text


def answer(intent, ctx):
    if ctx["scope"] == "device":
        if intent == "fix":
            return _device_diagnosis(ctx, with_fixes=True, with_why=False)
        if intent == "status":
            return _device_diagnosis(ctx, with_fixes=False, with_why=False)
        return _device_diagnosis(ctx)
    if intent in ("diagnose", "fix") and ctx["open_issues"]:
        return _fleet_status(ctx)
    if intent == "general":
        return ("I can explain why a device is failing, how the failure developed, and how to fix it.\n"
                "- Ask **why is Greenhouse Node failing?**\n- Ask **how can I fix the motor controller?**\n"
                "- Ask **give me a health summary**\n\n" + _fleet_status(ctx))
    return _fleet_status(ctx)
