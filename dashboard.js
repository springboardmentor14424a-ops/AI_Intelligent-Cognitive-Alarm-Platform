/* =====================================================================
   SIMMER — station dashboard behavior
   Reads ?role= from the URL, looks up that station's board, and
   renders its widgets. Each widget has a "kind" (tickets, checklist,
   table, stats) with a small renderer of its own below.
   ===================================================================== */

const ROLES = {
  "executive-chef": {
    icon: "🔥",
    name: "Executive Chef",
    station: "the pass",
    greeting: "Eyes on the pass.",
    subline: "Every ticket crosses your board before it leaves the kitchen.",
    widgets: [
      {
        kind: "tickets",
        title: "On the pass",
        sub: "6 firing",
        rows: [
          { title: "Table 12 — Duck breast x2", meta: "fired 6 min ago", status: "urgent", time: "6:12" },
          { title: "Table 7 — Risotto x1", meta: "fired 4 min ago", status: "pending", time: "4:03" },
          { title: "Table 3 — Tasting menu, course 4", meta: "fired 2 min ago", status: "pending", time: "2:20" },
          { title: "Table 9 — Steak frites x3", meta: "plated, awaiting expo", status: "done", time: "0:00" },
        ],
      },
      {
        kind: "checklist",
        title: "Quality checks",
        sub: "3 of 5",
        rows: [
          { label: "Taste the soup base", detail: "before dinner service", done: true },
          { label: "Check walk-in temps", detail: "logged at 3:00pm", done: true },
          { label: "Sign off tasting menu plating", detail: "new course 4 garnish", done: true },
          { label: "Review tonight's allergen list", detail: "3 guests flagged", done: false },
          { label: "Approve tomorrow's specials board", detail: "sous chef draft pending", done: false },
        ],
      },
      {
        kind: "table",
        title: "Today's specials",
        sub: "3 live",
        columns: ["Dish", "86'd at", "Notes"],
        rows: [
          ["Roasted beet salad", "—", "running strong"],
          ["Seared scallops", "8:45pm", "last of the batch"],
          ["Chocolate torte", "—", "pastry restocking 6pm"],
        ],
      },
    ],
  },

  "sous-chef": {
    icon: "🥘",
    name: "Sous Chef",
    station: "back of house",
    greeting: "Keep the line stocked.",
    subline: "Prep, people, and inventory — the shift runs on all three.",
    widgets: [
      {
        kind: "checklist",
        title: "Prep list",
        sub: "4 of 7",
        rows: [
          { label: "Butcher 20lb short rib", detail: "for braise, done by 2pm", done: true },
          { label: "Mise for grill station", detail: "sauces, garnish, proteins", done: true },
          { label: "Stock reduction, round 2", detail: "veal stock, 6 more hours", done: true },
          { label: "Blanch vegetables for banquet", detail: "150 covers Saturday", done: true },
          { label: "Portion fish delivery", detail: "arrived 11am, needs breakdown", done: false },
          { label: "Restock walk-in labels", detail: "FIFO dates due for update", done: false },
          { label: "Prep tomorrow's stocks", detail: "chicken + veg", done: false },
        ],
      },
      {
        kind: "table",
        title: "Staff on shift",
        sub: "6 clocked in",
        columns: ["Name", "Station", "Until"],
        rows: [
          ["Marcus", "Grill", "11:00pm"],
          ["Priya", "Sauté", "10:30pm"],
          ["Devon", "Garde manger", "9:30pm"],
          ["Ana", "Pastry", "8:00pm"],
          ["Leo", "Dish", "11:00pm"],
        ],
      },
      {
        kind: "checklist",
        title: "Low stock",
        sub: "3 items",
        rows: [
          { label: "Heavy cream", detail: "1.5 qt left, order tomorrow", done: false },
          { label: "Fresh thyme", detail: "down to last bunch", done: false },
          { label: "Butcher paper", detail: "reorder this week", done: false },
        ],
      },
    ],
  },

  "line-cook": {
    icon: "🍳",
    name: "Line Cook",
    station: "the grill",
    greeting: "Fire when ready.",
    subline: "Your queue, your timers, your recipe cards — all in one place.",
    widgets: [
      {
        kind: "tickets",
        title: "Your queue",
        sub: "4 up",
        rows: [
          { title: "Ribeye, medium rare", meta: "table 14, seat 2", status: "urgent", time: "7:40" },
          { title: "Chicken thigh, crispy skin", meta: "table 14, seat 3", status: "urgent", time: "7:10" },
          { title: "Salmon, skin on", meta: "table 6, seat 1", status: "pending", time: "3:15" },
          { title: "Lamb chops x2", meta: "table 2, seat 1 & 2", status: "pending", time: "1:02" },
        ],
      },
      {
        kind: "checklist",
        title: "Recipe card — Ribeye",
        sub: "step 3 of 5",
        rows: [
          { label: "Bring to room temp, season", detail: "kosher salt, cracked pepper", done: true },
          { label: "Sear 3 min per side", detail: "high heat, cast iron", done: true },
          { label: "Baste with butter + thyme", detail: "tilt pan, spoon continuously", done: false },
          { label: "Rest 5 minutes", detail: "tented loosely", done: false },
          { label: "Slice against the grain, plate", detail: "fan across the plate", done: false },
        ],
      },
      {
        kind: "stats",
        title: "Station notes",
        sub: "shift so far",
        stats: [
          { value: "38", label: "tickets fired" },
          { value: "6.2m", label: "avg fire time" },
          { value: "2", label: "sent back" },
        ],
      },
    ],
  },

  "pastry-chef": {
    icon: "🍰",
    name: "Pastry Chef",
    station: "the bench",
    greeting: "Sweet side's covered.",
    subline: "Bakes on the clock, allergens tracked, counts up to date.",
    widgets: [
      {
        kind: "table",
        title: "Bake schedule",
        sub: "next 3",
        columns: ["Item", "Ready by", "Qty"],
        rows: [
          ["Chocolate torte", "5:30pm", "12"],
          ["Brioche for tomorrow", "6:00am", "40"],
          ["Sorbet churn", "7:00pm", "3 batches"],
        ],
      },
      {
        kind: "checklist",
        title: "Allergen tracker",
        sub: "flagged tonight",
        rows: [
          { label: "Chocolate torte", detail: "contains tree nuts (almond flour)", done: false },
          { label: "Brioche", detail: "contains dairy, egg, gluten", done: false },
          { label: "Sorbet", detail: "dairy-free, gluten-free", done: true },
        ],
      },
      {
        kind: "stats",
        title: "Remaining tonight",
        sub: "as of last count",
        stats: [
          { value: "9", label: "torte slices" },
          { value: "14", label: "sorbet scoops" },
          { value: "0", label: "brioche left" },
        ],
      },
    ],
  },

  "front-of-house": {
    icon: "🧾",
    name: "Front of House",
    station: "the floor",
    greeting: "Full house tonight.",
    subline: "Reservations, tables, and guest requests, all on one board.",
    widgets: [
      {
        kind: "table",
        title: "Reservations",
        sub: "next up",
        columns: ["Time", "Party", "Table"],
        rows: [
          ["7:00pm", "Chen, party of 4", "12"],
          ["7:15pm", "Alvarez, party of 2", "6"],
          ["7:30pm", "Whitfield, party of 6", "2 + 3"],
          ["8:00pm", "Osei, party of 2", "9"],
        ],
      },
      {
        kind: "stats",
        title: "Table status",
        sub: "18 total",
        stats: [
          { value: "11", label: "seated" },
          { value: "4", label: "open" },
          { value: "3", label: "turning soon" },
        ],
      },
      {
        kind: "checklist",
        title: "Guest requests",
        sub: "2 open",
        rows: [
          { label: "Table 3 — highchair needed", detail: "requested 5 min ago", done: false },
          { label: "Table 9 — birthday candle", detail: "for the torte, dessert course", done: false },
          { label: "Table 6 — extra napkins", detail: "delivered", done: true },
        ],
      },
    ],
  },

  "steward": {
    icon: "🧽",
    name: "Steward",
    station: "the wash",
    greeting: "Clean line, clear head.",
    subline: "Cleaning schedule, equipment status, and dish flow at a glance.",
    widgets: [
      {
        kind: "checklist",
        title: "Cleaning schedule",
        sub: "by area",
        rows: [
          { label: "Grill station breakdown", detail: "nightly, after last fire", done: false },
          { label: "Walk-in floor mop", detail: "due by 10pm", done: false },
          { label: "Sanitize prep tables", detail: "every 4 hours", done: true },
          { label: "Empty grease trap", detail: "logged Tuesdays", done: true },
        ],
      },
      {
        kind: "checklist",
        title: "Equipment log",
        sub: "2 flagged",
        rows: [
          { label: "Dish machine — rinse temp low", detail: "reported to manager", done: false },
          { label: "Walk-in door seal", detail: "worn, needs replacing", done: false },
          { label: "Ice machine", detail: "cleaned and running", done: true },
        ],
      },
      {
        kind: "stats",
        title: "Dish flow",
        sub: "this hour",
        stats: [
          { value: "142", label: "covers washed" },
          { value: "6m", label: "avg turnaround" },
        ],
      },
    ],
  },
};

function getRoleFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("role");
}

function renderTickets(widget) {
  const rowsHTML = widget.rows.map((row) => `
    <li class="ticket-row">
      <div class="ticket-main">
        <span class="ticket-title">${row.title}</span>
        <span class="ticket-meta">${row.meta}</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <span class="ticket-time mono">${row.time}</span>
        <span class="pill pill-${row.status}">${row.status}</span>
      </div>
    </li>
  `).join("");
  return `<ul class="tickets-list">${rowsHTML}</ul>`;
}

function renderChecklist(widget) {
  const rowsHTML = widget.rows.map((row) => `
    <li class="check-row ${row.done ? "is-done" : ""}">
      <span class="check-mark">${row.done ? "✓" : ""}</span>
      <span>
        <span class="check-label">${row.label}</span>
        <div class="check-detail">${row.detail}</div>
      </span>
    </li>
  `).join("");
  return `<ul class="checklist">${rowsHTML}</ul>`;
}

function renderTable(widget) {
  const headHTML = widget.columns.map((col) => `<th>${col}</th>`).join("");
  const bodyHTML = widget.rows.map((row) => `
    <tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>
  `).join("");
  return `
    <table class="widget-table">
      <thead><tr>${headHTML}</tr></thead>
      <tbody>${bodyHTML}</tbody>
    </table>
  `;
}

function renderStats(widget) {
  const itemsHTML = widget.stats.map((stat) => `
    <div class="stat-item">
      <span class="stat-value">${stat.value}</span>
      <span class="stat-label">${stat.label}</span>
    </div>
  `).join("");
  return `<div class="stats-row">${itemsHTML}</div>`;
}

const WIDGET_RENDERERS = {
  tickets: renderTickets,
  checklist: renderChecklist,
  table: renderTable,
  stats: renderStats,
};

function renderWidget(widget) {
  const renderer = WIDGET_RENDERERS[widget.kind];
  if (!renderer) return "";
  return `
    <section class="widget">
      <div class="widget-head">
        <h2 class="widget-title">${widget.title}</h2>
        <span class="widget-sub mono">${widget.sub}</span>
      </div>
      ${renderer(widget)}
    </section>
  `;
}

function renderEmptyState() {
  const board = document.getElementById("widget-board");
  board.innerHTML = `
    <div class="dash-empty">
      <p>We couldn't find that station.</p>
      <a href="index.html">← head back to the lineup and pick one</a>
    </div>
  `;
}

function renderDashboard() {
  const slug = getRoleFromURL();
  const role = ROLES[slug];

  const chip = document.getElementById("role-chip");
  const eyebrow = document.getElementById("dash-eyebrow");
  const greeting = document.getElementById("dash-greeting");
  const subline = document.getElementById("dash-subline");
  const board = document.getElementById("widget-board");

  if (!role) {
    if (chip) chip.style.display = "none";
    renderEmptyState();
    return;
  }

  chip.innerHTML = `
    <span class="chip-icon" aria-hidden="true">${role.icon}</span>
    <span>
      <span class="chip-name">${role.name}</span><br>
      <span class="chip-station">${role.station}</span>
    </span>
  `;

  eyebrow.textContent = `on shift · ${role.station}`;
  greeting.textContent = role.greeting;
  subline.textContent = role.subline;

  board.innerHTML = role.widgets.map(renderWidget).join("");
}

function startClock() {
  const clockEl = document.getElementById("live-clock");
  if (!clockEl) return;

  function tick() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    clockEl.textContent = `${hh}:${mm}:${ss}`;
  }

  tick();
  setInterval(tick, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
  renderDashboard();
  startClock();
});
