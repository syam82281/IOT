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
let scope = "device";       // "device" = talk about the selected device, "all" = whole fleet
let current = null;         // selected device {id, name}
let busy = false;

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

function renderScope() {
  const useDevice = scope === "device" && current;
  els.scope.innerHTML = useDevice
    ? `Talking about <strong>${esc(current.name)}</strong> <button type="button" class="link" data-scope="all">Ask about all IoT components</button>`
    : `Talking about <strong>all IoT components</strong> ${current ? `<button type="button" class="link" data-scope="device">Focus on ${esc(current.name)}</button>` : ""}`;
}

export function setDevice(device) {
  const changed = (device?.id) !== (current?.id);
  current = device ? { id: device.id, name: device.name } : null;
  if (changed) scope = "device";
  renderScope();
}

export async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true; els.send.disabled = true;
  add("user", `<p>${esc(text)}</p>`);
  const typing = add("ai", `<span class="typing"><i></i><i></i><i></i></span>`);
  try {
    const res = await api.chat({
      message: text,
      device_id: scope === "device" && current ? current.id : null,
      history: history.slice(-6),
    });
    typing.remove();
    add("ai", md(res.answer), res.engine === "claude" ? "Answered by Claude with live IoT component data" : "Answered by the built-in diagnosis engine");
    history.push({ role: "user", content: text }, { role: "assistant", content: res.answer });
  } catch {
    typing.remove();
    add("ai", `<p>I can't reach the backend right now. Start it with <code>uvicorn app.main:app --port 8000</code> and ask again.</p>`);
  } finally {
    busy = false; els.send.disabled = false; els.input.focus();
  }
}

export function ask(text, device) {
  if (device) setDevice(device);
  scope = "device";
  renderScope();
  document.getElementById("chat-panel").scrollIntoView({ behavior: "smooth", block: "center" });
  send(text);
}

export function initChat() {
  add("ai", md("Hi, I'm **Verdant AI**. Pick an IoT component, then ask me why it failed, how it happened, or how to fix it."));
  els.chips.innerHTML = SUGGESTIONS.map(([t, q]) => `<button type="button" class="chip" data-q="${esc(q)}">${esc(t)}</button>`).join("");
  els.chips.addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (b) send(b.dataset.q); });
  els.scope.addEventListener("click", (e) => { const b = e.target.closest("[data-scope]"); if (b) { scope = b.dataset.scope; renderScope(); } });
  els.form.addEventListener("submit", (e) => { e.preventDefault(); const t = els.input.value; els.input.value = ""; send(t); });
  renderScope();
}
