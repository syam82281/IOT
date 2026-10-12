"""Failure rules. Add a dict to RULES and the dashboard + AI chat pick it up automatically."""

LABELS = {
    "temperature": "Temperature", "humidity": "Humidity", "battery": "Battery",
    "rssi": "Signal strength", "cpu": "CPU load", "memory": "Memory use",
    "voltage": "Supply voltage", "vibration": "Vibration", "current": "Current draw",
    "gas_ppm": "Gas level", "soil_moisture": "Soil moisture",
}
UNITS = {
    "temperature": "°C", "humidity": "%", "battery": "%", "rssi": "dBm", "cpu": "%",
    "memory": "%", "voltage": "V", "vibration": "mm/s", "current": "A",
    "gas_ppm": "ppm", "soil_moisture": "%",
}
SEVERITY_RANK = {"warning": 1, "critical": 2}


def label(metric):
    return LABELS.get(metric, metric.replace("_", " ").capitalize())


def unit(metric):
    return UNITS.get(metric, "")


RULES = [
    {"key": "temp_critical", "metric": "temperature", "op": ">", "threshold": 85, "severity": "critical",
     "title": "Overheating",
     "causes": ["Blocked airflow, or no heatsink / fan",
                "Runaway loop or heavy sustained load on the MCU / CPU",
                "Voltage regulator burning off a large supply drop",
                "High ambient temperature or direct sunlight"],
     "fixes": ["Cut the load or put the device in sleep mode right now",
               "Check the fan, heatsink and ventilation",
               "Check the regulator and supply voltage",
               "Move the device away from heat sources"]},
    {"key": "temp_warning", "metric": "temperature", "op": ">", "threshold": 70, "severity": "warning",
     "title": "Running hot",
     "causes": ["Poor airflow around the board", "Constant high load", "Warm environment"],
     "fixes": ["Improve ventilation", "Lower the sampling or transmit rate",
               "Watch the trend; act if it keeps rising"]},

    {"key": "battery_critical", "metric": "battery", "op": "<", "threshold": 10, "severity": "critical",
     "title": "Battery almost empty",
     "causes": ["Cell is nearly discharged",
                "Deep sleep is not working, so the device stays awake",
                "Radio keeps retrying because of weak signal",
                "Old or damaged battery"],
     "fixes": ["Charge or replace the battery now",
               "Check deep-sleep code and the wake-up interval",
               "Fix the signal so the radio sends fewer retries"]},
    {"key": "battery_warning", "metric": "battery", "op": "<", "threshold": 20, "severity": "warning",
     "title": "Battery low",
     "causes": ["Normal discharge", "Higher power use than planned"],
     "fixes": ["Plan a recharge or replacement", "Lengthen the sleep interval"]},

    {"key": "rssi_critical", "metric": "rssi", "op": "<", "threshold": -92, "severity": "critical",
     "title": "Signal almost lost",
     "causes": ["Device is far from the router or gateway",
                "Metal or thick walls blocking the signal",
                "Interference on the same 2.4 GHz channel",
                "Damaged or badly placed antenna"],
     "fixes": ["Move the device or add a repeater / gateway",
               "Change the Wi-Fi channel",
               "Check the antenna and its connector"]},
    {"key": "rssi_warning", "metric": "rssi", "op": "<", "threshold": -85, "severity": "warning",
     "title": "Weak signal",
     "causes": ["Distance or obstacles", "Channel interference"],
     "fixes": ["Move closer or add a repeater", "Try another channel"]},

    {"key": "cpu_warning", "metric": "cpu", "op": ">", "threshold": 90, "severity": "warning",
     "title": "CPU overloaded",
     "causes": ["Busy loop or runaway process", "Too many tasks scheduled together",
                "Memory pressure causing swapping"],
     "fixes": ["Find the top process (`top`, `htop`)", "Reduce task frequency",
               "Restart the stuck service"]},
    {"key": "memory_warning", "metric": "memory", "op": ">", "threshold": 90, "severity": "warning",
     "title": "Memory almost full",
     "causes": ["Memory leak", "Buffers or logs growing without limit"],
     "fixes": ["Restart the service to recover", "Find the leak and cap buffer sizes",
               "Rotate or clear logs"]},

    {"key": "voltage_low", "metric": "voltage", "op": "<", "threshold": 3.0, "severity": "critical",
     "title": "Supply voltage too low",
     "causes": ["Weak battery or supply", "Voltage drop on thin or long wires",
                "Power supply overloaded (motor or radio start-up surge)"],
     "fixes": ["Measure the rail with a multimeter", "Use a stronger supply or thicker wires",
               "Add a bulk capacitor near the MCU"]},
    {"key": "voltage_high", "metric": "voltage", "op": ">", "threshold": 3.6, "severity": "warning",
     "title": "Supply voltage too high",
     "causes": ["Faulty regulator", "Wrong adapter"],
     "fixes": ["Check the regulator output", "Verify the adapter rating"]},

    {"key": "vibration_critical", "metric": "vibration", "op": ">", "threshold": 10, "severity": "critical",
     "title": "Severe vibration",
     "causes": ["Bearing failure", "Loose or broken mounting", "Shaft imbalance or misalignment"],
     "fixes": ["Stop the machine safely", "Inspect bearings and mounting bolts",
               "Check balance and alignment"]},
    {"key": "vibration_warning", "metric": "vibration", "op": ">", "threshold": 7, "severity": "warning",
     "title": "Strong vibration",
     "causes": ["Loose mounting", "Early bearing wear", "Imbalance"],
     "fixes": ["Tighten the mounting", "Schedule a bearing inspection"]},

    {"key": "current_critical", "metric": "current", "op": ">", "threshold": 8, "severity": "critical",
     "title": "Current overload",
     "causes": ["Jammed or stalled motor", "Short circuit", "Mechanical overload"],
     "fixes": ["Cut power and check for a jam", "Inspect wiring for shorts",
               "Reduce the mechanical load"]},
    {"key": "current_warning", "metric": "current", "op": ">", "threshold": 6, "severity": "warning",
     "title": "High current draw",
     "causes": ["Heavier load than normal", "Motor wearing out"],
     "fixes": ["Check the load", "Inspect the motor and its driver"]},

    {"key": "gas_critical", "metric": "gas_ppm", "op": ">", "threshold": 500, "severity": "critical",
     "title": "Dangerous gas level",
     "causes": ["Gas leak nearby", "Poor ventilation",
                "Sensor drift or contamination (verify before ignoring)"],
     "fixes": ["Ventilate and keep people away until confirmed safe", "Find and stop the source",
               "Check the sensor against a reference gauge"]},
    {"key": "gas_warning", "metric": "gas_ppm", "op": ">", "threshold": 300, "severity": "warning",
     "title": "Gas level rising",
     "causes": ["Small leak", "Poor airflow"],
     "fixes": ["Ventilate the area", "Inspect pipes and joints"]},

    {"key": "humidity_warning", "metric": "humidity", "op": ">", "threshold": 85, "severity": "warning",
     "title": "Humidity too high",
     "causes": ["Poor ventilation", "Watering or fogging running too long"],
     "fixes": ["Increase airflow", "Shorten the watering cycle"]},
    {"key": "soil_dry", "metric": "soil_moisture", "op": "<", "threshold": 20, "severity": "warning",
     "title": "Soil too dry",
     "causes": ["Irrigation did not run", "Blocked drip line", "Sensor not in the soil"],
     "fixes": ["Run irrigation", "Check pump and drip lines", "Re-seat the soil probe"]},
]

OFFLINE_RULE = {
    "key": "device_offline", "metric": "heartbeat", "severity": "critical", "title": "Device offline",
    "causes": ["Power lost or battery dead", "Wi-Fi / network down or out of range",
               "Firmware crashed or is stuck in a reboot loop", "Watchdog reset or brown-out"],
    "fixes": ["Check power and battery first", "Check that the router / gateway is up",
              "Power-cycle the device and watch the serial log", "Review the last firmware change"],
}

RULES_BY_KEY = {r["key"]: r for r in RULES + [OFFLINE_RULE]}
