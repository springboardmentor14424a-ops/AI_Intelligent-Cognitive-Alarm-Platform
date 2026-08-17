import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const CoachCard = ({ coach, selected, onSelect }) => (
  <div
    className={`coach-select-card ${selected ? 'selected' : ''}`}
    onClick={() => onSelect(coach)}
  >
    <div className="coach-select-avatar">
      {coach.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
    </div>
    <div className="coach-select-info">
      <strong>{coach.name}</strong>
      <span>{coach.email}</span>
    </div>
    {selected && <div className="coach-select-check">✓</div>}
  </div>
);

const LoginPage = ({ targetRole }) => {
  const { role: urlRole } = useParams();
  const activeRole = targetRole || urlRole || 'user';

  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState(1); // 1 = details, 2 = choose coach (users only)
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role] = useState(activeRole);
  const [errorMsg, setErrorMsg] = useState('');

  // Coach selection state
  const [coaches, setCoaches] = useState([]);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [loadingCoaches, setLoadingCoaches] = useState(false);

  const { login, register, loginWithOAuth, loading } = useAuth();
  const navigate = useNavigate();

  const roleConfig = {
    user: {
      title: '👤 User Dashboard Login',
      badgeBg: '#2b6cb0',
      description: 'Access your cognitive alarms, sleep metrics, and daily habit logs.',
      redirect: '/user'
    },
    coach: {
      title: '🧑‍⚕️ Wellness Coach Login',
      badgeBg: '#38a169',
      description: 'Manage client rosters, review sleep trend reports, and track milestones.',
      redirect: '/coach'
    },
    admin: {
      title: '⚙️ Admin Portal Login',
      badgeBg: '#e53e3e',
      description: 'Monitor platform analytics, system health telemetry, and user roles.',
      redirect: '/admin'
    }
  }[activeRole] || {
    title: 'CogniWell Login',
    badgeBg: '#1a365d',
    description: 'Sign in to access your dashboard.',
    redirect: `/${activeRole}`
  };

  // Fetch available coaches when user goes to step 2
  const fetchCoaches = () => {
    setLoadingCoaches(true);
    fetch('http://localhost:5001/api/coaches')
      .then(r => r.json())
      .then(data => {
        setCoaches(data.coaches || []);
        setLoadingCoaches(false);
      })
      .catch(() => setLoadingCoaches(false));
  };

  // Step 1 → Step 2: validate details and show coach selection for users
  const handleNextStep = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!name || !email || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (activeRole === 'user') {
      fetchCoaches();
      setStep(2);
    } else {
      // Coaches/Admins register directly without coach selection
      submitRegistration(null);
    }
  };

  // Final registration submission
  const submitRegistration = async (coachId) => {
    setErrorMsg('');
    try {
      const data = await register(name, email, password, activeRole, coachId);
      navigate(roleConfig.redirect);
    } catch (err) {
      setErrorMsg(err.message || 'Registration failed');
      setStep(1);
    }
  };

  // Step 2 → Submit with selected coach
  const handleFinalRegister = async () => {
    if (!selectedCoach) {
      setErrorMsg('Please select a wellness coach to continue.');
      return;
    }
    await submitRegistration(selectedCoach.id);
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await login(email, password);
      navigate(roleConfig.redirect);
    } catch (err) {
      setErrorMsg(err.message || 'Login failed');
    }
  };

  const handleOAuthLogin = async (provider) => {
    setErrorMsg('');
    try {
      await loginWithOAuth(provider, activeRole);
      navigate(roleConfig.redirect);
    } catch (err) {
      setErrorMsg(`OAuth authentication via ${provider} failed.`);
    }
  };

  const handleQuickDemoLogin = async () => {
    setErrorMsg('');
    const credentials = {
      user: { email: 'user@cogniwell.com', pass: 'user123' },
      coach: { email: 'coach@cogniwell.com', pass: 'coach123' },
      admin: { email: 'admin@cogniwell.com', pass: 'admin123' }
    }[activeRole] || { email: 'user@cogniwell.com', pass: 'user123' };
    try {
      await login(credentials.email, credentials.pass);
      navigate(roleConfig.redirect);
    } catch (err) {
      setErrorMsg(`Demo login for ${activeRole} failed.`);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedCoach(null);
    setErrorMsg('');
    setName(''); setEmail(''); setPassword('');
  };

  return (
    <div className="login-container">
      <div className={`login-card ${isRegister && activeRole === 'user' && step === 2 ? 'login-card-wide' : ''}`}>
        <div className="login-header">
          <Link to="/" className="login-logo">CogniWell</Link>
          <div style={{
            backgroundColor: roleConfig.badgeBg,
            color: '#fff',
            padding: '6px 14px',
            borderRadius: '20px',
            display: 'inline-block',
            fontWeight: 700,
            fontSize: '0.9rem',
            margin: '12px 0 6px 0'
          }}>
            {roleConfig.title}
          </div>
          <p className="login-subtitle">{roleConfig.description}</p>
        </div>


        {/* Tab Toggle */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(false); resetForm(); }}
          >Sign In</button>
          <button
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(true); resetForm(); }}
          >Register Account</button>
        </div>

        {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

        {/* ─── SIGN IN FORM ─── */}
        {!isRegister && (
          <form onSubmit={handleSignIn} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" placeholder={`${activeRole}@cogniwell.com`}
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary-auth" disabled={loading}>
              {loading ? 'Authenticating...' : `Sign In to ${activeRole.toUpperCase()} Dashboard`}
            </button>
          </form>
        )}

        {/* ─── REGISTER: STEP 1 — Account Details ─── */}
        {isRegister && step === 1 && (
          <form onSubmit={handleNextStep} className="auth-form">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" placeholder="Enter your full name"
                value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary-auth" disabled={loading}>
              {activeRole === 'user' ? 'Next — Choose Your Coach →' : `Create ${activeRole.toUpperCase()} Account`}
            </button>
          </form>
        )}

        {/* ─── REGISTER: STEP 2 — Choose Wellness Coach (Users only) ─── */}
        {isRegister && step === 2 && activeRole === 'user' && (
          <div className="auth-form">
            <div className="coach-select-header">
              <h3>🧑‍⚕️ Choose Your Wellness Coach</h3>
              <p>Browse and select a coach who will guide your wellness journey.</p>
            </div>

            {loadingCoaches ? (
              <div className="coach-select-loading">⏳ Loading available coaches...</div>
            ) : coaches.length === 0 ? (
              <div className="coach-select-empty">
                ⚠️ No coaches available yet. You'll be assigned automatically.
              </div>
            ) : (
              <div className="coach-select-list">
                {coaches.map(coach => (
                  <CoachCard
                    key={coach.id}
                    coach={coach}
                    selected={selectedCoach?.id === coach.id}
                    onSelect={setSelectedCoach}
                  />
                ))}
              </div>
            )}

            <div className="coach-select-actions">
              <button className="btn-secondary-auth" onClick={() => { setStep(1); setSelectedCoach(null); setErrorMsg(''); }}>
                ← Back
              </button>
              <button
                className="btn-primary-auth"
                onClick={handleFinalRegister}
                disabled={loading || (!selectedCoach && coaches.length > 0)}
              >
                {loading ? 'Creating Account...' : `✓ Confirm & Register`}
              </button>
            </div>
          </div>
        )}

        {/* OAuth & Demo — only show on sign-in or step 1 */}
        {(!isRegister || step === 1) && (
          <>
            <div className="auth-divider"><span>OR CONTINUE WITH OAUTH 2.0</span></div>
            <div className="oauth-buttons">
              <button type="button" className="oauth-btn google-btn"
                onClick={() => handleOAuthLogin('Google')} disabled={loading}>
                <span className="oauth-icon">🌐</span> Google OAuth Sign-in
              </button>
              <button type="button" className="oauth-btn github-btn"
                onClick={() => handleOAuthLogin('GitHub')} disabled={loading}>
                <span className="oauth-icon">🐙</span> GitHub OAuth Sign-in
              </button>
            </div>
            <div className="demo-access-section">
              <p className="demo-title">⚡ Quick Demo Access:</p>
              <button onClick={handleQuickDemoLogin} className="demo-chip"
                style={{ width: '100%', padding: '10px' }}>
                Quick Demo Login as {activeRole.toUpperCase()}
              </button>
            </div>
          </>
        )}

        <div className="login-footer">
          <Link to="/" className="home-link">← Back to Landing Page</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
