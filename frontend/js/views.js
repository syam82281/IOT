import { esc, fmt, label, timeAgo, STATUS_COLOR, STATUS_WORD } from "./utils.js";
import { sparkline, lineChart, healthRing } from "./charts.js";

const METRIC_ORDER = ["gas_ppm", "soil_moisture", "vibration", "temperature", "cpu", "memory", "current", "humidity", "battery", "rssi", "voltage"];
const sortMetrics = (keys, issues = {}) =>
  [...keys].sort((a, b) => (issues[b] ? 1 : 0) - (issues[a] ? 1 : 0) || METRIC_ORDER.indexOf(a) - METRIC_ORDER.indexOf(b));
const EMPTY_HINT = `No IoT components yet. Run <code>python simulator/simulator.py</code> to see some.`;

/* ---------- overview hero ---------- */
export function hero(s) {
  if (!s) return `<div class="hero-copy"><h1>Connecting to your IoT components…</h1></div>`;
  const bad = s.warning + s.critical + s.offline;
  let title, sub;
  if (!s.total) { title = "No IoT components yet"; sub = "Start the simulator or POST a reading to /api/telemetry and your first component appears here."; }
  else if (!bad) { title = `All ${s.total} IoT components are calm.`; sub = "Nothing needs your attention right now."; }
  else {
    title = `${s.total - bad} of ${s.total} IoT components are calm.`;
    sub = `${bad} ${bad === 1 ? "needs" : "need"} attention: ${[
      s.critical && `${s.critical} failing`, s.offline && `${s.offline} offline`, s.warning && `${s.warning} warning`].filter(Boolean).join(", ")}.`;
  }
  const item = (k, n, w) => `<li><span class="dot" style="background:${STATUS_COLOR[k]}"></span><strong>${n}</strong><span>${w}</span></li>`;
  return `<div class="ring-wrap"><div class="glow ${bad ? "glow-alert" : ""}"></div>${healthRing(s)}</div>
    <div class="hero-copy"><h1>${esc(title)}</h1><p>${esc(sub)}</p>
      <ul class="strip">${item("healthy", s.healthy, "calm")}${item("warning", s.warning, "warning")}${item("critical", s.critical, "failing")}${item("offline", s.offline, "offline")}</ul></div>`;
}

export function liveBadge(online, lastOk) {
  return online
    ? `<span class="dot ok"></span><span>Live<br><small>updated ${timeAgo(new Date(lastOk).toISOString())}</small></span>`
    : `<span class="dot" style="background:#cf4b4b"></span><span>Backend offline<br><small>retrying…</small></span>`;
}

export function statusText(counts) {
  const words = { healthy: "calm", warning: "warning", critical: "failing", offline: "offline" };
  return Object.keys(words).filter((k) => counts[k]).map((k) => `${counts[k]} ${words[k]}`).join(" · ");
}

/* ---------- type boxes ---------- */
export function typeBoxes(groups) {
  if (!groups.length) return `<div class="empty">${EMPTY_HINT}</div>`;
  return groups.map(({ cat, devices, counts }) => {
    const pills = ["healthy", "warning", "critical", "offline"].filter((k) => counts[k]).map((k) =>
      `<span class="pill-count"><span class="dot" style="background:${STATUS_COLOR[k]}"></span>${counts[k]} ${{ healthy: "calm", warning: "warning", critical: "failing", offline: "offline" }[k]}</span>`).join("");
    const names = devices.slice(0, 3).map((d) => esc(d.name)).join(", ") + (devices.length > 3 ? ` +${devices.length - 3} more` : "");
    const tone = counts.critical || counts.offline ? "has-fail" : counts.warning ? "has-warn" : "";
    return `<a class="type-box ${tone}" href="#/components/${cat.id}">
      <span class="type-icon">${cat.icon}</span>
      <span class="type-body"><strong>${esc(cat.label)}</strong><small>${esc(cat.blurb)}</small></span>
      <span class="type-count"><b>${devices.length}</b> ${devices.length === 1 ? "component" : "components"}</span>
      <span class="type-status">${pills}</span>
      <span class="type-names">${names}</span>
    </a>`;
  }).join("");
}

/* ---------- component boxes (inside one type) ---------- */
export function compCards(devices) {
  return devices.map((d) => {
    const keys = sortMetrics(Object.keys(d.latest || {}), d.issues).slice(0, 3);
    const chips = keys.map((k) => `<span class="mchip ${d.issues?.[k] ? "bad-" + d.issues[k] : ""}"><em>${esc(label(k))}</em> ${esc(fmt(k, d.latest[k]))}</span>`).join("");
    return `<a class="comp-card s-${d.status}" href="#/component/${encodeURIComponent(d.id)}">
      <span class="comp-top"><span class="who"><strong>${esc(d.name)}</strong><small>${esc(d.type)} · ${esc(d.location || "no location")}</small></span>
        <span class="badge b-${d.status}">${STATUS_WORD[d.status]}</span></span>
      <span class="chips-row">${chips}</span>
      ${sparkline(d.trend, d.status)}
      <small class="muted">Last reading ${timeAgo(d.last_seen)}</small>
    </a>`;
  }).join("");
}

/* ---------- failures ---------- */
export function incidentList(list, emptyText = "No failures recorded. Everything has been calm.") {
  if (!list.length) return `<div class="empty">${esc(emptyText)}</div>`;
  return list.map((i) => `<article class="inc sev-${i.severity} ${i.status}">
      <div class="inc-main">
        <h3>${esc(i.title)} <span class="badge b-${i.status === "open" ? (i.severity === "critical" ? "critical" : "warning") : "healthy"}">${i.status === "open" ? i.severity : "resolved"}</span></h3>
        <p class="muted"><a class="inline" href="#/component/${encodeURIComponent(i.device_id)}">${esc(i.device_name)}</a> · ${esc(i.detail)}</p>
        <small class="muted">${i.status === "open" ? "Started" : "Resolved"} ${timeAgo(i.status === "open" ? i.opened_at : i.resolved_at)}</small>
      </div>
      ${i.status === "open" ? `<button class="ghost" data-ask-device="${esc(i.device_id)}" data-ask-text="Why did ${esc(i.device_name)} fail and how can I fix it?">Ask AI</button>` : ""}
    </article>`).join("");
}

export function filterBar(filter, openCount, total) {
  const b = (id, text) => `<button type="button" class="chip ${filter === id ? "on" : ""}" data-filter="${id}">${text}</button>`;
  return b("open", `Open (${openCount})`) + b("all", `All (${total})`);
}

/* ---------- one component ---------- */
export function crumbs(items) {
  return `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([text, href]) =>
    href ? `<a href="${href}">${esc(text)}</a>` : `<span aria-current="page">${esc(text)}</span>`).join("<span>/</span>")}</nav>`;
}

export function componentPage(d, telemetry, metric, incidents, cat) {
  if (!d) return `${crumbs([["IoT Components", "#/components"], ["Not found"]])}
    <div class="empty">That component isn't here (yet). <a class="inline" href="#/components">Back to IoT Components</a></div>`;
  const keys = sortMetrics(Object.keys(d.latest || {}), d.issues);
  const active = keys.includes(metric) ? metric : (d.primary_metric || keys[0]);
  const tabs = keys.map((k) => `<button class="tab ${k === active ? "on" : ""} ${d.issues?.[k] ? "bad-" + d.issues[k] : ""}" data-metric="${esc(k)}">
      <small>${esc(label(k))}</small><strong>${esc(fmt(k, d.latest[k]))}</strong></button>`).join("");
  const points = telemetry.map((r) => ({ t: r.ts, v: r.metrics[active] }));
  const mine = incidents.filter((i) => i.device_id === d.id);
  return `${crumbs([["IoT Components", "#/components"], [cat.label, `#/components/${cat.id}`], [d.name]])}
    <header class="page-head"><h1>${esc(d.name)}</h1>
      <p class="muted">${esc(d.type)} · ${esc(d.location || "no location")} · firmware ${esc(d.firmware || "n/a")}</p></header>
    <div class="layout">
      <section class="panel">
        <header class="panel-head"><h2>Live readings</h2><span class="badge b-${d.status}">${STATUS_WORD[d.status]}</span></header>
        <div class="tabs" role="tablist">${tabs}</div>
        ${active ? lineChart(points, active, d.status) : `<div class="empty">No readings yet.</div>`}
        <p class="muted small seen">Last reading ${timeAgo(d.last_seen)}</p>
      </section>
      <section class="panel">
        <header class="panel-head"><h2>Failures on this component</h2></header>
        ${incidentList(mine.slice(0, 6), "No failures recorded for this component.")}
        <button class="primary" data-ask-device="${esc(d.id)}" data-ask-text="Why did ${esc(d.name)} fail and how can I fix it?">Ask AI why it fails</button>
      </section>
    </div>`;
}
