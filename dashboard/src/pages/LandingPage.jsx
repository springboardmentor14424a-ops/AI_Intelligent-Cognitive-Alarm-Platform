import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  return (
    <div className="landing-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-logo">CogniWell</div>
          <button className="navbar-login-btn">Login</button>
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
          <button className="hero-btn">Get Started</button>
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

      {/* Select Your Dashboard Section */}
      <section className="dashboards-section">
        <div className="container">
          <h2 className="section-title">Select Your Dashboard</h2>
          <div className="dashboards-grid">
            <Link to="/user" className="dashboard-card">
              <div className="dash-card-content">
                <span className="dash-icon">👤</span>
                <div className="dash-text">
                  <h3 className="dash-title">User Dashboard</h3>
                  <p className="dash-desc">Track your wellness journey</p>
                </div>
              </div>
              <span className="dash-arrow">→</span>
            </Link>

            <Link to="/coach" className="dashboard-card">
              <div className="dash-card-content">
                <span className="dash-icon">🧑‍⚕️</span>
                <div className="dash-text">
                  <h3 className="dash-title">Wellness Coach</h3>
                  <p className="dash-desc">Guide & monitor clients</p>
                </div>
              </div>
              <span className="dash-arrow">→</span>
            </Link>

            <Link to="/admin" className="dashboard-card">
              <div className="dash-card-content">
                <span className="dash-icon">⚙️</span>
                <div className="dash-text">
                  <h3 className="dash-title">Admin</h3>
                  <p className="dash-desc">Manage platform & analytics</p>
                </div>
              </div>
              <span className="dash-arrow">→</span>
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
