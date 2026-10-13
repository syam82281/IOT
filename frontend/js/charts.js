import { STATUS_COLOR, UNITS, clock, num } from "./utils.js";

export function sparkline(values, status = "healthy") {
  const v = (values || []).filter((x) => x != null);
  if (v.length < 2) return `<svg class="spark" viewBox="0 0 96 28"></svg>`;
  const w = 96, h = 28, min = Math.min(...v), max = Math.max(...v), r = max - min || 1;
  const pts = v.map((x, i) => `${((i / (v.length - 1)) * w).toFixed(1)},${(h - 3 - ((x - min) / r) * (h - 6)).toFixed(1)}`);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${pts.join(" ")}" fill="none" stroke="${STATUS_COLOR[status]}" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

export function lineChart(points, metric, status = "healthy") {
  const data = points.filter((p) => p.v != null);
  if (data.length < 2) return `<div class="empty small">Waiting for more readings…</div>`;
  const W = 380, H = 168, L = 44, R = 10, T = 12, B = 24;
  const vals = data.map((p) => p.v);
  let min = Math.min(...vals), max = Math.max(...vals);
  const pad = (max - min || 1) * 0.15; min -= pad; max += pad;
  const x = (i) => L + (i / (data.length - 1)) * (W - L - R);
  const y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const line = data.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const area = `${L},${H - B} ${line} ${x(data.length - 1).toFixed(1)},${H - B}`;
  const color = STATUS_COLOR[status];
  const ticks = [max, (max + min) / 2, min].map((t) =>
    `<g><line x1="${L}" x2="${W - R}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" class="grid"/>
     <text x="${L - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end" class="axis">${num(t)}</text></g>`).join("");
  const last = data[data.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${metric} over time, latest ${num(last.v)} ${UNITS[metric] || ""}">
    <defs><linearGradient id="fill-${status}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity=".22"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    ${ticks}
    <polygon points="${area}" fill="url(#fill-${status})"/>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${x(data.length - 1).toFixed(1)}" cy="${y(last.v).toFixed(1)}" r="4" fill="#fff" stroke="${color}" stroke-width="2.2"/>
    <text x="${L}" y="${H - 6}" class="axis">${clock(data[0].t)}</text>
    <text x="${W - R}" y="${H - 6}" text-anchor="end" class="axis">${clock(last.t)}</text></svg>`;
}

/** Segmented ring: healthy / warning / critical / offline share of the fleet. */
export function healthRing(s) {
  const total = s.total || 0, R = 54, C = 2 * Math.PI * R;
  const parts = [["healthy", s.healthy], ["warning", s.warning], ["critical", s.critical], ["offline", s.offline]];
  let acc = 0, arcs = "";
  for (const [k, n] of parts) {
    if (!n || !total) continue;
    const len = (n / total) * C, gap = parts.filter(([, c]) => c).length > 1 ? 4 : 0;
    arcs += `<circle cx="70" cy="70" r="${R}" fill="none" stroke="${STATUS_COLOR[k]}" stroke-width="11" stroke-linecap="round"
      stroke-dasharray="${Math.max(len - gap, 0.1).toFixed(1)} ${(C - len + gap).toFixed(1)}" stroke-dashoffset="${(-acc).toFixed(1)}"/>`;
    acc += len;
  }
  const pct = total ? Math.round((s.healthy / total) * 100) : 0;
  return `<svg viewBox="0 0 140 140" class="ring" role="img" aria-label="${pct}% of IoT components healthy">
    <circle cx="70" cy="70" r="${R}" fill="none" stroke="#e6f1ea" stroke-width="11"/>
    <g transform="rotate(-90 70 70)">${arcs}</g>
    <text x="70" y="72" text-anchor="middle" class="ring-num">${pct}<tspan class="ring-pct">%</tspan></text>
    <text x="70" y="92" text-anchor="middle" class="ring-sub">healthy</text></svg>`;
}
