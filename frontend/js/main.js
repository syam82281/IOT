import { api } from "./api.js";
import { esc } from "./utils.js";
import { hero, liveBadge, deviceList, incidentList, detail } from "./views.js";
import { initChat, setDevice, ask } from "./chat.js";

const $ = (id) => document.getElementById(id);
const state = { summary: null, devices: [], incidents: [], telemetry: [], selected: null, metric: null,
  online: true, lastOk: Date.now(), seen: null };

function setHtml(el, html) { if (el._html !== html) { el._html = html; el.innerHTML = html; } }

function render() {
  const device = state.devices.find((d) => d.id === state.selected) || null;
  setHtml($("hero"), hero(state.summary, state.online));
  setHtml($("live"), liveBadge(state.online, state.lastOk));
  setHtml($("devices"), deviceList(state.devices, state.selected));
  setHtml($("incidents"), incidentList(state.incidents));
  setHtml($("detail"), detail(device, state.telemetry, state.metric));
  $("devices-count").textContent = state.devices.length ? `${state.devices.length} connected` : "";
  const open = state.incidents.filter((i) => i.status === "open").length;
  $("incidents-count").textContent = open ? `${open} open` : "";
  setDevice(device);
}

function toast(inc) {
  const el = document.createElement("div");
  el.className = `toast sev-${inc.severity}`;
  el.innerHTML = `<div><strong>${esc(inc.title)}</strong><p>${esc(inc.device_name)} · ${esc(inc.detail)}</p></div>
    <button class="ghost" data-ask-device="${esc(inc.device_id)}" data-ask-text="Why did ${esc(inc.device_name)} fail and how can I fix it?">Ask AI</button>`;
  $("toasts").appendChild(el);
  setTimeout(() => el.remove(), 8000);
}

function announce(incidents) {
  const open = incidents.filter((i) => i.status === "open");
  const ids = new Set(open.map((i) => i.id));
  if (state.seen) open.filter((i) => !state.seen.has(i.id)).slice(0, 2).forEach(toast);
  state.seen = ids;
}

async function loadTelemetry() {
  state.telemetry = state.selected ? await api.telemetry(state.selected) : [];
}

async function refresh() {
  try {
    const [summary, devices, incidents] = await Promise.all([api.summary(), api.devices(), api.incidents()]);
    Object.assign(state, { summary, devices, incidents });
    if (!devices.some((d) => d.id === state.selected)) {
      state.selected = (devices.find((d) => d.open_incidents) || devices[0])?.id ?? null;
    }
    await loadTelemetry();
    announce(incidents);
    state.online = true; state.lastOk = Date.now();
  } catch {
    state.online = false;
  }
  render();
}

async function select(id) {
  state.selected = id; state.metric = null;
  render();
  try { await loadTelemetry(); } catch { /* next poll retries */ }
  render();
}

document.addEventListener("click", (e) => {
  const pick = e.target.closest("[data-select]");
  if (pick) return select(pick.dataset.select);
  const tab = e.target.closest("[data-metric]");
  if (tab) { state.metric = tab.dataset.metric; return render(); }
  const q = e.target.closest("[data-ask-device]");
  if (q) {
    const device = state.devices.find((d) => d.id === q.dataset.askDevice);
    if (device) { state.selected = device.id; state.metric = null; render(); loadTelemetry().then(render); }
    q.closest(".toast")?.remove();
    ask(q.dataset.askText, device);
  }
});

initChat();
refresh();
setInterval(refresh, 3000);
