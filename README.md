# Verdant IoT

A calm green-and-white dashboard for IoT and embedded devices. It shows every device, spots failures
the moment they happen, and has an AI chat that explains **why** a device failed, **how** it developed, and **what to do**.

```
 IoT / embedded devices ──POST /api/telemetry──►  BACKEND (FastAPI)
 (ESP32, STM32, RPi, Arduino…)                     ├─ rules.py      failure rules (thresholds, causes, fixes)
                                                   ├─ monitor.py    detect failures, open/close incidents, offline sweep
                                                   ├─ ai/           orchestrator → tools → LLM or built-in engine
                                                   └─ database/     SQLite (schema.sql)
 BROWSER (frontend, plain HTML/CSS/JS) ◄──poll every 3 s──  /api/summary, /devices, /incidents, /chat
```

## Folders

| Folder | What is inside |
|---|---|
| `frontend/` | Dashboard UI. No build step. `index.html`, `css/`, `js/` |
| `backend/` | API. `app/main.py`, `routes.py`, `rules.py`, `services/`, `ai/` |
| `backend/app/ai/` | AI orchestration: `orchestrator.py` (pipeline), `tools.py` (live context), `providers.py` (Claude), `local.py` (built-in engine), `prompts.py` |
| `database/` | `schema.sql` (tables). `iot.db` is created on first start |
| `simulator/` | Simulated IoT devices and components—including sensors, transistor and capacitor modules, controller boards, and gateway nodes—that send telemetry and generate example failures |

## Run (3 terminals)

```bash
# 1) backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload

# 2) frontend
cd frontend
python -m http.server 5173          # open http://localhost:5173

# 3) fake devices (first failure appears in ~20 s)
python simulator/simulator.py
```

Or everything with one command: `docker compose up --build` → open http://localhost:5173

## AI chat

Works out of the box with the **built-in diagnosis engine** (rules + live trends).
For richer answers set a key and restart the backend:

```bash
export ANTHROPIC_API_KEY=your_key      # optional
export ANTHROPIC_MODEL=claude-sonnet-5-5
```

Pipeline for every question: classify intent → find the device → collect live readings, trends and open incidents → ask Claude (or fall back to the built-in engine) → answer.

## Connect a real device

Any device that can send HTTP JSON works:

```bash
curl -X POST http://localhost:8000/api/telemetry -H "Content-Type: application/json" -d '{
  "device_id": "esp32-lab-01", "name": "Lab Node", "type": "ESP32", "location": "Lab",
  "metrics": {"temperature": 41.2, "battery": 78, "rssi": -61}
}'
```

ESP32 (Arduino core) example:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

void sendReading(float temp, int battery) {
  HTTPClient http;
  http.begin("http://YOUR_PC_IP:8000/api/telemetry");
  http.addHeader("Content-Type", "application/json");
  String body = "{\"device_id\":\"esp32-lab-01\",\"name\":\"Lab Node\",\"type\":\"ESP32\",\"metrics\":{"
                "\"temperature\":" + String(temp) + ",\"battery\":" + String(battery) +
                ",\"rssi\":" + String(WiFi.RSSI()) + "}}";
  http.POST(body);
  http.end();
}
```

Send a reading at least every ~10 s. If a device is silent for 20 s it is marked **offline**
(change with `OFFLINE_AFTER_SECONDS`).

## Add your own failure rule

Open `backend/app/rules.py` and add one entry to `RULES`:

```python
{"key": "co2_high", "metric": "co2", "op": ">", "threshold": 1200, "severity": "warning",
 "title": "CO₂ too high", "causes": ["Poor ventilation"], "fixes": ["Open a window or run the fan"]}
```

The dashboard, the incident list and the AI chat all pick it up. Add the label and unit in `LABELS` / `UNITS`
(backend) and in `frontend/js/utils.js` so it displays nicely.
