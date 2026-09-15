const API_BASE =
    window.location.hostname === "localhost"
        ? "http://localhost:5000/api"
        : "https://ai-cognitive-alarm-backend.vercel.app/api";

const BACKEND_BASE =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://ai-cognitive-alarm-backend.vercel.app";