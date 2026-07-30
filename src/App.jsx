import { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import "./App.css";

function App() {
  const [session, setSession] = useState(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) { localStorage.setItem("brainos_token", token); window.history.replaceState({}, "", window.location.pathname); }
    return token || localStorage.getItem("brainos_token");
  });
  return session ? <Dashboard onSignOut={() => { localStorage.removeItem("brainos_token"); setSession(null); }} /> : <Login onAuthenticated={() => setSession(localStorage.getItem("brainos_token"))} />;
}

export default App;
