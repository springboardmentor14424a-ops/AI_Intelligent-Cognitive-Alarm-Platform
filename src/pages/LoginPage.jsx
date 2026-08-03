import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

const LoginPage = ({ targetRole }) => {
  const { role: urlRole } = useParams();
  const activeRole = targetRole || urlRole || 'user';

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(activeRole);
  const [errorMsg, setErrorMsg] = useState('');

  const { login, register, loginWithOAuth, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setRole(activeRole);
  }, [activeRole]);

  // Dashboard-specific branding configuration
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

  const handleJWTAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      if (isRegister) {
        await register(name, email, password, activeRole);
      } else {
        await login(email, password);
      }
      navigate(roleConfig.redirect);
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed');
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

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Link to="/" className="login-logo">CogniWell</Link>
          <div 
            style={{
              backgroundColor: roleConfig.badgeBg, 
              color: '#fff', 
              padding: '6px 14px', 
              borderRadius: '20px', 
              display: 'inline-block', 
              fontWeight: 700, 
              fontSize: '0.9rem',
              margin: '12px 0 6px 0'
            }}
          >
            {roleConfig.title}
          </div>
          <p className="login-subtitle">{roleConfig.description}</p>
        </div>

        {/* Tab Toggle */}
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(false); setErrorMsg(''); }}
          >
            Sign In
          </button>
          <button 
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => { setIsRegister(true); setErrorMsg(''); }}
          >
            Register Account
          </button>
        </div>

        {errorMsg && <div className="auth-error-banner">{errorMsg}</div>}

        {/* JWT Form */}
        <form onSubmit={handleJWTAuth} className="auth-form">
          {isRegister && (
            <div className="form-group">
              <label>Full Name</label>
              <input 
                type="text" 
                placeholder="Enter your name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>
          )}

          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              placeholder={`${activeRole}@cogniwell.com`}
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="btn-primary-auth" disabled={loading}>
            {loading ? 'Authenticating...' : isRegister ? `Create ${activeRole.toUpperCase()} Account (JWT)` : `Sign In to ${activeRole.toUpperCase()} Dashboard`}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <span>OR CONTINUE WITH OAUTH 2.0</span>
        </div>

        {/* OAuth Buttons */}
        <div className="oauth-buttons">
          <button 
            type="button" 
            className="oauth-btn google-btn"
            onClick={() => handleOAuthLogin('Google')}
            disabled={loading}
          >
            <span className="oauth-icon">🌐</span> Google OAuth Sign-in
          </button>
          <button 
            type="button" 
            className="oauth-btn github-btn"
            onClick={() => handleOAuthLogin('GitHub')}
            disabled={loading}
          >
            <span className="oauth-icon">🐙</span> GitHub OAuth Sign-in
          </button>
        </div>

        {/* Quick Demo Access */}
        <div className="demo-access-section">
          <p className="demo-title">⚡ Quick Demo Access:</p>
          <button onClick={handleQuickDemoLogin} className="demo-chip" style={{width: '100%', padding: '10px'}}>
            Quick Demo Login as {activeRole.toUpperCase()}
          </button>
        </div>

        <div className="login-footer">
          <Link to="/" className="home-link">← Back to Landing Page</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
