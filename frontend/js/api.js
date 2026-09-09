/* Small fetch wrapper around the FastAPI backend. */
const API_BASE = "/api";

function getToken() {
  return localStorage.getItem("token");
}
function setToken(token) {
  localStorage.setItem("token", token);
}
function clearToken() {
  localStorage.removeItem("token");
}

async function apiRequest(path, { method = "GET", body = null, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const message = (data && data.detail) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

/* Downloads a file that requires an Authorization header (plain <a href>
   can't send headers, so we fetch as a blob and trigger the download). */
async function apiDownload(path, filename) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

const Api = {
  register: (name, email, password, role) =>
    apiRequest("/auth/register", { method: "POST", body: { name, email, password, role }, auth: false }),
  login: (email, password) =>
    apiRequest("/auth/login", { method: "POST", body: { email, password }, auth: false }),
  demoLogin: (role) =>
    apiRequest("/auth/demo-login", { method: "POST", body: { role }, auth: false }),
  me: () => apiRequest("/auth/me"),
  updateProfile: (payload) => apiRequest("/auth/me", { method: "PUT", body: payload }),

  listAlarms: () => apiRequest("/alarms"),
  createAlarm: (payload) => apiRequest("/alarms", { method: "POST", body: payload }),
  toggleAlarm: (id) => apiRequest(`/alarms/${id}/toggle`, { method: "PATCH" }),
  deleteAlarm: (id) => apiRequest(`/alarms/${id}`, { method: "DELETE" }),

  newChallenge: (difficulty, challengeType) =>
    apiRequest(`/challenges/new?difficulty=${difficulty}${challengeType ? `&challenge_type=${challengeType}` : ""}`),
  submitChallenge: (payload) => apiRequest("/challenges/submit", { method: "POST", body: payload }),
  snoozeAlarm: (alarmId, challengeType, difficulty) => {
    const alarmParam = (alarmId !== null && alarmId !== undefined) ? `&alarm_id=${alarmId}` : "";
    return apiRequest(`/challenges/snooze?challenge_type=${challengeType}&difficulty=${difficulty}${alarmParam}`, { method: "POST" });
  },
  challengeHistory: () => apiRequest("/challenges/history?limit=50"),

  getDashboard: () => apiRequest("/dashboard"),
  getAnalytics: () => apiRequest("/analytics"),
  getPersonalization: () => apiRequest("/personalization"),

  adminListUsers: () => apiRequest("/admin/users"),
  submitFeedback: (rating, comment) => apiRequest("/feedback", { method: "POST", body: { rating, comment } }),

  downloadPdf: () => apiDownload("/reports/pdf", "cognitive_alarm_report.pdf"),
  downloadCsv: () => apiDownload("/reports/csv", "cognitive_alarm_report.csv"),

  submitCheckin: (alertness_rating, notes) => apiRequest("/checkin", { method: "POST", body: { alertness_rating, notes } }),
  latestCheckin: () => apiRequest("/checkin/latest"),
};
