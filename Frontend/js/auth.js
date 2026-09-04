// Check if user is logged in
const token = localStorage.getItem("token");

if (!token) {
    alert("Please login first.");
    window.location = "login.html";
}
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");

    alert("Logged out successfully.");

    window.location.href = "login.html";
}