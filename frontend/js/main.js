import { api } from "./api.js";
import { esc } from "./utils.js";
import { CATEGORIES_BY_ID, categorize, groupByType } from "./categories.js";
import { hero, liveBadge, typeBoxes, compCards, incidentList, filterBar, componentPage, crumbs, statusText } from "./views.js";
import { initChat, setDevices, ask } from "./chat.js";

const $ = (id) => document.getElementById(id);

/* ---------- routes:  #/overview  #/components  #/components/<type>  #/component/<id>  #/failures  #/ask ---------- */
function parseRoute() {
  const [a, b] = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  if (a === "components" && b) return { name: "category", id: b };
  if (a === "component" && b) return { name: "component", id: b };
  if (["components", "failures", "ask"].includes(a)) return { name: a };
  return { name: "overview" };
}

const state = { route: parseRoute(), summary: null, devices: [], incidents: [], telemetry: [], metric: null,
  filter: "open", online: true, lastOk: Date.now(), seen: null };

function setHtml(el, html) { if (el._html !== html) { el._html = html; el.innerHTML = html; } }

function render() {
  const r = state.route;
  document.querySelectorAll(".page").forEach((p) => { p.hidden = p.dataset.page !== r.name; });
  const navKey = r.name === "category" || r.name === "component" ? "components" : r.name;
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if (a.dataset.nav === navKey) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });

  const open = state.incidents.filter((i) => i.status === "open");
  $("nav-failures").textContent = open.length || "";
  setHtml($("live"), liveBadge(state.online, state.lastOk));
  const banner = $("banner");
  banner.hidden = state.online;
  setHtml(banner, `<strong>Can't reach the backend.</strong> Start it with <code>python -m uvicorn app.main:app --port 8000</code> inside the <code>backend</code> folder. This page reconnects by itself.`);

  const groups = groupByType(state.devices);
  setDevices(state.devices);

  if (r.name === "overview") {
    setHtml($("hero"), hero(state.summary));
    setHtml($("ov-types"), typeBoxes(groups));
    setHtml($("ov-incidents"), incidentList(open.slice(0, 4), "Nothing needs attention. All IoT components are calm."));
  } else if (r.name === "components") {
    setHtml($("types"), typeBoxes(groups));
  } else if (r.name === "category") {
    const cat = CATEGORIES_BY_ID[r.id];
    const g = groups.find((x) => x.cat.id === r.id);
    setHtml($("cat-head"), `${crumbs([["IoT Components", "#/components"], [cat ? cat.label : "Unknown type"]])}
      <header class="page-head"><h1>${esc(cat ? cat.label : "Unknown type")}</h1>
      <p class="muted">${g ? `${g.devices.length} ${g.devices.length === 1 ? "component" : "components"} · ${esc(statusText(g.counts))}` : "No components of this type yet."}</p></header>`);
    setHtml($("cat-list"), g ? compCards(g.devices) : "");
  } else if (r.name === "component") {
    const d = state.devices.find((x) => x.id === r.id) || null;
    setHtml($("comp"), componentPage(d, state.telemetry, state.metric, state.incidents, d ? categorize(d) : null));
  } else if (r.name === "failures") {
    const list = state.filter === "open" ? open : state.incidents;
    setHtml($("filters"), filterBar(state.filter, open.length, state.incidents.length));
    setHtml($("all-incidents"), incidentList(list, state.filter === "open" ? "No open failures. Everything is calm." : "No failures recorded yet."));
  }
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
  if (state.seen) open.filter((i) => !state.seen.has(i.id)).slice(0, 2).forEach(toast);
  state.seen = new Set(open.map((i) => i.id));
}

async function loadTelemetry() {
  state.telemetry = state.route.name === "component"
    ? await api.telemetry(state.route.id).catch(() => []) : [];
}

async function refresh() {
  try {
    const [summary, devices, incidents] = await Promise.all([api.summary(), api.devices(), api.incidents()]);
    Object.assign(state, { summary, devices, incidents });
    await loadTelemetry();
    announce(incidents);
    state.online = true; state.lastOk = Date.now();
  } catch {
    state.online = false;
  }
  render();
}

window.addEventListener("hashchange", async () => {
  state.route = parseRoute(); state.metric = null; state.telemetry = [];
  window.scrollTo(0, 0);
  render();
  if (state.online) { await loadTelemetry(); render(); }
});

document.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-metric]");
  if (tab) { state.metric = tab.dataset.metric; return render(); }
  const f = e.target.closest("[data-filter]");
  if (f) { state.filter = f.dataset.filter; return render(); }
  const q = e.target.closest("[data-ask-device]");
  if (q) {
    q.closest(".toast")?.remove();
    location.hash = "#/ask";
    ask(q.dataset.askText, q.dataset.askDevice);
  }
});

initChat();
render();
refresh();
setInterval(refresh, 3000);
