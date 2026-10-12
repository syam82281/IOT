import { esc, fmt, label, timeAgo, STATUS_COLOR, STATUS_WORD } from "./utils.js";
import { sparkline, lineChart, healthRing } from "./charts.js";

const METRIC_ORDER = ["gas_ppm", "soil_moisture", "vibration", "temperature", "cpu", "memory", "current", "humidity", "battery", "rssi", "voltage"];
const sortMetrics = (keys, issues = {}) =>
  [...keys].sort((a, b) => (issues[b] ? 1 : 0) - (issues[a] ? 1 : 0) || METRIC_ORDER.indexOf(a) - METRIC_ORDER.indexOf(b));

export function hero(s, online) {
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

export function deviceList(devices, selected) {
  if (!devices.length) return `<div class="empty">No IoT components yet. Run <code>python simulator/simulator.py</code> to see some.</div>`;
  return devices.map((d) => {
    const keys = sortMetrics(Object.keys(d.latest || {}), d.issues).slice(0, 3);
    const chips = keys.map((k) => `<span class="mchip ${d.issues?.[k] ? "bad-" + d.issues[k] : ""}"><em>${esc(label(k))}</em> ${esc(fmt(k, d.latest[k]))}</span>`).join("");
    return `<button class="row ${d.id === selected ? "is-selected" : ""}" data-select="${esc(d.id)}" aria-pressed="${d.id === selected}">
      <span class="dot" style="background:${STATUS_COLOR[d.status]}" title="${STATUS_WORD[d.status]}"></span>
      <span class="who"><strong>${esc(d.name)}</strong><small>${esc(d.type)} · ${esc(d.location || "no location")}</small></span>
      <span class="chips-row">${chips}</span>
      ${sparkline(d.trend, d.status)}
      <span class="badge b-${d.status}">${STATUS_WORD[d.status]}</span></button>`;
  }).join("");
}

export function incidentList(list) {
  if (!list.length) return `<div class="empty">No failures recorded. Everything has been calm.</div>`;
  return list.map((i) => `<article class="inc sev-${i.severity} ${i.status}">
      <div class="inc-main">
        <h3>${esc(i.title)} <span class="badge b-${i.status === "open" ? (i.severity === "critical" ? "critical" : "warning") : "healthy"}">${i.status === "open" ? i.severity : "resolved"}</span></h3>
        <p class="muted">${esc(i.device_name)} · ${esc(i.detail)}</p>
        <small class="muted">${i.status === "open" ? "Started" : "Resolved"} ${timeAgo(i.status === "open" ? i.opened_at : i.resolved_at)}</small>
      </div>
      ${i.status === "open" ? `<button class="ghost" data-ask-device="${esc(i.device_id)}" data-ask-text="Why did ${esc(i.device_name)} fail and how can I fix it?">Ask AI</button>` : ""}
    </article>`).join("");
}

export function detail(device, telemetry, metric) {
  if (!device) return `<div class="empty">Select an IoT component to see its readings.</div>`;
  const keys = sortMetrics(Object.keys(device.latest || {}), device.issues);
  const active = keys.includes(metric) ? metric : (device.primary_metric || keys[0]);
  const tabs = keys.map((k) => `<button class="tab ${k === active ? "on" : ""} ${device.issues?.[k] ? "bad-" + device.issues[k] : ""}" data-metric="${esc(k)}">
      <small>${esc(label(k))}</small><strong>${esc(fmt(k, device.latest[k]))}</strong></button>`).join("");
  const points = telemetry.map((r) => ({ t: r.ts, v: r.metrics[active] }));
  return `<header class="panel-head"><div><h2>${esc(device.name)}</h2>
      <p class="muted small">${esc(device.type)} · ${esc(device.location || "no location")} · firmware ${esc(device.firmware || "n/a")}</p></div>
      <span class="badge b-${device.status}">${STATUS_WORD[device.status]}</span></header>
    <div class="tabs" role="tablist">${tabs || ""}</div>
    ${active ? lineChart(points, active, device.status) : ""}
    <p class="muted small seen">Last reading ${timeAgo(device.last_seen)}</p>`;
}
