const API_BASE =
    window.location.hostname === "localhost"
        ? "http://localhost:5000/api"
        : "https://YOUR-BACKEND-URL.vercel.app/api";

const BACKEND_BASE =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://YOUR-BACKEND-URL.vercel.app";