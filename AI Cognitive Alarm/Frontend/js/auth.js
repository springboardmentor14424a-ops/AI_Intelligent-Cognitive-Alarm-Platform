// Check if user is logged in
const token = localStorage.getItem("token");

if (!token) {
    alert("Please login first.");
    window.location = "login.html";
}

function logout() {
    localStorage.removeItem("token");
    alert("Logged out successfully.");
    window.location = "login.html";
}