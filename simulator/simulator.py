"""Fake IoT / embedded devices that send readings to the backend and break on purpose.

Run:  python simulator.py            (needs only Python 3, no packages)
Env:  API_URL=http://localhost:8000  INTERVAL=2
"""
import json
import os
import random
import time
import urllib.request

API = os.getenv("API_URL", "http://localhost:8000").rstrip("/") + "/api/telemetry"
INTERVAL = float(os.getenv("INTERVAL", "2"))

# base = normal value, faults = what can go wrong (metric -> value it drifts to)
DEVICES = [
    {"id": "esp32-greenhouse-01", "name": "Greenhouse Node", "type": "ESP32", "location": "Greenhouse A", "firmware": "v1.4.2",
     "base": {"temperature": 28, "humidity": 62, "battery": 84, "rssi": -58, "voltage": 3.3},
     "faults": {"overheat": {"temperature": 98}, "weak signal": {"rssi": -101}, "battery drain": {"battery": 3}}},
    {"id": "rpi-gateway-01", "name": "Edge Gateway", "type": "Raspberry Pi 4", "location": "Server rack", "firmware": "os-12.1",
     "base": {"cpu": 32, "memory": 48, "temperature": 52},
     "faults": {"cpu spike": {"cpu": 99, "memory": 96, "temperature": 84}, "overheat": {"temperature": 92}}},
    {"id": "arduino-soil-02", "name": "Soil Probe", "type": "Arduino Uno", "location": "Field B", "firmware": "v0.9.7",
     "base": {"soil_moisture": 54, "battery": 71, "voltage": 3.3},
     "faults": {"dry soil": {"soil_moisture": 6}, "battery drain": {"battery": 4}}},
    {"id": "stm32-motor-01", "name": "Motor Controller", "type": "STM32", "location": "Pump house", "firmware": "v2.0.1",
     "base": {"temperature": 46, "vibration": 2.4, "current": 2.2, "voltage": 3.3},
     "faults": {"overheat": {"temperature": 100}, "bearing wear": {"vibration": 14}, "overload": {"current": 10, "temperature": 88}}},
    {"id": "esp8266-gas-01", "name": "Gas Sensor", "type": "ESP8266", "location": "Boiler room", "firmware": "v1.1.0",
     "base": {"gas_ppm": 90, "rssi": -62, "battery": 92},
     "faults": {"gas leak": {"gas_ppm": 650}, "weak signal": {"rssi": -100}}},
    {"id": "nrf52-tag-01", "name": "BLE Asset Tag", "type": "nRF52", "location": "Warehouse", "firmware": "v3.2.0",
     "base": {"battery": 63, "rssi": -66},
     "faults": {"battery drain": {"battery": 2}, "weak signal": {"rssi": -99}}},
    {"id": "esp32-temperature-sensor-01", "name": "Temperature Sensor Node", "type": "ESP32 + DS18B20", "location": "Workshop", "firmware": "v1.0.0",
     "base": {"temperature": 24, "humidity": 48, "rssi": -62},
     "faults": {"overheat": {"temperature": 96}, "weak signal": {"rssi": -100}}},
    {"id": "esp32-motion-sensor-01", "name": "PIR Motion Sensor", "type": "ESP32 + PIR", "location": "Entryway", "firmware": "v1.0.0",
     "base": {"battery": 86, "rssi": -60, "voltage": 3.3},
     "faults": {"battery drain": {"battery": 4}, "weak signal": {"rssi": -98}}},
    {"id": "mosfet-switch-01", "name": "MOSFET Transistor Module", "type": "ESP32 + IRLZ44N", "location": "Control cabinet", "firmware": "v1.0.0",
     "base": {"current": 1.2, "voltage": 3.3, "temperature": 34},
     "faults": {"overload": {"current": 9, "temperature": 88}, "overheat": {"temperature": 96}}},
    {"id": "capacitor-power-01", "name": "Capacitor Power Rail", "type": "ESP32 + electrolytic capacitor", "location": "Power supply", "firmware": "v1.0.0",
     "base": {"voltage": 3.3, "current": 0.8, "temperature": 30},
     "faults": {"voltage sag": {"voltage": 2.5}, "overload": {"current": 9, "temperature": 86}}},
    {"id": "controller-board-01", "name": "IoT Controller Motherboard", "type": "ESP32 DevKit", "location": "Control cabinet", "firmware": "v1.2.0",
     "base": {"cpu": 38, "memory": 52, "temperature": 42, "voltage": 3.3},
     "faults": {"cpu spike": {"cpu": 99, "memory": 96, "temperature": 84}, "overheat": {"temperature": 94}}},
    {"id": "sensor-node-01", "name": "Environmental Sensor Node", "type": "Arduino + BME280", "location": "Greenhouse B", "firmware": "v1.0.0",
     "base": {"temperature": 26, "humidity": 58, "battery": 78, "rssi": -64},
     "faults": {"overheat": {"temperature": 93}, "battery drain": {"battery": 3}, "weak signal": {"rssi": -99}}},
    {"id": "edge-gateway-node-01", "name": "Edge Gateway Node", "type": "Raspberry Pi 4", "location": "Network rack", "firmware": "os-12.1",
     "base": {"cpu": 28, "memory": 46, "temperature": 49, "rssi": -57},
     "faults": {"cpu spike": {"cpu": 99, "memory": 95, "temperature": 82}, "weak signal": {"rssi": -98}}},
]
for d in DEVICES:
    d["state"] = dict(d["base"])
    d["fault"] = None      # {"name", "left", "silent"}


def noise(metric):
    return {"temperature": 0.4, "humidity": 0.6, "battery": 0.05, "rssi": 1.0, "cpu": 2.0, "memory": 0.8,
            "voltage": 0.01, "vibration": 0.15, "current": 0.08, "gas_ppm": 4, "soil_moisture": 0.5}.get(metric, 0.3)


def step(dev):
    f = dev["fault"]
    for m, base in dev["base"].items():
        target = f["targets"].get(m, base) if f and not f["silent"] else base
        rate = 0.25 if (f and m in f["targets"]) else 0.2
        dev["state"][m] += (target - dev["state"][m]) * rate + random.uniform(-1, 1) * noise(m)
    if f:
        f["left"] -= 1
        if f["left"] <= 0:
            print(f"  [ok]   {dev['name']} recovered from {f['name']}")
            dev["fault"] = None


def start_fault(dev):
    kinds = list(dev["faults"].items()) + [("went silent", None)]
    name, targets = random.choice(kinds)
    if targets is None:
        dev["fault"] = {"name": name, "left": 14, "silent": True, "targets": {}}   # ~28 s without data
    else:
        dev["fault"] = {"name": name, "left": 13, "silent": False, "targets": targets}
    print(f"  [FAIL] {dev['name']} -> {name}")


def send(dev):
    body = {"device_id": dev["id"], "name": dev["name"], "type": dev["type"], "location": dev["location"],
            "firmware": dev["firmware"], "metrics": {k: round(v, 2) for k, v in dev["state"].items()}}
    req = urllib.request.Request(API, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    urllib.request.urlopen(req, timeout=5).read()


def main():
    print(f"Simulating {len(DEVICES)} devices -> {API}")
    tick = 0
    while True:
        tick += 1
        # first failure after ~20 s, then one new failure roughly every 30-50 s
        if tick == 10 or (tick > 10 and random.random() < 0.035):
            idle = [d for d in DEVICES if not d["fault"]]
            if idle:
                start_fault(random.choice(idle))
        for dev in DEVICES:
            step(dev)
            if dev["fault"] and dev["fault"]["silent"]:
                continue
            try:
                send(dev)
            except Exception as exc:
                print("  backend not reachable:", exc)
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
