
const STATIONS = [
  {
    icon: "🔥",
    name: "Executive Chef",
    station: "the pass",
    desc: "Oversee the menu, plating standards, and every ticket before it goes out.",
    tags: ["menu", "quality", "plating"],
    href: "dashboard.html?role=executive-chef",
  },
  {
    icon: "🥘",
    name: "Sous Chef",
    station: "back of house",
    desc: "Run prep lists, staff scheduling, and keep every station stocked.",
    tags: ["prep", "staffing", "inventory"],
    href: "dashboard.html?role=sous-chef",
  },
  {
    icon: "🍳",
    name: "Line Cook",
    station: "the grill",
    desc: "Fire tickets, track timers, and follow recipe cards station-side.",
    tags: ["tickets", "timers", "recipes"],
    href: "dashboard.html?role=line-cook",
  },
  {
    icon: "🍰",
    name: "Pastry Chef",
    station: "the bench",
    desc: "Manage the dessert program, allergens, and daily bake counts.",
    tags: ["desserts", "allergens", "bakes"],
    href: "dashboard.html?role=pastry-chef",
  },
  {
    icon: "🧾",
    name: "Front of House",
    station: "the floor",
    desc: "Handle reservations, table turns, and guest requests in real time.",
    tags: ["reservations", "tables", "guests"],
    href: "dashboard.html?role=front-of-house",
  },
  {
    icon: "🧽",
    name: "Steward",
    station: "the wash",
    desc: "Keep the cleaning schedule, equipment log, and dish flow moving.",
    tags: ["cleaning", "equipment", "logs"],
    href: "dashboard.html?role=steward",
  },
];

function renderRoleGrid() {
  const grid = document.getElementById("role-grid");
  if (!grid) return;

  grid.innerHTML = STATIONS.map((role) => `
    <a class="role-card" href="${role.href}" aria-label="Open the ${role.name} station">
      <span class="pin" aria-hidden="true"></span>
      <span class="role-icon" aria-hidden="true">${role.icon}</span>
      <p class="role-name">${role.name}</p>
      <p class="role-station">${role.station}</p>
      <p class="role-desc">${role.desc}</p>
      <span class="role-tags">
        ${role.tags.map((tag) => `<span class="role-tag">#${tag}</span>`).join("")}
      </span>
    </a>
  `).join("");
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
  renderRoleGrid();
  startClock();
});
