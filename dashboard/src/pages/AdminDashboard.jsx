import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './AdminDashboard.css';

const AdminDashboard = () => {
  // Live metric state
  const [uptime, setUptime] = useState(99.94);
  const [serverLoad, setServerLoad] = useState(42);
  const [apiResponse, setApiResponse] = useState(124);
  const [memoryUsage, setMemoryUsage] = useState(68);

  // Auto-update metrics periodically to simulate a live server telemetry dashboard
  useEffect(() => {
    const interval = setInterval(() => {
      // Fluctuate uptime between 99.88% and 99.98%
      const newUptime = (99.85 + Math.random() * 0.13).toFixed(2);
      setUptime(parseFloat(newUptime));

      // Fluctuate server load between 38% and 48%
      setServerLoad(Math.floor(38 + Math.random() * 10));

      // Fluctuate API response time between 110ms and 135ms
      setApiResponse(Math.floor(110 + Math.random() * 25));

      // Fluctuate memory usage slightly between 65% and 70%
      setMemoryUsage(Math.floor(65 + Math.random() * 6));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <h2>CogniWell <span className="admin-badge">Admin</span></h2>
        </div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item active">📊 Dashboard</a>
          <a href="#" className="nav-item">👥 User Management</a>
          <a href="#" className="nav-item">🧑‍⚕️ Coach Management</a>
          <a href="#" className="nav-item">📈 Analytics</a>
          <a href="#" className="nav-item">🖥️ System Health</a>
          <a href="#" className="nav-item">⚙️ Settings</a>
        </nav>
        <div className="sidebar-footer">
          <div className="admin-profile">
            <div className="admin-avatar">AU</div>
            <span className="admin-name">Admin User</span>
          </div>
          <Link to="/" className="back-link">Back to Home</Link>
        </div>
      </aside>

      <main className="admin-main">
        <header className="main-header">
          <h2>Admin Panel</h2>
          <div className="header-actions">
            <input type="text" placeholder="Search..." className="search-input" />
            <span className="notification-bell">🔔</span>
          </div>
        </header>

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
              <span className="live-dot" title="Live telemetry active">● Live</span>
            </div>
            <div className="stat-value green">
              {uptime}% <span style={{fontSize: '0.75rem', color: '#718096', fontWeight: 500}}>(30d SLA)</span>
            </div>
          </div>
          <div className="stat-card">
            <h3>Revenue</h3>
            <div className="stat-value">$24.5K <span className="trend positive">↑ 8%</span></div>
          </div>
        </div>

        <div className="content-grid">
          <div className="card analytics-card">
            <h3>Platform Analytics</h3>
            <div className="bar-chart">
              <div className="bar-wrapper"><div className="bar" style={{ height: '30%' }}></div><span>Jan</span></div>
              <div className="bar-wrapper"><div className="bar" style={{ height: '45%' }}></div><span>Feb</span></div>
              <div className="bar-wrapper"><div className="bar" style={{ height: '52%' }}></div><span>Mar</span></div>
              <div className="bar-wrapper"><div className="bar" style={{ height: '43%' }}></div><span>Apr</span></div>
              <div className="bar-wrapper"><div className="bar" style={{ height: '62%' }}></div><span>May</span></div>
              <div className="bar-wrapper"><div className="bar" style={{ height: '78%' }}></div><span>Jun</span></div>
            </div>
          </div>

          <div className="card recent-users-card">
            <h3>Recent Users</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Jane Doe</td>
                  <td>jane@example.com</td>
                  <td><span className="role-badge user">User</span></td>
                  <td>Oct 12, 2023</td>
                  <td><span className="status-indicator active"></span> Active</td>
                </tr>
                <tr>
                  <td>Dr. Smith</td>
                  <td>smith@example.com</td>
                  <td><span className="role-badge coach">Coach</span></td>
                  <td>Oct 11, 2023</td>
                  <td><span className="status-indicator active"></span> Active</td>
                </tr>
                <tr>
                  <td>John Roe</td>
                  <td>john@example.com</td>
                  <td><span className="role-badge user">User</span></td>
                  <td>Oct 10, 2023</td>
                  <td><span className="status-indicator inactive"></span> Inactive</td>
                </tr>
                <tr>
                  <td>Emily Chen</td>
                  <td>emily@example.com</td>
                  <td><span className="role-badge coach">Coach</span></td>
                  <td>Oct 09, 2023</td>
                  <td><span className="status-indicator active"></span> Active</td>
                </tr>
                <tr>
                  <td>Michael Brown</td>
                  <td>mike@example.com</td>
                  <td><span className="role-badge user">User</span></td>
                  <td>Oct 08, 2023</td>
                  <td><span className="status-indicator active"></span> Active</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="card system-health-card">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h3>System Health</h3>
              <span style={{fontSize: '0.8rem', color: '#38a169', fontWeight: 600}}>Real-Time Telemetry</span>
            </div>
            <div className="health-grid">
              <div className="health-metric">
                <div className="metric-header"><span>Server Load</span><span>{serverLoad}%</span></div>
                <div className="progress-bar"><div className="progress green" style={{ width: `${serverLoad}%`, transition: 'width 0.5s ease' }}></div></div>
              </div>
              <div className="health-metric">
                <div className="metric-header"><span>Memory Usage</span><span>{memoryUsage}%</span></div>
                <div className="progress-bar"><div className="progress yellow" style={{ width: `${memoryUsage}%`, transition: 'width 0.5s ease' }}></div></div>
              </div>
              <div className="health-metric">
                <div className="metric-header"><span>API Response</span><span>{apiResponse}ms</span></div>
                <div className="progress-bar"><div className="progress green" style={{ width: `${(apiResponse / 200) * 100}%`, transition: 'width 0.5s ease' }}></div></div>
              </div>
              <div className="health-metric">
                <div className="metric-header"><span>Error Rate</span><span>0.3%</span></div>
                <div className="progress-bar"><div className="progress green" style={{ width: '5%' }}></div></div>
              </div>
            </div>
          </div>

          <div className="card activity-card">
            <h3>Recent Activity</h3>
            <ul className="activity-list">
              <li>
                <span className="time">10:45 AM</span>
                <span className="user">Sarah Williams</span>
                <span className="action">Updated profile picture</span>
                <span className="badge success">Success</span>
              </li>
              <li>
                <span className="time">09:30 AM</span>
                <span className="user">System</span>
                <span className="action">Daily backup completed</span>
                <span className="badge success">Success</span>
              </li>
              <li>
                <span className="time">08:15 AM</span>
                <span className="user">David Clark</span>
                <span className="action">Failed login attempt</span>
                <span className="badge danger">Failed</span>
              </li>
              <li>
                <span className="time">Yesterday</span>
                <span className="user">Dr. Evans</span>
                <span className="action">Created new session plan</span>
                <span className="badge success">Success</span>
              </li>
              <li>
                <span className="time">Yesterday</span>
                <span className="user">Admin User</span>
                <span className="action">Modified system settings</span>
                <span className="badge warning">Warning</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
