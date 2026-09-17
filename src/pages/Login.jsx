import { useState } from "react";
import NeuralCore from "../components/NeuralCore";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
export default function Login({ onAuthenticated }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState("request");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", otp: "" });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (recoveryMode && recoveryStep === "request") {
      setLoading(true); setNotice("");
      try {
        const response = await fetch(`${API_URL}/auth/password-reset/request`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Unable to send a reset code.");
        setRecoveryStep("confirm");
        setNotice(data.message);
      } catch (error) {
        setNotice(error.message === "Failed to fetch" ? "Neural gateway is offline. Start the FastAPI server first." : error.message);
      } finally { setLoading(false); }
      return;
    }
    if (recoveryMode) {
      if (form.password !== form.confirmPassword) return setNotice("Passwords do not match.");
      setLoading(true); setNotice("");
      try {
        const response = await fetch(`${API_URL}/auth/password-reset/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.email, otp: form.otp, new_password: form.password, confirm_password: form.confirmPassword }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Unable to reset password.");
        setRecoveryStep("request"); setRecoveryMode(false); setForm({ name: "", email: form.email, password: "", confirmPassword: "", otp: "" });
        setNotice(data.message);
      } catch (error) {
        setNotice(error.message === "Failed to fetch" ? "Neural gateway is offline. Start the FastAPI server first." : error.message);
      } finally { setLoading(false); }
      return;
    }
    if (isRegistering && form.password !== form.confirmPassword) return setNotice("Passwords do not match.");
    setLoading(true); setNotice("");
    try {
      const response = await fetch(`${API_URL}${isRegistering ? "/register" : "/login"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isRegistering ? { name: form.name, email: form.email, password: form.password } : { email: form.email, password: form.password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Unable to access BrainOS.");
      localStorage.setItem("brainos_token", data.access_token); onAuthenticated();
    } catch (error) {
      setNotice(error.message === "Failed to fetch" ? "Neural gateway is offline. Start the FastAPI server first." : error.message);
    } finally { setLoading(false); }
  };
  const switchMode = (nextMode) => { setRecoveryMode(nextMode); setRecoveryStep("request"); setIsRegistering(false); setNotice(""); };
  return <main className="auth-shell auth-entrance"><div className="star-field" /><div className="aurora aurora-one" /><div className="aurora aurora-two" />
    <section className="auth-intro"><div className="wordmark"><i /> BRAİN<span>OS</span></div><div className="intro-orbit"><NeuralCore /></div><p className="eyebrow">COGNITIVE ALARM PLATFORM</p><h1>Wake with<br /><em>intention.</em></h1><p className="intro-copy">Your sleep rhythm, focus reserve, and morning mission — orchestrated in one calm neural space.</p><div className="signal-row"><b /> NEURAL LINK SECURE <span>v.01</span></div></section>
    <section className="auth-panel"><div className="panel-cap"><span>{recoveryMode ? "SECURE RECOVERY" : isRegistering ? "NEW NEURAL PROFILE" : "IDENTITY VERIFICATION"}</span><b>{recoveryMode ? recoveryStep === "request" ? "01 / 02" : "02 / 02" : "01 / 01"}</b></div><h2>{recoveryMode ? recoveryStep === "request" ? "Recover your signal." : "Set a new signal." : isRegistering ? "Start your signal." : "Welcome back."}</h2><p className="panel-subtitle">{recoveryMode ? recoveryStep === "request" ? "We will send a six-digit code through the configured email gateway." : "The code expires after 10 minutes and locks after five failed attempts." : isRegistering ? "Build a more intentional morning, one cycle at a time." : "Your cognitive command center is ready."}</p>{!recoveryMode && <><button className="google-button" onClick={() => window.location.assign(`${API_URL}/oauth/google`)} type="button"><strong>G</strong> Continue with Google <span>↗</span></button><div className="auth-divider"><span>OR CONTINUE WITH EMAIL</span></div></>}
      <form onSubmit={submit}>{!recoveryMode && isRegistering && <label>FULL NAME<input name="name" value={form.name} onChange={update} placeholder="Your name" required /></label>}<label>EMAIL ADDRESS<input type="email" name="email" value={form.email} onChange={update} placeholder="you@example.com" required /></label>{recoveryMode && recoveryStep === "confirm" && <><label>EMAIL OTP<input name="otp" value={form.otp} onChange={update} inputMode="numeric" pattern="[0-9]{6}" placeholder="000000" minLength="6" maxLength="6" required /></label><label>NEW PASSWORD<div className="password-field"><input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={update} placeholder="••••••••" minLength="8" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div></label><label>CONFIRM PASSWORD<input type={showPassword ? "text" : "password"} name="confirmPassword" value={form.confirmPassword} onChange={update} placeholder="••••••••" minLength="8" required /></label></>}{!recoveryMode && <><label>PASSWORD<div className="password-field"><input type={showPassword ? "text" : "password"} name="password" value={form.password} onChange={update} placeholder="••••••••" minLength="8" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div></label>{isRegistering && <label>CONFIRM PASSWORD<input type={showPassword ? "text" : "password"} name="confirmPassword" value={form.confirmPassword} onChange={update} placeholder="••••••••" minLength="8" required /></label>}</>}{notice && <p className="form-notice" role="alert">{notice}</p>}<button className="primary-button" disabled={loading}>{loading ? "CONNECTING..." : recoveryMode ? recoveryStep === "request" ? "SEND RESET CODE" : "RESET PASSWORD" : isRegistering ? "CREATE NEURAL ID" : "ENTER BRAINOS"}<span>→</span></button></form><p className="switch-auth">{recoveryMode ? "Remembered your password?" : !isRegistering ? "Forgot your password?" : "Already calibrated?"} <button type="button" onClick={() => recoveryMode ? switchMode(false) : !isRegistering ? switchMode(true) : switchMode(false)}>{recoveryMode || isRegistering ? "Sign in" : "Recovery status"}</button></p>{recoveryMode && recoveryStep === "confirm" && <p className="switch-auth"><button type="button" onClick={() => { setRecoveryStep("request"); setNotice(""); }}>Resend code</button></p>}{!recoveryMode && <p className="switch-auth"><button type="button" onClick={() => { setIsRegistering((value) => !value); setNotice(""); }}>{isRegistering ? "Sign in" : "Create an account"}</button></p>}</section>
  </main>;
}
