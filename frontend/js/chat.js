import { api } from "./api.js";
import { esc, md } from "./utils.js";

const els = {
  messages: document.getElementById("messages"),
  form: document.getElementById("composer"),
  input: document.getElementById("chat-input"),
  send: document.getElementById("send"),
  chips: document.getElementById("chips"),
  scope: document.getElementById("chat-scope"),
};
const history = [];
let devices = [];
let selected = "";          // "" = all IoT components
let busy = false;
let select;

const SUGGESTIONS = [
  ["Why is it failing?", "Why is this failing and how did it happen?"],
  ["How can I fix it?", "How can I fix it?"],
  ["Health summary", "Give me a health summary of all IoT components"],
];

function add(role, html, meta = "") {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.innerHTML = `<div class="bubble">${html}</div>${meta ? `<small class="meta">${meta}</small>` : ""}`;
  els.messages.appendChild(div);
  els.messages.scrollTop = els.messages.scrollHeight;
  return div;
}

function renderOptions() {
  const html = `<option value="">All IoT components</option>` +
    devices.map((d) => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join("");
  if (select._html !== html) { select._html = html; select.innerHTML = html; }
  select.value = devices.some((d) => d.id === selected) ? selected : "";
}

export function setDevices(list) {
  devices = list;
  renderOptions();
}

export async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true; els.send.disabled = true;
  add("user", `<p>${esc(text)}</p>`);
  const typing = add("ai", `<span class="typing"><i></i><i></i><i></i></span>`);
  try {
    const res = await api.chat({ message: text, device_id: selected || null, history: history.slice(-6) });
    typing.remove();
    add("ai", md(res.answer), res.engine === "claude" ? "Answered by Claude with live device data" : "Answered by the built-in diagnosis engine");
    history.push({ role: "user", content: text }, { role: "assistant", content: res.answer });
  } catch {
    typing.remove();
    add("ai", `<p>I can't reach the backend right now. Start it with <code>python -m uvicorn app.main:app --port 8000</code> (inside the <code>backend</code> folder) and ask again.</p>`);
  } finally {
    busy = false; els.send.disabled = false;
  }
}

/** Ask a question about one component (or all when deviceId is empty). */
export function ask(text, deviceId = "") {
  selected = deviceId || "";
  renderOptions();
  send(text);
}

export function initChat() {
  els.scope.innerHTML = `<label for="chat-target">Talking about</label> <select id="chat-target"></select>`;
  select = document.getElementById("chat-target");
  select.addEventListener("change", () => { selected = select.value; });
  renderOptions();
  add("ai", md("Hi, I'm **Verdant AI**. Choose an IoT component above, then ask me why it failed, how it happened, or how to fix it."));
  els.chips.innerHTML = SUGGESTIONS.map(([t, q]) => `<button type="button" class="chip" data-q="${esc(q)}">${esc(t)}</button>`).join("");
  els.chips.addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (b) send(b.dataset.q); });
  els.form.addEventListener("submit", (e) => { e.preventDefault(); const t = els.input.value; els.input.value = ""; send(t); });
}
