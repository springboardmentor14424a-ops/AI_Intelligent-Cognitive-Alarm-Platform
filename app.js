const pageAuth = document.getElementById("page-auth");
const pageApp = document.getElementById("page-app");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const profileForm = document.getElementById("profile-form");
const authMessage = document.getElementById("auth-message");
const profileMessage = document.getElementById("profile-message");
const userTag = document.getElementById("user-tag");
const showLoginBtn = document.getElementById("show-login-btn");
const showRegisterBtn = document.getElementById("show-register-btn");
const googleBtn = document.getElementById("google-btn");
const viewUser = document.getElementById("view-user");
const viewCoach = document.getElementById("view-coach");
const viewAdmin = document.getElementById("view-admin");
const profileNameInput = document.getElementById("profile-name");
const profileEmailInput = document.getElementById("profile-email");

let currentUser = null;
let currentToken = null;

function showMessage(element, message, type = "info") {
  element.textContent = message;
  element.className = `message ${type}`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function showAuthView() {
  pageAuth.style.display = "flex";
  pageApp.style.display = "none";
}

function showAppView() {
  pageAuth.style.display = "none";
  pageApp.style.display = "block";
}

function finalizeGoogleAuth(token) {
  if (!token) {
    showMessage(authMessage, "Google sign-in was cancelled or failed.", "error");
    return;
  }

  currentToken = token;
  const payload = JSON.parse(atob(token.split('.')[1]));
  currentUser = {
    id: payload.id,
    name: payload.name || payload.email.split('@')[0],
    email: payload.email,
    role: payload.role || 'USER',
    provider: 'GOOGLE'
  };
  localStorage.setItem("authToken", token);
  renderDashboard();
  showAppView();
  showMessage(authMessage, "Google sign-in successful.", "success");
}

function setActiveTab(activeTab) {
  const loginSection = document.getElementById("login-section");
  const registerSection = document.getElementById("register-section");

  showLoginBtn.classList.toggle("active", activeTab === "login");
  showRegisterBtn.classList.toggle("active", activeTab === "register");
  loginSection.classList.toggle("hidden", activeTab !== "login");
  registerSection.classList.toggle("hidden", activeTab !== "register");
}

function renderDashboard() {
  const roleLabel = currentUser.role === "WELLNESS_COACH"
    ? "Wellness Coach"
    : currentUser.role === "ADMIN"
      ? "Administrator"
      : "User";

  userTag.textContent = `Logged in as ${roleLabel} (${currentUser.name})`;
  profileNameInput.value = currentUser.name;
  profileEmailInput.value = currentUser.email;

  viewUser.style.display = currentUser.role === "USER" ? "block" : "none";
  viewCoach.style.display = currentUser.role === "WELLNESS_COACH" ? "block" : "none";
  viewAdmin.style.display = currentUser.role === "ADMIN" ? "block" : "none";
}

async function requestJson(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const response = await fetch(path, { ...options, headers });
  const text = await response.text();
  let payload = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch (error) {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || text || "Request failed");
  }

  return payload;
}

async function restoreSession() {
  const token = localStorage.getItem("authToken");
  if (!token) {
    showAuthView();
    return;
  }

  try {
    const data = await requestJson("/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` }
    });
    currentToken = token;
    currentUser = data.user;
    renderDashboard();
    showAppView();
  } catch (error) {
    localStorage.removeItem("authToken");
    showAuthView();
    showMessage(authMessage, error.message, "error");
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!isValidEmail(email)) {
    showMessage(authMessage, "Please enter a valid email address.", "error");
    return;
  }

  try {
    const data = await requestJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    currentToken = data.token;
    currentUser = data.user;
    localStorage.setItem("authToken", data.token);
    renderDashboard();
    showAppView();
    showMessage(authMessage, "Login successful.", "success");
  } catch (error) {
    showMessage(authMessage, error.message, "error");
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;
  const role = document.getElementById("register-role").value;

  if (!isValidEmail(email)) {
    showMessage(authMessage, "Please enter a valid email address.", "error");
    return;
  }

  try {
    const data = await requestJson("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, role })
    });

    currentToken = data.token;
    currentUser = data.user;
    localStorage.setItem("authToken", data.token);
    renderDashboard();
    showAppView();
    showMessage(authMessage, "Registration successful. Welcome aboard.", "success");
  } catch (error) {
    showMessage(authMessage, error.message, "error");
  }
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentToken) {
    showMessage(profileMessage, "Please sign in first.", "error");
    return;
  }

  try {
    const data = await requestJson("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify({
        name: profileNameInput.value.trim(),
        email: profileEmailInput.value.trim()
      }),
      headers: {
        Authorization: `Bearer ${currentToken}`
      }
    });

    currentUser = data.user;
    renderDashboard();
    showMessage(profileMessage, "Profile updated successfully.", "success");
  } catch (error) {
    showMessage(profileMessage, error.message, "error");
  }
});

googleBtn.addEventListener("click", async () => {
  try {
    const data = await requestJson("/api/auth/google/start");
    if (!data.authUrl) {
      throw new Error("Google OAuth did not return an authorization URL.");
    }
    window.location.href = data.authUrl;
  } catch (error) {
    showMessage(authMessage, error.message, "error");
  }
});

showLoginBtn.addEventListener("click", () => setActiveTab("login"));
showRegisterBtn.addEventListener("click", () => setActiveTab("register"));

window.logout = function () {
  currentToken = null;
  currentUser = null;
  localStorage.removeItem("authToken");
  loginForm.reset();
  registerForm.reset();
  profileForm.reset();
  showMessage(authMessage, "You have been logged out.", "info");
  showAuthView();
};

function sendGuidance() {
  const input = document.getElementById("guidance-input");
  const msg = document.getElementById("guidance-msg");

  if (input.value.trim() !== "") {
    msg.textContent = "Guidance note sent successfully to Marcus Vance.";
    input.value = "";
  } else {
    msg.textContent = "Please type a guidance note before sending.";
  }
}

function exportReport(reportName) {
  const msg = document.getElementById("report-msg");
  msg.textContent = `Exporting ${reportName}... Download complete.`;
}

setActiveTab("login");
const urlParams = new URLSearchParams(window.location.search);
const googleStatus = urlParams.get("google");
const googleToken = urlParams.get("token");
const googleError = urlParams.get("error");

if (googleStatus === "success" && googleToken) {
  finalizeGoogleAuth(googleToken);
  window.history.replaceState({}, document.title, window.location.pathname);
} else if (googleStatus === "cancelled" || googleStatus === "error" || googleStatus === "invalid") {
  const errorDetails = googleError ? ` (${decodeURIComponent(googleError)})` : '';
  showMessage(authMessage, `Google sign-in was cancelled or failed${errorDetails}.`, "error");
  window.history.replaceState({}, document.title, window.location.pathname);
} else {
  restoreSession();
}
