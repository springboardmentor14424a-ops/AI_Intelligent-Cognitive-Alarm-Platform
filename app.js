// Get DOM elements
const pageLogin = document.getElementById("page-login");
const pageApp = document.getElementById("page-app");
const loginForm = document.getElementById("login-form");
const roleSelect = document.getElementById("role-select");
const nameInput = document.getElementById("name-input");
const emailInput = document.getElementById("email-input");
const passwordInput = document.getElementById("password-input");
const errorMessage = document.getElementById("error-message");
const userTag = document.getElementById("user-tag");

const viewUser = document.getElementById("view-user");
const viewCoach = document.getElementById("view-coach");
const viewAdmin = document.getElementById("view-admin");

// Clear input fields when selected role changes
roleSelect.addEventListener("change", function () {
  nameInput.value = "";
  emailInput.value = "";
  passwordInput.value = "";
  errorMessage.textContent = "";
});

// Function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Function to validate password rules
function isValidPassword(password) {
  if (password.length <= 7) {
    return "Password length must be greater than 7 characters.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least 1 uppercase letter (A-Z).";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least 1 lowercase letter (a-z).";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least 1 number (0-9).";
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return "Password must contain at least 1 special character (e.g. @, #, $, %).";
  }
  return true;
}

// Handle Login Form Submission
loginForm.addEventListener("submit", function (event) {
  event.preventDefault(); // Stop page reload
  errorMessage.textContent = ""; // Clear previous error

  const role = roleSelect.value;
  const userName = nameInput.value.trim();
  const userEmail = emailInput.value.trim();
  const userPassword = passwordInput.value;

  // 1. Validate Full Name
  if (userName === "") {
    errorMessage.textContent = "Please enter your full name.";
    return;
  }

  // 2. Validate Email
  if (!isValidEmail(userEmail)) {
    errorMessage.textContent = "Please enter a valid email address.";
    return;
  }

  // 3. Validate Password
  const passwordResult = isValidPassword(userPassword);
  if (passwordResult !== true) {
    errorMessage.textContent = passwordResult;
    return;
  }

  // If all validation passes: Hide Login Page and Show App Page
  pageLogin.style.display = "none";
  pageApp.style.display = "block";

  // Hide all 3 dashboard views first
  viewUser.style.display = "none";
  viewCoach.style.display = "none";
  viewAdmin.style.display = "none";

  // Show only the selected role's dashboard and display entered user name
  if (role === "User") {
    viewUser.style.display = "block";
    userTag.textContent = "Logged in as: User (" + userName + ")";
  } else if (role === "Wellness Coach") {
    viewCoach.style.display = "block";
    userTag.textContent = "Logged in as: Wellness Coach (" + userName + ")";
  } else if (role === "Administrator") {
    viewAdmin.style.display = "block";
    userTag.textContent = "Logged in as: Administrator (" + userName + ")";
  }
});

// Handle Logout Button Click
function logout() {
  nameInput.value = "";
  emailInput.value = "";
  passwordInput.value = "";
  errorMessage.textContent = "";

  pageApp.style.display = "none";
  pageLogin.style.display = "flex";
}

// Function to send coach guidance
function sendGuidance() {
  const input = document.getElementById("guidance-input");
  const msg = document.getElementById("guidance-msg");

  if (input.value.trim() !== "") {
    msg.textContent = "Guidance note sent successfully to Marcus Vance!";
    input.value = "";
  } else {
    msg.textContent = "Please type a guidance note before sending.";
  }
}

// Function to simulate exporting reports
function exportReport(reportName) {
  const msg = document.getElementById("report-msg");
  msg.textContent = "Exporting " + reportName + "... Download complete.";
}