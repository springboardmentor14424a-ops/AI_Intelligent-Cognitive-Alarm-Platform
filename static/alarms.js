const token = localStorage.getItem("access_token");

const $ = id => document.getElementById(id);

const headers = {
  Authorization: `Bearer ${token}`
};

const msg = text => {
  $("message").textContent = text;
};

const difficultyNames = {
  beginner: "Beginner",
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
  expert: "Expert"
};

async function load() {
  if (!token) {
    return location.replace("/");
  }

  const response = await fetch("/alarms", { headers });

  if (!response.ok) {
    return location.replace("/");
  }

  const alarms = await response.json();

  $("alarm-list").innerHTML =
    "<h2>Your scheduled alarms</h2>" +
    (
      alarms.length
        ? alarms.map(alarm => `
          <p>
            <strong>${escapeHtml(alarm.alarm_time)}</strong>
            — ${escapeHtml(alarm.title)}
            (${escapeHtml(alarm.alarm_type.replaceAll("_", " "))})
            — Difficulty:
            <strong>${escapeHtml(
              difficultyNames[alarm.difficulty_level] || alarm.difficulty_level
            )}</strong>

            <button onclick="dismiss(${alarm.id})">Dismiss</button>
            <button onclick="removeAlarm(${alarm.id})">Delete</button>
          </p>
        `).join("")
        : "<p>No alarms scheduled yet.</p>"
    );
}

async function loadRecommendedDifficulty() {
  const response = await fetch("/adaptive/difficulty", { headers });

  if (!response.ok) {
    return;
  }

  const data = await response.json();

  if (data.recommended_difficulty) {
    $("difficulty_level").value = data.recommended_difficulty;

    $("adaptive-info").textContent =
      `Recommended difficulty: ${difficultyNames[data.recommended_difficulty]}. ` +
      `Based on ${data.recent_attempts} recent completed challenge(s)` +
      (
        data.recent_accuracy_percent !== null
          ? ` with ${data.recent_accuracy_percent}% accuracy.`
          : "."
      );
  }
}

$("alarm_type").addEventListener("change", async event => {
  if (event.target.value === "smart_adaptive") {
    await loadRecommendedDifficulty();
  } else {
    $("adaptive-info").textContent =
      "Choose the difficulty level that should be used for this alarm.";
  }
});

$("alarm-form").onsubmit = async event => {
  event.preventDefault();

  const payload = {
    title: $("title").value.trim(),
    alarm_time: $("alarm_time").value,
    alarm_type: $("alarm_type").value,
    difficulty_level: $("difficulty_level").value
  };

  const response = await fetch("/alarms", {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let detail = "Unable to create alarm.";

    try {
      const data = await response.json();
      if (data.detail) {
        detail = Array.isArray(data.detail)
          ? data.detail.map(item => item.msg).join(", ")
          : data.detail;
      }
    } catch (_) {}

    return msg(detail);
  }

  event.target.reset();
  $("difficulty_level").value = "medium";
  $("adaptive-info").textContent =
    "Smart adaptive can use your recent challenge performance to recommend a difficulty.";

  msg("Alarm created.");
  load();
};

async function dismiss(id) {
  const response = await fetch(`/alarms/${id}/dismiss`, {
    method: "PATCH",
    headers
  });

  msg(response.ok ? "Alarm dismissed." : "Unable to dismiss alarm.");
  load();
}

async function removeAlarm(id) {
  const response = await fetch(`/alarms/${id}`, {
    method: "DELETE",
    headers
  });

  msg(response.ok ? "Alarm deleted." : "Unable to delete alarm.");
  load();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

load();
