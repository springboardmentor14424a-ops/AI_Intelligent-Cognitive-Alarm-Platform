import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const adminName = user?.name || 'Admin User';
  const adminAvatar = user?.avatar || adminName.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const [uptime, setUptime] = useState(89.64);
  const [serverLoad, setServerLoad] = useState(42);
  const [apiResponse, setApiResponse] = useState(124);

  // DB state — real users and coaches from PostgreSQL
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState('...');
  const [activeCoaches, setActiveCoaches] = useState('...');

  useEffect(() => {
    const interval = setInterval(() => {
      setUptime(parseFloat((89.50 + Math.random() * 0.30).toFixed(2)));
      setServerLoad(Math.floor(38 + Math.random() * 10));
      setApiResponse(Math.floor(110 + Math.random() * 25));
    }, 3000);

    fetch('http://localhost:5001/api/users')
      .then(r => r.json())
      .then(data => {
        const allUsers = data.users || [];
        setUsers(allUsers);
        setTotalUsers(allUsers.length);
        setActiveCoaches(allUsers.filter(u => u.role.toLowerCase().includes('coach')).length);
      })
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

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
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>CogniWell <span className="admin-badge">Admin</span></h2>
        </div>
        <nav className="sidebar-nav">
          <Link to="/admin" className="nav-item active">📊 Dashboard</Link>
          <a href="#user-management" className="nav-item">👥 User Management</a>
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
            <button onClick={handleLogout} style={{background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '8px', display: 'block', fontWeight: 600}}>
              🚪 Logout
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
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
          </div>
        </header>

        {/* 1. Telemetry Stats Cards */}
        <div className="telemetry-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))'}}>
          <div className="telemetry-card">
            <h4>Total Users</h4>
            <div className="stat-value blue">{totalUsers}</div>
            <span style={{fontSize: '0.8rem', color: '#38a169'}}>Registered in PostgreSQL</span>
          </div>
          <div className="telemetry-card">
            <h4>Active Coaches</h4>
            <div className="stat-value green">{activeCoaches}</div>
            <span style={{fontSize: '0.8rem', color: '#718096'}}>Wellness Coaches Active</span>
          </div>
          <div className="telemetry-card">
            <h4>Platform Uptime</h4>
            <div className="stat-value green">{uptime}%</div>
            <span style={{fontSize: '0.8rem', color: '#718096'}}>Live Automated Metric</span>
          </div>
          <div className="telemetry-card">
            <h4>CPU Server Load</h4>
            <div className="stat-value blue">{serverLoad}%</div>
            <span style={{fontSize: '0.8rem', color: '#718096'}}>Normal Operational Range</span>
          </div>
          <div className="telemetry-card">
            <h4>API Latency</h4>
            <div className="stat-value blue">{apiResponse} ms</div>
            <span style={{fontSize: '0.8rem', color: '#718096'}}>Global Edge Routing</span>
          </div>
          <div className="telemetry-card">
            <h4>Revenue</h4>
            <div className="stat-value green">$24,850</div>
            <span style={{fontSize: '0.8rem', color: '#38a169'}}>+18.4% MRR Growth</span>
          </div>
        </div>

        {/* 2. User Management */}
        <div className="card" id="user-management" style={{marginBottom: '24px'}}>
          <h3 className="section-title">👥 User Management</h3>
          <table className="admin-table">
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
              {users.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign: 'center', color: '#718096', padding: '20px'}}>Loading users from database...</td></tr>
              ) : users.map((u, idx) => (
                <tr key={idx}>
                  <td><strong>{u.name}</strong></td>
                  <td style={{fontSize: '0.85rem', color: '#4a5568'}}>{u.email}</td>
                  <td><span className={`role-badge ${u.role.toLowerCase().replace(/ /g, '-')}`}>{u.role}</span></td>
                  <td style={{fontSize: '0.85rem', color: '#718096'}}>{new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                  <td><span className="status-tag active">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 3. Platform Analytics */}
        <div className="card" id="platform-analytics" style={{marginBottom: '24px'}}>
          <h3 className="section-title">📈 Platform Analytics</h3>
          <h4 style={{margin: '0 0 16px 0', color: '#4a5568', fontSize: '0.95rem'}}>Active Alarm Configurations & Success Rates</h4>
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            {[
              { label: 'REM Sleep Sync Alarms', pct: 88, color: '#3182ce' },
              { label: 'Voice Prompt Alarms', pct: 72, color: '#38a169' },
              { label: 'Gentle Tone Alarms', pct: 91, color: '#805ad5' },
              { label: 'Smart Light Alarms', pct: 65, color: '#d69e2e' }
            ].map((item, i) => (
              <div key={i}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px'}}>
                  <span>{item.label}</span>
                  <strong>{item.pct}% Active Success</strong>
                </div>
                <div style={{height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden'}}>
                  <div style={{height: '100%', background: item.color, width: `${item.pct}%`, borderRadius: '4px'}}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation Monitoring & System Reports Grid */}
        <div className="content-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
          {/* Recommendation Monitoring */}
          <div className="card" id="recommendation-monitoring">
            <h3 className="section-title">🤖 Recommendation Monitoring</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
              {recommendationMonitoring.map((rec, idx) => (
                <div key={idx} style={{padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                    <strong style={{color: '#1a365d', fontSize: '0.95rem'}}>{rec.recommendation}</strong>
                    <span className="role-badge user">{rec.status}</span>
                  </div>
                  <p style={{margin: '0 0 6px 0', fontSize: '0.85rem', color: '#4a5568'}}>Target Audience: <strong>{rec.targetSegment}</strong></p>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#718096'}}>
                    <span>Acceptance: <strong>{rec.acceptanceRate}</strong></span>
                    <span>Impact: <strong>{rec.impactScore}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* System Reports */}
          <div className="card" id="system-reports">
            <h3 className="section-title">📋 System Reports</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
              {systemReports.map((report, idx) => (
                <div key={idx} style={{padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div>
                    <strong style={{color: '#1a365d', fontSize: '0.9rem', display: 'block', marginBottom: '4px'}}>{report.reportName}</strong>
                    <span style={{fontSize: '0.78rem', color: '#718096'}}>Generated: {report.generatedDate} | Format: {report.format}</span>
                  </div>
                  <button style={{padding: '6px 12px', background: '#2b6cb0', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'}}>
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
