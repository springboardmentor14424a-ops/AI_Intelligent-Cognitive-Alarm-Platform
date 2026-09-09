/* ===== Global State ===== */
let currentUser = null;
let currentAlarms = [];
let charts = {}; // Chart.js instances, keyed by canvas id

let ring = {
  alarmId: null, difficulty: "easy", challengeType: "math",
  totalSteps: 1, currentStep: 1, failedCount: 0, score: 0,
  snoozesUsed: 0, muted: false, timerInterval: null, secondsLeft: 60,
  challengeId: null, ringtone: "classic_bell", method: "puzzle_completion",
};

const AVATAR_OPTIONS = ["⏰", "😴", "🌙", "⭐", "🔥", "🦉", "☕", "🐦"];

const AUTH_QUOTES = [
  '"The way you wake up sets the tone for everything after it."',
  '"Discipline is choosing between what you want now and what you want most."',
  '"Every sunrise is a fresh chance to reset your habits."',
  '"A calm morning is built the night before."',
  '"Small wins at 7am become big wins by December."',
  "\"You don't rise to the level of your alarm — you fall to the level of your routine.\"",
];

/* ===== Sound Engine (Web Audio API — no external audio files needed) ===== */
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, startTime, duration, type = "sine", gainPeak = 0.18) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/* Each ringtone is a short synthesized pattern — genuinely different sounds,
   not audio files (keeps this dependency-free and copyright-clean). */
const RINGTONE_PATTERNS = {
  classic_bell: (ctx, t) => {
    playTone(880, t, 0.35, "triangle");
    playTone(660, t + 0.4, 0.35, "triangle");
  },
  digital_beep: (ctx, t) => {
    playTone(1200, t, 0.12, "square", 0.12);
    playTone(1200, t + 0.2, 0.12, "square", 0.12);
    playTone(1200, t + 0.4, 0.12, "square", 0.12);
  },
  gentle_chime: (ctx, t) => {
    playTone(523.25, t, 0.5, "sine", 0.12);
    playTone(659.25, t + 0.15, 0.5, "sine", 0.1);
    playTone(783.99, t + 0.3, 0.6, "sine", 0.08);
  },
  radar: (ctx, t) => {
    for (let i = 0; i < 4; i++) playTone(700, t + i * 0.18, 0.08, "sine", 0.15);
  },
  xylophone: (ctx, t) => {
    [523, 659, 784, 1047].forEach((f, i) => playTone(f, t + i * 0.13, 0.25, "triangle", 0.14));
  },
};

function previewRingtone(name) {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    const pattern = RINGTONE_PATTERNS[name] || RINGTONE_PATTERNS.classic_bell;
    pattern(ctx, ctx.currentTime);
  } catch (err) {
    showToast("Audio preview unavailable in this browser.", "error");
  }
}

let ringtoneLoopInterval = null;
function startRingtoneLoop(name) {
  stopRingtoneLoop();
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    const pattern = RINGTONE_PATTERNS[name] || RINGTONE_PATTERNS.classic_bell;
    const fire = () => { if (!ring.muted) pattern(ctx, ctx.currentTime); };
    fire();
    ringtoneLoopInterval = setInterval(fire, 1800);
  } catch (err) { /* audio not available — ring modal still works visually */ }
}
function stopRingtoneLoop() {
  clearInterval(ringtoneLoopInterval);
  ringtoneLoopInterval = null;
}

/* ===== Utilities ===== */
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => (toast.className = "toast"), 2800);
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");
}

function switchPage(pageId) {
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
  document.getElementById(`page-${pageId}`).classList.add("active");
  const navBtn = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (navBtn) navBtn.classList.add("active");

  if (pageId === "overview") loadOverview();
  if (pageId === "alarms") loadAlarms();
  if (pageId === "challenges") loadChallenges();
  if (pageId === "analytics") loadAnalytics();
  if (pageId === "habit") loadHabit();
  if (pageId === "ai") loadAi();
  if (pageId === "admin") loadAdmin();
  if (pageId === "profile") loadProfile();
}

/* ===== Landing / Auth navigation ===== */
document.getElementById("landing-signin-btn").addEventListener("click", () => openAuth("login"));
document.getElementById("landing-getstarted-btn").addEventListener("click", () => openAuth("register"));
document.getElementById("hero-create-account-btn").addEventListener("click", () => openAuth("register"));
document.getElementById("hero-access-btn").addEventListener("click", () => openAuth("login"));
document.getElementById("back-home-btn").addEventListener("click", () => switchView("view-landing"));

function openAuth(tab) {
  switchView("view-auth");
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".auth-form").forEach((f) => f.classList.remove("active"));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add("active");
  document.getElementById(`form-${tab}`).classList.add("active");
  document.getElementById("auth-quote").textContent = AUTH_QUOTES[Math.floor(Math.random() * AUTH_QUOTES.length)];
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => openAuth(btn.dataset.tab));
});

document.getElementById("btn-google-signin").addEventListener("click", () => {
  const width = 500;
  const height = 600;

  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  window.open(
    "/api/auth/google",
    "google-signin",
    `width=${width},height=${height},left=${left},top=${top}`
  );
});

window.addEventListener("message", async (event) => {
  if (event.origin !== window.location.origin) {
    return;
  }

  if (event.data?.type === "google-auth-success") {
    try {
      setToken(event.data.token);

      currentUser = await Api.me();

      enterApp();

      showToast("Google Sign-In successful!", "success");
    } catch (err) {
      clearToken();
      showToast("Google Sign-In failed. Please try again.", "error");
      console.error(err);
    }
  }

  if (event.data?.type === "google-auth-error") {
    showToast("Google Sign-In was cancelled or failed.", "error");
  }
});

/* ===== Auth forms ===== */
document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");
  errorEl.textContent = "";
  try {
    const data = await Api.login(email, password);
    setToken(data.access_token);
    currentUser = data.user;
    enterApp();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById("form-register").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("reg-name").value;
  const email = document.getElementById("reg-email").value;
  const password = document.getElementById("reg-password").value;
  const role = document.getElementById("reg-role").value;
  const errorEl = document.getElementById("register-error");
  errorEl.textContent = "";
  try {
    const data = await Api.register(name, email, password, role);
    setToken(data.access_token);
    currentUser = data.user;
    enterApp();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.querySelectorAll(".demo-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      const data = await Api.demoLogin(btn.dataset.demoRole);
      setToken(data.access_token);
      currentUser = data.user;
      enterApp();
    } catch (err) {
      showToast(err.message, "error");
    }
  });
});

document.getElementById("btn-logout").addEventListener("click", () => {
  clearToken();
  currentUser = null;
  switchView("view-landing");
});

function enterApp() {
  document.getElementById("sidebar-user-name").textContent = currentUser.name;
  document.getElementById("sidebar-user-role").textContent = currentUser.role.replace("_", " ");
  document.getElementById("sidebar-avatar").textContent = currentUser.avatar_emoji || "⏰";
  document.getElementById("nav-admin").style.display =
    (currentUser.role === "admin" || currentUser.role === "wellness_coach") ? "flex" : "none";
  applyTheme(currentUser.theme === "light");
  switchView("view-shell");
  switchPage("overview");
}

/* ===== Theme switch ===== */
function applyTheme(isLight) {
  document.body.classList.toggle("theme-light", isLight);
  const btn = document.getElementById("btn-theme-switch");
  btn.textContent = isLight ? "☀️ Theme: Light" : "🌙 Theme: Dark";
}
document.getElementById("btn-theme-switch").addEventListener("click", async () => {
  const isLight = !document.body.classList.contains("theme-light");
  applyTheme(isLight);
  try {
    await Api.updateProfile({ theme: isLight ? "light" : "dark" });
    currentUser.theme = isLight ? "light" : "dark";
  } catch (err) { /* non-critical */ }
});

/* ===== Navigation ===== */
document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => switchPage(btn.dataset.page));
});

/* ===== OVERVIEW PAGE ===== */
async function loadOverview() {
  document.getElementById("welcome-message").textContent = `Welcome back, ${currentUser.name}!`;
  try {
    const d = await Api.getDashboard();
    document.getElementById("stat-streak").textContent = `${d.day_streak}d`;
    document.getElementById("stat-habit-score").textContent = d.habit_score.total;
    document.getElementById("stat-sleep").textContent = `${currentUser.sleep_duration_hours}h`;
    document.getElementById("stat-solved").textContent = d.correct_attempts;
    document.getElementById("bell-count").textContent = d.total_attempts;

    renderBreakdown("overview-breakdown-bars", d.habit_score);
    renderRecentAttempts(d.recent_attempts);

    const alarms = await Api.listAlarms();
    const listEl = document.getElementById("overview-alarms-list");
    const active = alarms.filter((a) => a.is_active);
    listEl.innerHTML = active.length
      ? active.slice(0, 5).map((a) => `
        <div class="toggle-row">
          <div><div class="toggle-row-label">${a.time} — ${a.label}</div><div class="toggle-row-sub">${a.repeat_days || "One-time"} · Lock: ${a.challenge_type}</div></div>
          <span class="badge badge-success">Active</span>
        </div>`).join("")
      : `<p class="empty-row">No active alarms.</p>`;
  } catch (err) {
    showToast(err.message, "error");
  }
}

function renderBreakdown(containerId, score) {
  const rows = [
    ["Wake-Up Consistency (35%)", score.wake_up_consistency],
    ["Challenge Completion (25%)", score.challenge_completion_success],
    ["Snooze Reduction (20%)", score.snooze_reduction],
    ["Sleep Schedule Adherence (20%)", score.sleep_schedule_adherence],
  ];
  document.getElementById(containerId).innerHTML = rows.map(([label, value]) => `
    <div class="breakdown-row">
      <span class="bar-label"><span>${label}</span><span>${value}%</span></span>
      <div class="bar-bg"><div class="bar-fill" style="width:${value}%"></div></div>
    </div>`).join("");
}

function renderRecentAttempts(attempts) {
  const tbody = document.getElementById("recent-attempts-body");
  if (!attempts.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-row">No attempts yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = attempts.map((a) => `
    <tr>
      <td style="text-transform:capitalize">${a.type}</td>
      <td style="text-transform:capitalize">${a.difficulty}</td>
      <td>${a.snoozed ? "😴 Snoozed" : a.correct ? "✅ Correct" : "❌ Wrong"}</td>
      <td>${new Date(a.when).toLocaleString()}</td>
    </tr>`).join("");
}

document.getElementById("btn-download-pdf").addEventListener("click", () => downloadReport("pdf"));
document.getElementById("btn-download-csv").addEventListener("click", () => downloadReport("csv"));
document.getElementById("btn-habit-pdf").addEventListener("click", () => downloadReport("pdf"));
document.getElementById("btn-habit-csv").addEventListener("click", () => downloadReport("csv"));
async function downloadReport(type) {
  try {
    if (type === "pdf") await Api.downloadPdf();
    else await Api.downloadCsv();
    showToast(`${type.toUpperCase()} report downloaded`);
  } catch (err) {
    showToast(err.message, "error");
  }
}

/* Feedback stars */
let selectedRating = 5;
document.querySelectorAll("#feedback-stars button").forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedRating = parseInt(btn.dataset.star);
    document.querySelectorAll("#feedback-stars button").forEach((b) => {
      b.classList.toggle("active", parseInt(b.dataset.star) <= selectedRating);
    });
  });
});
document.querySelectorAll("#feedback-stars button").forEach((b) => {
  if (parseInt(b.dataset.star) <= selectedRating) b.classList.add("active");
});
document.getElementById("btn-submit-feedback").addEventListener("click", async () => {
  try {
    await Api.submitFeedback(selectedRating, document.getElementById("feedback-comment").value);
    document.getElementById("feedback-comment").value = "";
    showToast("Thanks for your feedback!");
  } catch (err) {
    showToast(err.message, "error");
  }
});

/* ===== ALARM CENTRE PAGE ===== */
document.getElementById("btn-open-create-alarm").addEventListener("click", () => {
  document.getElementById("alarm-verification-method").value = localStorage.getItem("defaultVerificationMethod") || "puzzle_completion";
  document.getElementById("modal-create-alarm").classList.add("active");
});
document.getElementById("close-create-alarm").addEventListener("click", () => {
  document.getElementById("modal-create-alarm").classList.remove("active");
});

document.getElementById("toggle-alarm-vibration").addEventListener("click", (e) => e.currentTarget.classList.toggle("on"));
document.getElementById("toggle-alarm-gradient").addEventListener("click", (e) => e.currentTarget.classList.toggle("on"));

document.getElementById("btn-preview-alarm-sound").addEventListener("click", () => {
  previewRingtone(document.getElementById("alarm-ringtone").value);
});
document.getElementById("btn-preview-profile-sound").addEventListener("click", () => {
  previewRingtone(document.getElementById("profile-ringtone").value);
});

document.getElementById("form-new-alarm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    label: document.getElementById("alarm-label").value,
    time: document.getElementById("alarm-time").value,
    repeat_days: document.getElementById("alarm-repeat").value,
    challenge_type: document.getElementById("alarm-challenge-type").value,
    difficulty: document.getElementById("alarm-difficulty").value,
    ringtone: document.getElementById("alarm-ringtone").value,
    multi_step_count: parseInt(document.getElementById("alarm-multi-step").value) || 1,
    verification_method: document.getElementById("alarm-verification-method").value,
    vibration_enabled: document.getElementById("toggle-alarm-vibration").classList.contains("on"),
    smart_gradient: document.getElementById("toggle-alarm-gradient").classList.contains("on"),
  };
  try {
    await Api.createAlarm(payload);
    document.getElementById("form-new-alarm").reset();
    document.getElementById("modal-create-alarm").classList.remove("active");
    showToast("Alarm created");
    loadAlarms();
  } catch (err) {
    showToast(err.message, "error");
  }
});

async function loadAlarms() {
  try {
    currentAlarms = await Api.listAlarms();
    const grid = document.getElementById("alarms-grid");
    if (!currentAlarms.length) {
      grid.innerHTML = `<p class="empty-row">No alarms yet — create one above.</p>`;
      return;
    }
    grid.innerHTML = currentAlarms.map((a) => `
      <div class="alarm-card ${a.smart_gradient ? "gradient-on" : ""}" data-id="${a.id}">
        <div class="alarm-card-top">
          <div>
            <div class="alarm-card-title">${a.label}</div>
            <div class="alarm-card-time">${a.time}</div>
            <div class="alarm-card-repeat">${a.repeat_days ? "Repeats: " + a.repeat_days : "Repeat: once"}</div>
          </div>
          <button class="toggle ${a.is_active ? "on" : ""}" data-action="toggle" data-id="${a.id}"><span class="knob"></span></button>
        </div>
        <div class="alarm-lock-tag">🔒 Lock: ${a.challenge_type} · ${a.difficulty} · ${a.multi_step_count} step${a.multi_step_count > 1 ? "s" : ""}</div>
        <div class="alarm-outcome-pills">
          <span class="pill pill-solve">Solve</span>
          <span class="pill pill-snooze">Snooze</span>
          <span class="pill pill-miss">Miss</span>
        </div>
        <div class="alarm-card-actions">
          <button class="btn-ring" data-action="ring" data-id="${a.id}">Simulate Ring</button>
          <button class="btn-danger-outline" data-action="delete" data-id="${a.id}">Delete</button>
        </div>
      </div>`).join("");

    grid.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => handleAlarmAction(btn.dataset.action, parseInt(btn.dataset.id)));
    });
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function handleAlarmAction(action, id) {
  const alarm = currentAlarms.find((a) => a.id === id);
  if (action === "toggle") {
    await Api.toggleAlarm(id);
    loadAlarms();
  } else if (action === "delete") {
    if (confirm("Delete this alarm?")) {
      await Api.deleteAlarm(id);
      loadAlarms();
      showToast("Alarm deleted");
    }
  } else if (action === "ring") {
    openRingModal({
      alarmId: alarm.id, difficulty: alarm.difficulty, challengeType: alarm.challenge_type,
      totalSteps: alarm.multi_step_count, ringtone: alarm.ringtone, method: alarm.verification_method,
    });
  }
}

/* ===== CHALLENGES PAGE ===== */
async function loadChallenges() {
  try {
    const [d, history] = await Promise.all([Api.getDashboard(), Api.challengeHistory()]);
    document.getElementById("chal-total-solved").textContent = d.correct_attempts;
    document.getElementById("chal-total-score").textContent = d.correct_attempts * 10;
    document.getElementById("chal-avg-accuracy").textContent = `${d.accuracy_rate}%`;
    document.getElementById("chal-current-level").textContent = currentUser.difficulty_preference;
    const winRate = d.total_attempts ? Math.round(100 * d.correct_attempts / d.total_attempts) : 0;
    document.getElementById("chal-win-rate").textContent = `${winRate}%`;

    const tbody = document.getElementById("challenge-history-body");
    tbody.innerHTML = history.length
      ? history.map((a) => `
        <tr>
          <td>${new Date(a.created_at).toLocaleString()}</td>
          <td style="text-transform:capitalize">${a.challenge_type}</td>
          <td><span class="badge badge-accent">${a.difficulty}</span></td>
          <td>${a.was_correct ? "✅" : "❌"}</td>
          <td>${a.snoozed ? "😴" : "—"}</td>
          <td><span class="badge ${a.was_correct ? "badge-success" : a.snoozed ? "badge-warning" : "badge-danger"}">${a.was_correct ? "SUCCESS" : a.snoozed ? "SNOOZED" : "FAILED"}</span></td>
        </tr>`).join("")
      : `<tr><td colspan="6" class="empty-row">No history yet — try dismissing an alarm.</td></tr>`;
  } catch (err) {
    showToast(err.message, "error");
  }
}

/* ===== ANALYTICS PAGE ===== */
async function loadAnalytics() {
  try {
    const a = await Api.getAnalytics();
    drawLineChart("chart-accuracy", a.accuracy_trend.map((p) => p.index), a.accuracy_trend.map((p) => p.accuracy_pct), "Accuracy %");
    drawLineChart("chart-difficulty", a.difficulty_progression.map((p) => p.index), a.difficulty_progression.map((p) => p.level), "Difficulty Level (1-5)");
    drawBarChart("chart-types", a.challenge_type_breakdown.map((p) => p.type), a.challenge_type_breakdown.map((p) => p.accuracy_pct), "Accuracy % by Type");
    drawBarChart("chart-snooze", a.snooze_by_weekday.map((p) => p.day), a.snooze_by_weekday.map((p) => p.count), "Snoozes");
    drawDoughnutChart("chart-sleep", a.sleep_duration_breakdown.map((p) => p.label), a.sleep_duration_breakdown.map((p) => p.count));
    drawRadarChart("chart-radar", a.habit_radar.map((p) => p.axis), a.habit_radar.map((p) => p.value));

    const b = a.behavioral_snapshot;
    document.getElementById("bh-snooze-avg").textContent = b.snooze.avg_per_active_day;
    document.getElementById("bh-snooze-extra").textContent = `${b.snooze.zero_snooze_rate_pct}% zero-snooze days · peak: ${b.snooze.peak_snooze_day}`;
    document.getElementById("bh-ontime-rate").textContent = `${b.wake_behavior.on_time_rate_pct}%`;
    document.getElementById("bh-reaction-time").textContent = b.wake_behavior.avg_reaction_seconds ? `avg ${b.wake_behavior.avg_reaction_seconds}s to solve` : "no solves yet";
    document.getElementById("bh-focus-index").textContent = b.focus_index;
    document.getElementById("bh-streak").textContent = `${b.habit_consistency.current_streak_days}d`;
    document.getElementById("bh-weekly-compliance").textContent = `${b.habit_consistency.weekly_compliance_pct}% of last 7 days active`;
    document.getElementById("bh-sleep-target").textContent = `${b.sleep_pattern.target_hours}h @ ${b.sleep_pattern.target_bedtime}`;
  } catch (err) {
    showToast(err.message, "error");
  }
}

function drawRadarChart(canvasId, labels, data) {
  const c = chartColors();
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = document.getElementById(canvasId).getContext("2d");
  charts[canvasId] = new Chart(ctx, {
    type: "radar",
    data: { labels, datasets: [{ label: "Habit Radar", data, backgroundColor: c.accent + "33", borderColor: c.accent, pointBackgroundColor: c.accent }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { color: c.text, backdropColor: "transparent" },
          grid: { color: c.grid },
          angleLines: { color: c.grid },
          pointLabels: { color: c.text, font: { size: 10 } },
        },
      },
    },
  });
}

function chartColors() {
  return { accent: "#14b8a6", accent2: "#f59e0b", grid: "rgba(150,170,165,0.15)", text: "#8fa39e" };
}

function drawLineChart(canvasId, labels, data, label) {
  const c = chartColors();
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = document.getElementById(canvasId).getContext("2d");
  charts[canvasId] = new Chart(ctx, {
    type: "line",
    data: { labels, datasets: [{ label, data, borderColor: c.accent, backgroundColor: c.accent + "33", tension: 0.35, fill: true, pointRadius: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: c.text } } },
      scales: {
        x: { ticks: { color: c.text }, grid: { color: c.grid } },
        y: { ticks: { color: c.text }, grid: { color: c.grid } },
      },
    },
  });
}

function drawBarChart(canvasId, labels, data, label) {
  const c = chartColors();
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = document.getElementById(canvasId).getContext("2d");
  charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label, data, backgroundColor: c.accent2 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: c.text } } },
      scales: {
        x: { ticks: { color: c.text }, grid: { color: c.grid } },
        y: { ticks: { color: c.text }, grid: { color: c.grid }, beginAtZero: true },
      },
    },
  });
}

function drawDoughnutChart(canvasId, labels, data) {
  const c = chartColors();
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = document.getElementById(canvasId).getContext("2d");
  const palette = ["#f87171", "#fbbf24", "#14b8a6", "#7c5cff"];
  charts[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: palette, borderColor: "transparent" }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { color: c.text, boxWidth: 12, font: { size: 10.5 } } } },
    },
  });
}

/* ===== HABIT & VERIFICATION PAGE ===== */
async function loadHabit() {
  try {
    const d = await Api.getDashboard();
    const s = d.habit_score;
    document.getElementById("habit-overall").textContent = `${s.total}/100`;
    document.getElementById("habit-grade").textContent = habitGrade(s.total);
    document.getElementById("habit-wake").textContent = `${s.wake_up_consistency}%`;
    document.getElementById("habit-challenge").textContent = `${s.challenge_completion_success}%`;
    document.getElementById("habit-snooze").textContent = `${s.snooze_reduction}%`;
    document.getElementById("habit-adherence-bar").innerHTML = `
      <div class="breakdown-row">
        <span class="bar-label"><span>Sleep Schedule Adherence</span><span>${s.sleep_schedule_adherence}%</span></span>
        <div class="bar-bg"><div class="bar-fill" style="width:${s.sleep_schedule_adherence}%"></div></div>
      </div>`;
  } catch (err) {
    showToast(err.message, "error");
  }

  selectMethodBtn(localStorage.getItem("defaultVerificationMethod") || "puzzle_completion");
  try {
    const last = await Api.latestCheckin();
    document.getElementById("checkin-last").textContent = last.alertness_rating
      ? `Last check-in: ${last.alertness_rating}/10${last.notes ? " — " + last.notes : ""} (${new Date(last.created_at).toLocaleString()})`
      : "No check-ins logged yet.";
  } catch (err) { /* non-critical */ }
}

function habitGrade(total) {
  if (total >= 90) return "A+";
  if (total >= 80) return "A";
  if (total >= 65) return "B";
  if (total >= 50) return "C";
  if (total >= 30) return "D";
  return "F";
}

function selectMethodBtn(method) {
  document.querySelectorAll(".method-btn").forEach((b) => b.classList.toggle("selected", b.dataset.method === method));
}
document.querySelectorAll(".method-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    localStorage.setItem("defaultVerificationMethod", btn.dataset.method);
    selectMethodBtn(btn.dataset.method);
    showToast(`Default verification method set to "${btn.textContent.trim().split("\n")[0]}" for new alarms.`);
  });
});

document.getElementById("checkin-rating").addEventListener("input", (e) => {
  document.getElementById("checkin-rating-label").textContent = e.target.value;
});
document.getElementById("btn-submit-checkin").addEventListener("click", async () => {
  try {
    const rating = parseInt(document.getElementById("checkin-rating").value);
    const notes = document.getElementById("checkin-notes").value;
    await Api.submitCheckin(rating, notes);
    document.getElementById("checkin-notes").value = "";
    showToast("Check-in logged");
    loadHabit();
  } catch (err) {
    showToast(err.message, "error");
  }
});

document.getElementById("btn-recalculate-score").addEventListener("click", async () => {
  await loadHabit();
  showToast("Score recalculated");
});
document.getElementById("btn-test-verification").addEventListener("click", () => {
  openRingModal({
    alarmId: null, difficulty: currentUser.difficulty_preference, challengeType: currentUser.challenge_type_preference,
    totalSteps: 1, ringtone: currentUser.ringtone,
  });
});

/* ===== AI PERSONALIZATION PAGE ===== */
let latestPersonalization = null;
async function loadAi() {
  try {
    const p = await Api.getPersonalization();
    latestPersonalization = p;
    document.getElementById("ai-snooze-risk").textContent = `${p.snooze_risk_percent}%`;
    document.getElementById("ai-bedtime").textContent = p.optimal_bedtime;
    document.getElementById("ai-best-type").textContent = p.best_challenge_type;
    document.getElementById("ai-habit-score").textContent = p.habit_score;

    document.getElementById("ai-insights-list").innerHTML = p.insights.length
      ? p.insights.map((i) => `<div class="insight-item">💡 ${i}</div>`).join("")
      : `<p class="empty-row">Not enough data yet.</p>`;
    document.getElementById("ai-risks-list").innerHTML = p.risk_factors.length
      ? p.risk_factors.map((r) => `<div class="risk-item">⚠️ ${r}</div>`).join("")
      : `<p class="empty-row">No risk factors detected.</p>`;

    const medals = ["🥇", "🥈", "🥉"];
    document.getElementById("ai-rankings").innerHTML = p.challenge_rankings.length
      ? p.challenge_rankings.map((r, i) => `
        <div class="ranking-row">
          <div class="ranking-row-label">
            <span style="text-transform:capitalize">${medals[i] || `#${i + 1}`} ${r.type}</span>
            <span>${r.accuracy_pct}% · avg ${r.avg_time}s · ${r.attempts} attempts</span>
          </div>
          <div class="ranking-bar-bg"><div class="ranking-bar-fill" style="width:${r.accuracy_pct}%"></div></div>
        </div>`).join("")
      : `<p class="empty-row">Complete a few challenges to see rankings.</p>`;

    const DIFF_ORDER = ["beginner", "easy", "medium", "hard", "expert"];
    const fillPct = ((p.current_difficulty_index + 1) / DIFF_ORDER.length) * 100;
    document.getElementById("ai-difficulty-fill").style.width = `${fillPct}%`;
    document.getElementById("ai-difficulty-note").textContent =
      p.recommended_difficulty !== currentUser.difficulty_preference
        ? `Recommendation: move to ${p.recommended_difficulty} (currently ${currentUser.difficulty_preference}). Click "Apply Recommendation" above.`
        : `You're at the recommended level (${currentUser.difficulty_preference}) based on your recent accuracy.`;

    document.getElementById("ai-trajectory").textContent = p.learning_trajectory;
    document.getElementById("ai-speed-gain").textContent =
      p.speed_gain_percent === 0 ? "—" : `${p.speed_gain_percent > 0 ? "+" : ""}${p.speed_gain_percent}%`;
    document.getElementById("ai-retention").textContent = `${p.retention_index}/100`;
    document.getElementById("ai-cognitive-speed").textContent = p.cognitive_speed_label;
    document.getElementById("ai-mastery-score").textContent = `${p.mastery_score}/100`;

    document.getElementById("ai-current-waketime").textContent = currentUser.preferred_wake_time;
    document.getElementById("ai-current-sleepgoal").textContent = `${currentUser.sleep_duration_hours} hrs`;
    document.getElementById("ai-current-challenge").textContent = currentUser.challenge_type_preference;
    document.getElementById("ai-current-difficulty").textContent = currentUser.difficulty_preference;
  } catch (err) {
    showToast(err.message, "error");
  }
}

document.getElementById("btn-refresh-ai").addEventListener("click", async () => {
  await loadAi();
  showToast("Analysis refreshed");
});

document.getElementById("btn-test-bedtime").addEventListener("click", () => {
  showToast(`🌙 Preview: "Wind-down time! Aim to be in bed by ${latestPersonalization?.optimal_bedtime || "22:30"} for your ${currentUser.sleep_duration_hours}h sleep goal."`);
});
document.getElementById("btn-test-habit").addEventListener("click", () => {
  showToast(`🔥 Preview: "Don't break your streak — you're at ${latestPersonalization?.habit_score ?? "—"}/100. One more solved alarm today keeps it alive."`);
});
document.getElementById("btn-test-progress").addEventListener("click", () => {
  showToast(`📊 Preview: "Weekly digest: check the Challenges page for your full solved/score/accuracy summary."`);
});

document.getElementById("btn-submit-ai-feedback").addEventListener("click", async () => {
  const comment = document.getElementById("ai-feedback-comment").value.trim();
  if (!comment) {
    showToast("Add a comment first.", "error");
    return;
  }
  try {
    await Api.submitFeedback(5, `[AI Personalization] ${comment}`);
    document.getElementById("ai-feedback-comment").value = "";
    showToast("Thanks — this helps improve the recommendation logic.");
  } catch (err) {
    showToast(err.message, "error");
  }
});
document.getElementById("btn-apply-recommendation").addEventListener("click", async () => {
  if (!latestPersonalization) return;
  try {
    await Api.updateProfile({
      difficulty_preference: latestPersonalization.recommended_difficulty,
      challenge_type_preference: latestPersonalization.best_challenge_type,
    });
    currentUser.difficulty_preference = latestPersonalization.recommended_difficulty;
    currentUser.challenge_type_preference = latestPersonalization.best_challenge_type;
    showToast("Recommendation applied to your profile");
  } catch (err) {
    showToast(err.message, "error");
  }
});

/* ===== ADMIN PANEL ===== */
async function loadAdmin() {
  try {
    const users = await Api.adminListUsers();
    document.getElementById("admin-users-body").innerHTML = users.map((u) => `
      <tr>
        <td>${u.name}</td><td>${u.email}</td>
        <td><span class="badge badge-accent">${u.role.replace("_", " ")}</span></td>
        <td>${u.habit_score}</td><td>${u.total_alarms}</td><td>${u.total_attempts}</td>
      </tr>`).join("");
  } catch (err) {
    document.getElementById("admin-users-body").innerHTML = `<tr><td colspan="6" class="empty-row">${err.message}</td></tr>`;
  }
}

/* ===== PROFILE SETTINGS PAGE ===== */
function renderAvatarPicker(selected) {
  document.getElementById("avatar-picker").innerHTML = AVATAR_OPTIONS.map((emoji) => `
    <button type="button" class="avatar-option ${emoji === selected ? "selected" : ""}" data-emoji="${emoji}">${emoji}</button>
  `).join("");
  document.querySelectorAll(".avatar-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".avatar-option").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });
}

async function loadProfile() {
  try {
    const me = await Api.me();
    currentUser = me;
    document.getElementById("profile-name").value = me.name;
    document.getElementById("profile-phone").value = me.phone || "";
    document.getElementById("profile-wake-time").value = me.preferred_wake_time || "07:00";
    document.getElementById("profile-sleep-time").value = me.target_sleep_time || "22:30";
    document.getElementById("profile-sleep-duration").value = me.sleep_duration_hours || 8;
    document.getElementById("profile-challenge-type").value = me.challenge_type_preference || "math";
    document.getElementById("profile-difficulty").value = me.difficulty_preference || "easy";
    document.getElementById("profile-snooze-duration").value = me.snooze_duration_minutes || 5;
    document.getElementById("profile-max-snoozes").value = me.max_snoozes ?? 3;
    document.getElementById("profile-ringtone").value = me.ringtone || "classic_bell";
    document.getElementById("toggle-vibration").classList.toggle("on", !!me.vibration_enabled);
    document.getElementById("toggle-gradual-volume").classList.toggle("on", !!me.gradual_volume);
    renderAvatarPicker(me.avatar_emoji || "⏰");
  } catch (err) {
    showToast(err.message, "error");
  }
}

document.getElementById("toggle-vibration").addEventListener("click", (e) => e.currentTarget.classList.toggle("on"));
document.getElementById("toggle-gradual-volume").addEventListener("click", (e) => e.currentTarget.classList.toggle("on"));

document.getElementById("form-profile").addEventListener("submit", async (e) => {
  e.preventDefault();
  const successEl = document.getElementById("profile-success");
  const selectedAvatar = document.querySelector(".avatar-option.selected");
  try {
    const updated = await Api.updateProfile({
      phone: document.getElementById("profile-phone").value,
      preferred_wake_time: document.getElementById("profile-wake-time").value,
      target_sleep_time: document.getElementById("profile-sleep-time").value,
      sleep_duration_hours: parseFloat(document.getElementById("profile-sleep-duration").value),
      challenge_type_preference: document.getElementById("profile-challenge-type").value,
      difficulty_preference: document.getElementById("profile-difficulty").value,
      snooze_duration_minutes: parseInt(document.getElementById("profile-snooze-duration").value),
      max_snoozes: parseInt(document.getElementById("profile-max-snoozes").value),
      ringtone: document.getElementById("profile-ringtone").value,
      vibration_enabled: document.getElementById("toggle-vibration").classList.contains("on"),
      gradual_volume: document.getElementById("toggle-gradual-volume").classList.contains("on"),
      avatar_emoji: selectedAvatar ? selectedAvatar.dataset.emoji : "⏰",
    });
    currentUser = updated;
    document.getElementById("sidebar-avatar").textContent = updated.avatar_emoji;
    successEl.textContent = "Saved!";
    setTimeout(() => (successEl.textContent = ""), 2000);
  } catch (err) {
    showToast(err.message, "error");
  }
});

/* ===== RING / VERIFICATION MODAL ===== */
const HINTS = {
  math: "Follow order of operations: multiply/divide before add/subtract.",
  logic: "Look for a constant difference (or ratio) between the numbers.",
  memory: "Try grouping the digits into pairs to memorize them faster.",
  riddle: "Think literally — the answer is usually an everyday object.",
};

function openRingModal({ alarmId, difficulty, challengeType, totalSteps, ringtone, method }) {
  const resolvedMethod = method || "puzzle_completion";
  // Method shapes the actual step count: puzzle_completion & timed_blitz are
  // always 1 step; multi_step & consecutive_streak use the alarm's configured count.
  const resolvedSteps = (resolvedMethod === "puzzle_completion" || resolvedMethod === "timed_blitz") ? 1 : (totalSteps || 1);
  ring = {
    alarmId, difficulty, challengeType, totalSteps: resolvedSteps,
    currentStep: 1, failedCount: 0, score: 0, snoozesUsed: 0, muted: false,
    timerInterval: null, secondsLeft: 60, challengeId: null,
    ringtone: ringtone || "classic_bell", method: resolvedMethod,
  };
  document.getElementById("challenge-difficulty-label").textContent = difficulty;
  document.getElementById("ring-failed").textContent = "0";
  document.getElementById("ring-score").textContent = "--";
  document.getElementById("challenge-error").textContent = "";
  document.getElementById("btn-snooze").classList.remove("locked");
  document.getElementById("btn-snooze").disabled = false;
  document.getElementById("btn-snooze").textContent = "😴 Snooze";
  document.getElementById("btn-mute-audio").textContent = "🔊 Mute Audio";
  updateStepLabel();
  document.getElementById("modal-challenge").classList.add("active");
  startRingTimer();
  startRingtoneLoop(ring.ringtone);
  fetchNewRingChallenge();
}

const METHOD_LABELS = {
  puzzle_completion: "Puzzle Completion",
  multi_step: "Multi-Step",
  consecutive_streak: "Consecutive Streak",
  timed_blitz: "Timed Blitz",
};

function updateStepLabel() {
  const label = METHOD_LABELS[ring.method] || "Verification";
  document.getElementById("ring-step-label").textContent = `${label} — Step ${ring.currentStep}/${ring.totalSteps}`;
}

function startRingTimer() {
  clearInterval(ring.timerInterval);
  const duration = ring.method === "timed_blitz" ? 20 : 60;
  ring.secondsLeft = duration;
  document.getElementById("ring-timer").textContent = `${ring.secondsLeft}s`;
  ring.timerInterval = setInterval(() => {
    ring.secondsLeft -= 1;
    document.getElementById("ring-timer").textContent = `${Math.max(0, ring.secondsLeft)}s`;
    if (ring.secondsLeft <= 0) {
      ring.failedCount += 1;
      document.getElementById("ring-failed").textContent = ring.failedCount;
      if (ring.method === "consecutive_streak") {
        ring.currentStep = 1;
        updateStepLabel();
        showToast("Time's up — streak reset to step 1", "error");
      } else {
        showToast("Time's up — new challenge", "error");
      }
      ring.secondsLeft = duration;
      fetchNewRingChallenge();
    }
  }, 1000);
}

function stopRingTimer() {
  clearInterval(ring.timerInterval);
}

async function fetchNewRingChallenge() {
  document.getElementById("challenge-prompt").textContent = "Loading challenge…";
  try {
    const q = await Api.newChallenge(ring.difficulty, ring.challengeType);
    ring.challengeId = q.challenge_id;
    document.getElementById("challenge-type-label").textContent = q.challenge_type;
    document.getElementById("challenge-prompt").textContent = q.prompt;
    document.getElementById("challenge-answer").value = "";
    document.getElementById("challenge-answer").focus();
  } catch (err) {
    document.getElementById("challenge-prompt").textContent = "Could not load challenge.";
    showToast(err.message, "error");
  }
}

document.getElementById("btn-show-hint").addEventListener("click", () => {
  showToast(`Hint: ${HINTS[ring.challengeType] || "Take your time and read carefully."}`);
});

document.getElementById("btn-submit-challenge").addEventListener("click", async () => {
  const answer = document.getElementById("challenge-answer").value;
  const errorEl = document.getElementById("challenge-error");
  if (!answer.trim()) {
    errorEl.textContent = "Type an answer first.";
    return;
  }
  try {
    const result = await Api.submitChallenge({
      challenge_id: ring.challengeId,
      alarm_id: ring.alarmId,
      challenge_type: ring.challengeType,
      difficulty: ring.difficulty,
      answer,
      correct_answer: "",
      response_time_seconds: 60 - ring.secondsLeft,
    });
    if (result.correct) {
      ring.score += 10;
      document.getElementById("ring-score").textContent = ring.score;
      if (ring.currentStep < ring.totalSteps) {
        ring.currentStep += 1;
        updateStepLabel();
        errorEl.textContent = "";
        showToast(`Step ${ring.currentStep - 1} correct — next step!`);
        fetchNewRingChallenge();
      } else {
        stopRingTimer();
        stopRingtoneLoop();
        document.getElementById("modal-challenge").classList.remove("active");
        showToast(`✅ Alarm dismissed! Final score: ${ring.score}. Habit score: ${result.new_habit_score}`);
        refreshCurrentPageData();
      }
    } else {
      ring.failedCount += 1;
      document.getElementById("ring-failed").textContent = ring.failedCount;
      errorEl.textContent = result.message;
      fetchNewRingChallenge();
    }
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById("btn-mute-audio").addEventListener("click", (e) => {
  ring.muted = !ring.muted;
  e.currentTarget.textContent = ring.muted ? "🔇 Unmute Audio" : "🔊 Mute Audio";
});

document.getElementById("btn-snooze").addEventListener("click", async () => {
  const maxSnoozes = currentUser.max_snoozes ?? 3;
  if (ring.snoozesUsed >= maxSnoozes) return;
  try {
    await Api.snoozeAlarm(ring.alarmId, ring.challengeType, ring.difficulty);
    ring.snoozesUsed += 1;
    if (ring.snoozesUsed >= maxSnoozes) {
      document.getElementById("btn-snooze").classList.add("locked");
      document.getElementById("btn-snooze").textContent = "Snooze Locked";
      document.getElementById("btn-snooze").disabled = true;
    }
    stopRingTimer();
    stopRingtoneLoop();
    document.getElementById("modal-challenge").classList.remove("active");
    showToast(`Snoozed (${ring.snoozesUsed}/${maxSnoozes} used) — this counts against your habit score.`, "error");
    refreshCurrentPageData();
  } catch (err) {
    showToast(err.message, "error");
  }
});

function refreshCurrentPageData() {
  const activePage = document.querySelector(".page.active");
  if (!activePage) return;
  const id = activePage.id.replace("page-", "");
  switchPage(id);
}

/* ===== Boot ===== */
(async function boot() {
  const token = getToken();
  if (!token) {
    switchView("view-landing");
    return;
  }
  try {
    currentUser = await Api.me();
    enterApp();
  } catch (err) {
    clearToken();
    switchView("view-landing");
  }
})();
