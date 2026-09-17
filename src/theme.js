const STOPS = [
  { id: "dawn", range: [5, 8] },
  { id: "morning", range: [8, 12] },
  { id: "midday", range: [12, 17] },
  { id: "dusk", range: [17, 20] },
  { id: "night", range: [20, 29] },
];

function stopForHour(hour) {
  for (const stop of STOPS) {
    const [start, end] = stop.range;
    if (hour >= start && hour < end) return stop.id;
  }
  return "night";
}

function applyCurrentStop() {
  try {
    const hour = new Date().getHours();
    document.documentElement.setAttribute("data-time", stopForHour(hour));
  } catch {
    document.documentElement.setAttribute("data-time", "night");
  }
}

export function startCircadianTheme() {
  applyCurrentStop();
  window.setInterval(applyCurrentStop, 5 * 60 * 1000);
}
