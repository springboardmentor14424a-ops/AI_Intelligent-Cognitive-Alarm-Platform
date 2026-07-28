import React from 'react';
import { Link } from 'react-router-dom';
import './CoachDashboard.css';

const CoachDashboard = () => {
  return (
    <div className="coach-dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>CogniWell <span className="coach-badge">Coach</span></h2>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li className="active"><a href="#dashboard">📊 Dashboard</a></li>
            <li><a href="#clients">👥 My Clients</a></li>
            <li><a href="#appointments">📅 Appointments</a></li>
            <li><a href="#programs">📋 Programs</a></li>
            <li><a href="#reports">📈 Reports</a></li>
            <li><a href="#messages">💬 Messages</a></li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <div className="coach-profile">
            <div className="coach-avatar">SW</div>
            <div className="coach-info">
              <span className="coach-name">Dr. Sarah Wilson</span>
            </div>
          </div>
          <Link to="/" className="back-link">Back to Home</Link>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <h2>Coach Dashboard</h2>
          <div className="notifications">
            <span className="bell-icon">🔔</span>
            <span className="badge">3</span>
          </div>
        </header>

        <section className="stats-row">
          <div className="stat-card">
            <h3>Active Clients</h3>
            <p className="stat-value">24</p>
          </div>
          <div className="stat-card">
            <h3>Sessions Today</h3>
            <p className="stat-value">5</p>
          </div>
          <div className="stat-card">
            <h3>Avg Client Score</h3>
            <p className="stat-value">78%</p>
          </div>
          <div className="stat-card">
            <h3>Programs Active</h3>
            <p className="stat-value">8</p>
          </div>
        </section>

        <section className="appointments-section">
          <h3>Today's Appointments</h3>
          <div className="table-card">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>John Doe</td>
                  <td>09:00 AM</td>
                  <td>Weekly Review</td>
                  <td><span className="status-badge status-completed">Completed</span></td>
                </tr>
                <tr>
                  <td>Jane Smith</td>
                  <td>11:30 AM</td>
                  <td>Initial Consult</td>
                  <td><span className="status-badge status-in-progress">In Progress</span></td>
                </tr>
                <tr>
                  <td>Michael Brown</td>
                  <td>02:00 PM</td>
                  <td>Therapy Session</td>
                  <td><span className="status-badge status-upcoming">Upcoming</span></td>
                </tr>
                <tr>
                  <td>Emily Davis</td>
                  <td>04:00 PM</td>
                  <td>Check-in</td>
                  <td><span className="status-badge status-upcoming">Upcoming</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid-container">
          <section className="client-overview">
            <h3>Client Overview</h3>
            <div className="client-grid">
              <div className="client-card">
                <div className="client-header">
                  <div className="client-avatar bg-blue">JD</div>
                  <div className="client-info">
                    <h4>John Doe</h4>
                    <span className="last-active">Last active: Today</span>
                  </div>
                </div>
                <div className="client-stats">
                  <div className="progress-container">
                    <span>Wellness Score</span>
                    <div className="progress-bar"><div className="progress" style={{width: '75%'}}></div></div>
                  </div>
                  <div className="mood-trend">Mood: 😐 🙂 😊 😊 😁</div>
                </div>
              </div>
              <div className="client-card">
                <div className="client-header">
                  <div className="client-avatar bg-green">JS</div>
                  <div className="client-info">
                    <h4>Jane Smith</h4>
                    <span className="last-active">Last active: Yesterday</span>
                  </div>
                </div>
                <div className="client-stats">
                  <div className="progress-container">
                    <span>Wellness Score</span>
                    <div className="progress-bar"><div className="progress" style={{width: '60%'}}></div></div>
                  </div>
                  <div className="mood-trend">Mood: 😔 😐 🙂 😐 🙂</div>
                </div>
              </div>
              <div className="client-card">
                <div className="client-header">
                  <div className="client-avatar bg-orange">MB</div>
                  <div className="client-info">
                    <h4>Michael Brown</h4>
                    <span className="last-active">Last active: 2 days ago</span>
                  </div>
                </div>
                <div className="client-stats">
                  <div className="progress-container">
                    <span>Wellness Score</span>
                    <div className="progress-bar"><div className="progress" style={{width: '88%'}}></div></div>
                  </div>
                  <div className="mood-trend">Mood: 😊 😁 😁 😁 🤩</div>
                </div>
              </div>
              <div className="client-card">
                <div className="client-header">
                  <div className="client-avatar bg-purple">ED</div>
                  <div className="client-info">
                    <h4>Emily Davis</h4>
                    <span className="last-active">Last active: Today</span>
                  </div>
                </div>
                <div className="client-stats">
                  <div className="progress-container">
                    <span>Wellness Score</span>
                    <div className="progress-bar"><div className="progress" style={{width: '45%'}}></div></div>
                  </div>
                  <div className="mood-trend">Mood: 😭 😔 😔 😐 😔</div>
                </div>
              </div>
            </div>
          </section>

          <section className="active-programs">
            <h3>Active Programs</h3>
            <div className="programs-list">
              <div className="program-card">
                <h4>Sleep Optimization</h4>
                <p>12 Participants &bull; 4 Weeks</p>
                <div className="progress-container">
                  <div className="progress-bar"><div className="progress" style={{width: '50%'}}></div></div>
                </div>
              </div>
              <div className="program-card">
                <h4>Stress Management</h4>
                <p>28 Participants &bull; 6 Weeks</p>
                <div className="progress-container">
                  <div className="progress-bar"><div className="progress" style={{width: '20%'}}></div></div>
                </div>
              </div>
              <div className="program-card">
                <h4>Cognitive Enhancement</h4>
                <p>5 Participants &bull; 8 Weeks</p>
                <div className="progress-container">
                  <div className="progress-bar"><div className="progress" style={{width: '80%'}}></div></div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="actions-row">
            <button className="action-btn">Schedule Session</button>
            <button className="action-btn">Create Program</button>
            <button className="action-btn">Send Message</button>
            <button className="action-btn">Generate Report</button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CoachDashboard;
