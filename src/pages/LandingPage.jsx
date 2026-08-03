import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

const LandingPage = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="landing-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-logo">CogniWell</div>
          <div>
            {isAuthenticated ? (
              <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                <span style={{fontSize: '0.9rem', color: '#1a365d', fontWeight: 600}}>
                  Welcome, {user?.name} ({user?.role?.toUpperCase()})
                </span>
                <Link to={`/${user?.role || 'user'}`} className="navbar-login-btn" style={{textDecoration: 'none'}}>
                  Go to {user?.role?.toUpperCase()} Dashboard
                </Link>
                <button className="navbar-login-btn" style={{background: '#e53e3e'}} onClick={logout}>
                  Logout
                </button>
              </div>
            ) : (
              <div style={{fontSize: '0.9rem', color: '#718096', fontWeight: 600}}>
                Select a Dashboard below to Login
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">CogniWell</h1>
          <h2 className="hero-tagline">AI-Powered Cognitive Alarm & Wellness Platform</h2>
          <p className="hero-description">
            Experience an intelligent approach to your daily routine. Track mood, improve sleep, and receive personalized wellness coaching tailored just for you.
          </p>
          <a href="#dashboards-section" className="hero-btn" style={{textDecoration: 'none', display: 'inline-block'}}>
            Explore Dashboards
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⏰</div>
              <h3 className="feature-title">Smart Alarms</h3>
              <p className="feature-desc">Wake up gently during optimal sleep phases.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🧠</div>
              <h3 className="feature-title">Mood Tracking</h3>
              <p className="feature-desc">Monitor daily emotions to recognize patterns.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">😴</div>
              <h3 className="feature-title">Sleep Analytics</h3>
              <p className="feature-desc">In-depth insights into your sleep quality.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🏋️</div>
              <h3 className="feature-title">Wellness Coaching</h3>
              <p className="feature-desc">Actionable advice from AI-driven insights.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard-Wise Login Selection Section */}
      <section className="dashboards-section" id="dashboards-section">
        <div className="container">
          <h2 className="section-title">Dashboard Login Portals</h2>
          <p style={{textAlign: 'center', color: '#718096', marginTop: '-16px', marginBottom: '32px', fontSize: '0.95rem'}}>
            Select your assigned dashboard portal to sign in with JWT or OAuth 2.0
          </p>
          <div className="dashboards-grid">
            <Link to="/user/login" className="dashboard-card">
              <div className="dash-card-content">
                <span className="dash-icon">👤</span>
                <div className="dash-text">
                  <h3 className="dash-title">User Dashboard</h3>
                  <p className="dash-desc">Sign in to track alarms & wellness</p>
                </div>
              </div>
              <span className="dash-arrow">Login →</span>
            </Link>

            <Link to="/coach/login" className="dashboard-card">
              <div className="dash-card-content">
                <span className="dash-icon">🧑‍⚕️</span>
                <div className="dash-text">
                  <h3 className="dash-title">Wellness Coach</h3>
                  <p className="dash-desc">Sign in to guide & monitor clients</p>
                </div>
              </div>
              <span className="dash-arrow">Login →</span>
            </Link>

            <Link to="/admin/login" className="dashboard-card">
              <div className="dash-card-content">
                <span className="dash-icon">⚙️</span>
                <div className="dash-text">
                  <h3 className="dash-title">Admin Dashboard</h3>
                  <p className="dash-desc">Sign in to manage users & telemetry</p>
                </div>
              </div>
              <span className="dash-arrow">Login →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} CogniWell. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
