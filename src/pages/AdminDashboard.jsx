import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const adminName = user?.name || 'Admin User';
  const adminAvatar = user?.avatar || adminName.split(' ').map(n => n[0]).join('').toUpperCase();

  const [uptime, setUptime] = useState(89.64);
  const [serverLoad, setServerLoad] = useState(42);
  const [apiResponse, setApiResponse] = useState(124);

  useEffect(() => {
    const interval = setInterval(() => {
      const newUptime = (89.50 + Math.random() * 0.30).toFixed(2);
      setUptime(parseFloat(newUptime));
      setServerLoad(Math.floor(38 + Math.random() * 10));
      setApiResponse(Math.floor(110 + Math.random() * 25));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const users = [
    { name: 'Jane Doe', email: 'jane@example.com', role: 'User', joined: 'Oct 12, 2023', status: 'Active' },
    { name: 'Dr. Smith', email: 'smith@example.com', role: 'Coach', joined: 'Oct 11, 2023', status: 'Active' },
    { name: 'John Roe', email: 'john@example.com', role: 'User', joined: 'Oct 10, 2023', status: 'Inactive' },
    { name: 'Emily Chen', email: 'emily@example.com', role: 'Coach', joined: 'Oct 09, 2023', status: 'Active' }
  ];

  const recommendationMonitoring = [
    { recommendation: 'REM Sleep Wake-up Adaptation', targetSegment: 'Users sleeping < 6 hrs', acceptanceRate: '94%', impactScore: 'High (+18% Alertness)', status: 'Active AI Rule' },
    { recommendation: 'Hydration Challenge Prompt', targetSegment: 'All Active Users', acceptanceRate: '82%', impactScore: 'Medium (+12% Energy)', status: 'Active AI Rule' },
    { recommendation: 'Wind-down Screen Lock Trigger', targetSegment: 'Coach Assigned Clients', acceptanceRate: '76%', impactScore: 'Very High (+25% Deep Sleep)', status: 'A/B Testing' }
  ];

  const systemReports = [
    { reportName: 'Monthly User Engagement & Growth Report', generatedDate: 'Jul 28, 2026', format: 'PDF / CSV', status: 'Ready' },
    { reportName: 'Platform Uptime & Telemetry Audit Log', generatedDate: 'Jul 25, 2026', format: 'JSON', status: 'Ready' },
    { reportName: 'Coach Progress & Intervention Audit', generatedDate: 'Jul 20, 2026', format: 'PDF', status: 'Archived' }
  ];

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>CogniWell <span className="admin-badge">Admin</span></h2>
        </div>
        <nav className="sidebar-nav">
          <a href="#user-management" className="nav-item active">👥 User Management</a>
          <a href="#platform-analytics" className="nav-item">📈 Platform Analytics</a>
          <a href="#recommendation-monitoring" className="nav-item">🤖 Recommendation Monitoring</a>
          <a href="#system-reports" className="nav-item">📋 System Reports</a>
        </nav>
        <div className="sidebar-footer">
          <div className="admin-profile">
            <div className="admin-avatar">{adminAvatar}</div>
            <span className="admin-name">{adminName}</span>
          </div>
          {user && (
            <button onClick={logout} style={{background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '8px', display: 'block'}}>
              🚪 Logout ({user.role})
            </button>
          )}
          <Link to="/" className="back-link">← Back to Home</Link>
        </div>
      </aside>

      <main className="admin-main">
        <header className="main-header">
          <div>
            <h2>Admin Dashboard — Logged in as {adminName}</h2>
            <span style={{fontSize: '0.85rem', color: '#e53e3e', fontWeight: 600}}>
              Logged in Account: {user?.email || 'admin@cogniwell.com'}
            </span>
          </div>
          <div className="header-actions">
            <input type="text" placeholder="Search accounts..." className="search-input" />
            <span className="notification-bell">🔔</span>
            <button onClick={logout} style={{padding: '6px 12px', background: '#fff5f5', color: '#e53e3e', border: '1px solid #feb2b2', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'}}>
              Sign Out
            </button>
          </div>
        </header>

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <h3>Total Users</h3>
            <div className="stat-value">1,247 <span className="trend positive">↑ 12%</span></div>
          </div>
          <div className="stat-card">
            <h3>Active Coaches</h3>
            <div className="stat-value blue">38</div>
          </div>
          <div className="stat-card">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>Platform Uptime</h3>
              <span className="live-dot">● Live</span>
            </div>
            <div className="stat-value green">{uptime}% <span style={{fontSize: '0.75rem', color: '#718096'}}>(30d SLA)</span></div>
          </div>
          <div className="stat-card">
            <h3>Revenue</h3>
            <div className="stat-value">$24.5K <span className="trend positive">↑ 8%</span></div>
          </div>
        </div>

        <div className="content-grid">
          {/* 1. User Management */}
          <div className="card recent-users-card" id="user-management">
            <h3>👥 User Management</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i}>
                    <td style={{fontWeight: 600}}>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`role-badge ${u.role.toLowerCase()}`}>{u.role}</span></td>
                    <td>{u.joined}</td>
                    <td>
                      <span className={`status-indicator ${u.status === 'Active' ? 'active' : 'inactive'}`} />
                      {u.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 2. Platform Analytics */}
          <div className="card analytics-card" id="platform-analytics">
            <h3>📈 Platform Analytics (Monthly User Onboarding & Activity)</h3>
            <div className="bar-chart">
              <div className="bar-wrapper"><div className="bar" style={{ height: '35%' }}></div><span>Jan (120)</span></div>
              <div className="bar-wrapper"><div className="bar" style={{ height: '50%' }}></div><span>Feb (185)</span></div>
              <div className="bar-wrapper"><div className="bar" style={{ height: '65%' }}></div><span>Mar (210)</span></div>
              <div className="bar-wrapper"><div className="bar" style={{ height: '55%' }}></div><span>Apr (175)</span></div>
              <div className="bar-wrapper"><div className="bar" style={{ height: '78%' }}></div><span>May (250)</span></div>
              <div className="bar-wrapper"><div className="bar" style={{ height: '90%' }}></div><span>Jun (310)</span></div>
            </div>
          </div>

          {/* 3. Recommendation Monitoring */}
          <div className="card" id="recommendation-monitoring">
            <h3>🤖 Recommendation Monitoring (AI Rules)</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {recommendationMonitoring.map((rec, idx) => (
                <div key={idx} style={{padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                    <strong style={{color: '#1a365d', fontSize: '0.9rem'}}>{rec.recommendation}</strong>
                    <span className="role-badge coach">{rec.status}</span>
                  </div>
                  <div style={{display: 'flex', gap: '16px', fontSize: '0.8rem', color: '#4a5568'}}>
                    <span>Target: <strong>{rec.targetSegment}</strong></span>
                    <span>Acceptance: <strong>{rec.acceptanceRate}</strong></span>
                    <span>Impact: <strong style={{color: '#38a169'}}>{rec.impactScore}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. System Reports */}
          <div className="card" id="system-reports">
            <h3>📋 System Reports</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {systemReports.map((rep, idx) => (
                <div key={idx} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px'}}>
                  <div>
                    <strong style={{display: 'block', color: '#1a365d', fontSize: '0.9rem'}}>{rep.reportName}</strong>
                    <span style={{fontSize: '0.75rem', color: '#718096'}}>Generated: {rep.generatedDate} • Format: {rep.format}</span>
                  </div>
                  <button style={{padding: '6px 12px', background: '#2b6cb0', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem'}}>
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
