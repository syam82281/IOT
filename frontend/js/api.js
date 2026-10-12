const BASE = window.VERDANT_API || "http://localhost:8000/api";

async function req(path, options) {
  const res = await fetch(BASE + path, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  summary: () => req("/summary"),
  devices: () => req("/devices"),
  incidents: () => req("/incidents?limit=12"),
  telemetry: (id) => req(`/devices/${encodeURIComponent(id)}/telemetry?limit=60`),
  chat: (body) => req("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }),
};
