import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './CoachDashboard.css';

const CoachDashboard = () => {
  const { user, logout } = useAuth();
  const coachName = user?.name || 'Dr. Sarah Wilson';
  const coachAvatar = user?.avatar || coachName.split(' ').map(n => n[0]).join('').toUpperCase();

  const clients = [
    { name: 'John Doe', score: 88, habitAdherence: '92%', sleepAvg: '7.8h', moodTrend: '😊 😌 😄 😊', lastActive: 'Today', status: 'Optimal' },
    { name: 'Alice Smith', score: 72, habitAdherence: '78%', sleepAvg: '6.2h', moodTrend: '😐 😴 😌 😐', lastActive: 'Yesterday', status: 'Needs Attention' },
    { name: 'Robert Johnson', score: 94, habitAdherence: '96%', sleepAvg: '8.1h', moodTrend: '😄 😊 😄 😄', lastActive: '2h ago', status: 'Excellent' },
    { name: 'Emily Davis', score: 65, habitAdherence: '68%', sleepAvg: '5.5h', moodTrend: '😴 😐 😴 😴', lastActive: '3 days ago', status: 'At Risk' }
  ];

  const sleepTrendReports = [
    { period: 'This Week (Jul 22 - Jul 28)', avgDuration: '7.4 hrs', remEfficiency: '86%', deepSleep: '1.8 hrs', trend: '↑ 4% vs last week' },
    { period: 'Previous Week (Jul 15 - Jul 21)', avgDuration: '7.1 hrs', remEfficiency: '82%', deepSleep: '1.6 hrs', trend: 'Stable' }
  ];

  const behaviorInsights = [
    { title: 'Morning Snooze Frequency Reduction', insight: 'Clients using REM Sync alarms snoozed 45% less than static alarm users.', priority: 'High Impact' },
    { title: 'Late Night Screen Time Impact', insight: 'Clients logging screens within 30 min of bed experienced 22% lower deep sleep.', priority: 'Action Required' },
    { title: 'Post-Workout Sleep Recovery', insight: 'Users completing evening wind-down sessions had 15% higher morning alertness scores.', priority: 'Positive' }
  ];

  const progressMonitoring = [
    { client: 'John Doe', program: 'Sleep Optimization', progress: 85, milestone: 'Week 4 of 6 Completed', status: 'On Track' },
    { client: 'Alice Smith', program: 'Stress Management', progress: 60, milestone: 'Week 3 of 6 Completed', status: 'Under Review' },
    { client: 'Robert Johnson', program: 'Cognitive Enhancement', progress: 95, milestone: 'Final Evaluation', status: 'Ahead' }
  ];

  return (
    <div className="coach-dashboard">
      <aside className="coach-sidebar">
        <div className="sidebar-header">
          <h2>CogniWell <span className="coach-badge">Coach</span></h2>
        </div>
        <nav className="sidebar-nav">
          <a href="#behavior-insights" className="nav-item active">🧠 User Behavior Insights</a>
          <a href="#habit-analytics" className="nav-item">🎯 Habit Adherence Analytics</a>
          <a href="#sleep-reports" className="nav-item">🌙 Sleep Trend Reports</a>
          <a href="#progress-monitoring" className="nav-item">📈 Progress Monitoring</a>
          <a href="#appointments" className="nav-item">📅 Appointments</a>
        </nav>
        <div className="sidebar-footer">
          <div className="coach-profile">
            <div className="coach-avatar">{coachAvatar}</div>
            <span className="coach-name">{coachName}</span>
          </div>
          {user && (
            <button onClick={logout} style={{background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '8px', display: 'block'}}>
              🚪 Logout ({user.role})
            </button>
          )}
          <Link to="/" className="back-link">← Back to Home</Link>
        </div>
      </aside>

      <main className="coach-main">
        <header className="main-header">
          <div>
            <h2>Wellness Coach Dashboard — Welcome, {coachName} 👋</h2>
            <span style={{fontSize: '0.85rem', color: '#38a169', fontWeight: 600}}>
              Logged in Account: {user?.email || 'coach@cogniwell.com'}
            </span>
          </div>
          <div className="header-actions">
            <span className="notification-bell">🔔 <span className="bell-badge">3</span></span>
            <button onClick={logout} style={{padding: '6px 12px', background: '#fff5f5', color: '#e53e3e', border: '1px solid #feb2b2', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'}}>
              Sign Out
            </button>
          </div>
        </header>

        {/* Stats Row */}
        <div className="stats-row">
          <div className="stat-card">
            <h3>Active Clients</h3>
            <div className="stat-value">24</div>
          </div>
          <div className="stat-card">
            <h3>Sessions Today</h3>
            <div className="stat-value blue">5</div>
          </div>
          <div className="stat-card">
            <h3>Avg Habit Adherence</h3>
            <div className="stat-value green">83.5%</div>
          </div>
          <div className="stat-card">
            <h3>Sleep Quality Index</h3>
            <div className="stat-value">78/100</div>
          </div>
        </div>

        <div className="content-grid">
          {/* 1. Habit Adherence Analytics */}
          <div className="card full-width" id="habit-analytics">
            <h3>🎯 Habit Adherence Analytics (Client Roster)</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client Name</th>
                  <th>Wellness Score</th>
                  <th>Habit Adherence</th>
                  <th>Avg Sleep</th>
                  <th>Mood Trend</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c, i) => (
                  <tr key={i}>
                    <td style={{fontWeight: 600}}>{c.name}</td>
                    <td>{c.score}/100</td>
                    <td><strong style={{color: '#2b6cb0'}}>{c.habitAdherence}</strong></td>
                    <td>{c.sleepAvg}</td>
                    <td>{c.moodTrend}</td>
                    <td>
                      <span className={`status-badge ${c.status === 'Optimal' || c.status === 'Excellent' ? 'success' : c.status === 'Needs Attention' ? 'warning' : 'danger'}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 2. User Behavior Insights */}
          <div className="card" id="behavior-insights">
            <h3>🧠 User Behavior Insights</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {behaviorInsights.map((b, i) => (
                <div key={i} style={{padding: '12px', background: '#f8fafc', borderRadius: '6px', borderLeft: '4px solid #2b6cb0'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
                    <strong style={{fontSize: '0.9rem', color: '#1a365d'}}>{b.title}</strong>
                    <span style={{fontSize: '0.75rem', fontWeight: 600, color: b.priority === 'High Impact' ? '#38a169' : '#d69e2e'}}>{b.priority}</span>
                  </div>
                  <p style={{margin: 0, fontSize: '0.85rem', color: '#4a5568'}}>{b.insight}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Sleep Trend Reports */}
          <div className="card" id="sleep-reports">
            <h3>🌙 Sleep Trend Reports</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
              {sleepTrendReports.map((r, i) => (
                <div key={i} style={{padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px'}}>
                  <strong style={{fontSize: '0.9rem', color: '#1a365d'}}>{r.period}</strong>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.85rem', color: '#4a5568'}}>
                    <span>Avg Duration: <strong>{r.avgDuration}</strong></span>
                    <span>REM Efficiency: <strong>{r.remEfficiency}</strong></span>
                    <span>Deep Sleep: <strong>{r.deepSleep}</strong></span>
                  </div>
                  <span style={{fontSize: '0.75rem', color: '#38a169', display: 'block', marginTop: '6px', fontWeight: 600}}>{r.trend}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Progress Monitoring */}
          <div className="card full-width" id="progress-monitoring">
            <h3>📈 Progress Monitoring & Milestones</h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px'}}>
              {progressMonitoring.map((pm, idx) => (
                <div key={idx} style={{padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#ffffff'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                    <strong style={{color: '#1a365d'}}>{pm.client}</strong>
                    <span className="status-badge success">{pm.status}</span>
                  </div>
                  <div style={{fontSize: '0.85rem', color: '#718096', marginBottom: '8px'}}>{pm.program} — {pm.milestone}</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <div style={{flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden'}}>
                      <div style={{width: `${pm.progress}%`, height: '100%', background: '#2b6cb0'}} />
                    </div>
                    <span style={{fontSize: '0.85rem', fontWeight: 600, color: '#2b6cb0'}}>{pm.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CoachDashboard;
