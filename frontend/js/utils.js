export const UNITS = { temperature: "°C", humidity: "%", battery: "%", rssi: "dBm", cpu: "%", memory: "%",
  voltage: "V", vibration: "mm/s", current: "A", gas_ppm: "ppm", soil_moisture: "%" };
export const LABELS = { temperature: "Temperature", humidity: "Humidity", battery: "Battery", rssi: "Signal",
  cpu: "CPU", memory: "Memory", voltage: "Voltage", vibration: "Vibration", current: "Current",
  gas_ppm: "Gas", soil_moisture: "Soil moisture" };
export const STATUS_COLOR = { healthy: "#2f8f5b", warning: "#c98a12", critical: "#cf4b4b", offline: "#8a9a92" };
export const STATUS_WORD = { healthy: "Calm", warning: "Warning", critical: "Failing", offline: "Offline" };

export const label = (k) => LABELS[k] || k.replace(/_/g, " ");
export const num = (v) => (Math.round(Number(v) * 10) / 10).toString();
export const fmt = (k, v) => `${num(v)} ${UNITS[k] || ""}`.trim();

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function timeAgo(iso) {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

/** Tiny, safe markdown: **bold**, `code`, - bullets (2-space indent = nested). */
export function md(text) {
  let html = "", depth = 0;
  const close = (to) => { while (depth > to) { html += "</ul>"; depth--; } };
  for (const raw of esc(text).split("\n")) {
    const m = raw.match(/^(\s*)[-•]\s+(.*)$/);
    const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>");
    if (m) {
      const level = Math.floor(m[1].length / 2) + 1;
      while (depth < level) { html += "<ul>"; depth++; }
      close(level);
      html += `<li>${inline(m[2])}</li>`;
    } else {
      close(0);
      if (raw.trim()) html += `<p>${inline(raw)}</p>`;
    }
  }
  close(0);
  return html;
}
