/** Component types (the "boxes"). A component is placed by keywords in its name + type.
 *  Own parts not landing where you want? Edit the `test` words below. */
const svg = (d) => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const CATEGORIES = [
  { id: "sensors", label: "Sensors", blurb: "Temperature, gas, soil, motion and environment sensors",
    test: /sensor|probe|\bpir\b|ds18b20|bme280|dht\d*|detector|\bgas\b|soil|motion/i,
    icon: svg('<path d="M10 14V5a2 2 0 1 1 4 0v9a4 4 0 1 1-4 0z"/>') },
  { id: "boards", label: "Microcontroller boards", blurb: "ESP32, ESP8266, Arduino, STM32 and controller boards",
    test: /controller|motherboard|devkit|board|esp32|esp8266|arduino|stm32|node/i,
    icon: svg('<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>') },
  { id: "power", label: "Power & electronic parts", blurb: "Capacitors, MOSFETs, transistors and power rails",
    test: /capacitor|mosfet|transistor|resistor|relay|regulator|diode|irlz|power/i,
    icon: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>') },
  { id: "gateways", label: "Gateways & edge", blurb: "Raspberry Pi and network gateways",
    test: /gateway|raspberry|router|\bpi\b/i,
    icon: svg('<rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 17h.01M11 17h.01M8.5 11a5 5 0 0 1 7 0M6 8.5a8.5 8.5 0 0 1 12 0"/>') },
  { id: "motors", label: "Motors & actuators", blurb: "Motor controllers, pumps and drivers",
    test: /motor|pump|actuator|servo/i,
    icon: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>') },
  { id: "tags", label: "Wireless tags", blurb: "BLE and asset-tracking tags",
    test: /\btag\b|\bble\b|beacon|nrf/i,
    icon: svg('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>') },
  { id: "other", label: "Other components", blurb: "Everything else", test: null,
    icon: svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>') },
];
export const CATEGORIES_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

// Which type wins when a name matches several (e.g. "Motor Controller" is a motor, not a board).
const MATCH_ORDER = ["motors", "power", "gateways", "tags", "sensors", "boards"];

export function categorize(device) {
  const text = `${device.name} ${device.type}`;
  const hit = MATCH_ORDER.map((id) => CATEGORIES_BY_ID[id]).find((c) => c.test.test(text));
  return hit || CATEGORIES_BY_ID.other;
}

/** -> [{cat, devices, counts:{healthy,warning,critical,offline}}] for types that have components */
export function groupByType(devices) {
  return CATEGORIES.map((cat) => {
    const list = devices.filter((d) => categorize(d).id === cat.id);
    const counts = { healthy: 0, warning: 0, critical: 0, offline: 0 };
    list.forEach((d) => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return { cat, devices: list, counts };
  }).filter((g) => g.devices.length);
}
