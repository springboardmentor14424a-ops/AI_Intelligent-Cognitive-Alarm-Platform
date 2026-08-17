import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './CoachDashboard.css';

const programs = ['Sleep Optimization', 'Stress Management', 'Cognitive Enhancement', 'Habit Formation', 'Mindfulness Training'];
const statusOptions = ['On Track', 'Ahead', 'Under Review', 'Needs Support'];
const milestones = ['Week 1 of 6 Completed', 'Week 2 of 6 Completed', 'Week 3 of 6 Completed', 'Week 4 of 6 Completed', 'Final Evaluation'];

const CoachDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const coachName = user?.name || 'Dr. Sarah Wilson';
  const coachAvatar = user?.avatar || coachName.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // --- DB State ---
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);

  // --- Alarm Sessions State (from alarm_sessions PostgreSQL table) ---
  const [alarmSessions, setAlarmSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const moodOptions = ['😊 😌 😄 😊', '😐 😴 😌 😐', '😄 😊 😄 😄', '😴 😐 😴 😴'];
  const sleepOptions = ['7.8h', '6.2h', '8.1h', '5.5h', '7.2h'];
  const statuses = ['Optimal', 'Excellent', 'Needs Attention', 'At Risk'];

  const fetchAllSessions = () => {
    fetch('http://localhost:5001/api/alarm-sessions/all')
      .then(r => r.json())
      .then(data => {
        const sessions = (data.sessions || []).map(s => ({
          ...s,
          clientName: s.user_name || '—'
        }));
        setAlarmSessions(sessions);
        setLoadingSessions(false);
      })
      .catch(() => setLoadingSessions(false));
  };

  // Fetch assigned clients from PostgreSQL
  useEffect(() => {
    if (!user?.id) return;
    setLoadingClients(true);
    fetch(`http://localhost:5001/api/coach/clients/${user.id}`)
      .then(res => res.json())
      .then(data => {
        const enriched = (data.clients || []).map((c, i) => ({
          ...c,
          habitAdherence: `${70 + Math.floor(Math.random() * 28)}%`,
          sleepAvg: sleepOptions[i % sleepOptions.length],
          moodTrend: moodOptions[i % moodOptions.length],
          lastActive: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${i + 1} days ago`,
          status: statuses[i % statuses.length],
          score: 65 + Math.floor(Math.random() * 30),
          program: programs[i % programs.length],
          progress: 55 + Math.floor(Math.random() * 40),
          milestone: milestones[i % milestones.length],
          programStatus: statusOptions[i % statusOptions.length]
        }));
        setClients(enriched);
        setLoadingClients(false);
      })
      .catch(() => setLoadingClients(false));

    // Fetch ALL users' alarm sessions immediately, then poll every 3 seconds for live updates
    fetchAllSessions();
    const pollInterval = setInterval(fetchAllSessions, 3000);
    return () => clearInterval(pollInterval);
  }, [user?.id]);

  const usersNeedingAttention = clients.filter(c => c.status === 'Needs Attention' || c.status === 'At Risk').length;
  const avgHabitScore = clients.length > 0
    ? (clients.reduce((sum, c) => sum + c.score, 0) / clients.length).toFixed(1)
    : '88.5';

  const totalSessions = alarmSessions.length;
  const solvedSessions = alarmSessions.filter(s => s.challenge_solved).length;
  const challengeSolveRate = totalSessions > 0 ? Math.round((solvedSessions / totalSessions) * 100) : 0;

  // All alarm challenge themes — always show all 5
  const ALARM_THEMES = [
    { key: 'Math Challenge',   icon: '🤖', desc: 'Arithmetic & equations' },
    { key: 'Memory Matrix',    icon: '🧠', desc: 'Sequence memorization' },
    { key: 'Stroop Focus',     icon: '🎨', desc: 'Word-color recognition' },
    { key: 'Logic & Pattern',  icon: '🔢', desc: 'Sequence reasoning' },
    { key: 'Quick Reflexes',   icon: '⚡', desc: 'Speed addition' },
  ];

  const findThemeKey = (themeStr) => {
    if (!themeStr) return null;
    if (themeStr.includes('Math')) return 'Math Challenge';
    if (themeStr.includes('Memory')) return 'Memory Matrix';
    if (themeStr.includes('Stroop') || themeStr.includes('Focus')) return 'Stroop Focus';
    if (themeStr.includes('Logic') || themeStr.includes('Pattern')) return 'Logic & Pattern';
    if (themeStr.includes('Quick') || themeStr.includes('Reflex')) return 'Quick Reflexes';
    return null;
  };

  // Challenge Performance: always all 5 themes, stats from clients' alarm_sessions
  const challengePerformance = (() => {
    const themeMap = {};
    alarmSessions.forEach(s => {
      const key = findThemeKey(s.challenge_theme) || 'Math Challenge';
      if (!themeMap[key]) themeMap[key] = { attempts: 0, solved: 0, totalTime: 0, difficulty: s.difficulty || 'Medium' };
      themeMap[key].attempts++;
      if (s.challenge_solved) themeMap[key].solved++;
      if (s.completion_time) themeMap[key].totalTime += parseInt(s.completion_time) || 0;
      if (s.difficulty) themeMap[key].difficulty = s.difficulty;
    });
    return ALARM_THEMES.map(({ key, icon, desc }) => {
      const stats = themeMap[key] || { attempts: 0, solved: 0, totalTime: 0, difficulty: 'Medium' };
      const pct = stats.attempts > 0 ? Math.round((stats.solved / stats.attempts) * 100) : 0;
      const avgSec = stats.solved > 0 ? (stats.totalTime / stats.solved).toFixed(1) : null;
      const badge = stats.attempts === 0 ? 'No Data' : pct >= 90 ? 'Top 5%' : pct >= 75 ? 'Top 10%' : pct >= 50 ? 'Top 25%' : 'Improving';
      return {
        title: `${icon} ${key}`, desc,
        accuracy: stats.attempts > 0 ? `${pct}%` : '0%',
        pct, attempts: stats.attempts, solved: stats.solved,
        avgTime: avgSec ? `${avgSec}s` : '—',
        level: stats.difficulty,
        scoreBadge: badge,
        hasData: stats.attempts > 0
      };
    });
  })();


  const sleepTrendReports = [
    { period: 'This Week (Jul 22 - Jul 28)', avgDuration: '7.4 hrs', remEfficiency: '86%', deepSleep: '1.8 hrs', trend: '↑ 4% vs last week' },
    { period: 'Previous Week (Jul 15 - Jul 21)', avgDuration: '7.1 hrs', remEfficiency: '82%', deepSleep: '1.6 hrs', trend: 'Stable' }
  ];

  const behaviorInsights = [
    { title: 'Morning Snooze Frequency Reduction', insight: 'Clients using REM Sync alarms snoozed 45% less than static alarm users.', priority: 'High Impact' },
    { title: 'Late Night Screen Time Impact', insight: 'Clients logging screens within 30 min of bed experienced 22% lower deep sleep.', priority: 'Action Required' },
    { title: 'Post-Workout Sleep Recovery', insight: 'Users completing evening wind-down sessions had 15% higher morning alertness scores.', priority: 'Positive' }
  ];

  return (
    <div className="coach-dashboard">
      {/* Sidebar */}
      <aside className="coach-sidebar">
        <div className="sidebar-header">
          <h2>CogniWell <span className="coach-badge">Coach</span></h2>
        </div>
        <nav className="sidebar-nav">
          <Link to="/coach" className="nav-item active">📊 Dashboard</Link>
          <a href="#behavior-insights" className="nav-item">🧠 User Behavior Insights</a>
          <a href="#habit-analytics" className="nav-item">🎯 Habit Adherence Analytics</a>
          <a href="#sleep-reports" className="nav-item">🌙 Sleep Trend Reports</a>
          <a href="#alarm-sessions" className="nav-item">⏰ Alarm Sessions</a>
          <a href="#progress-monitoring" className="nav-item">📈 Progress Monitoring</a>
        </nav>
        <div className="sidebar-footer">
          <div className="coach-profile">
            <div className="coach-avatar">{coachAvatar}</div>
            <span className="coach-name">{coachName}</span>
          </div>
          {user && (
            <button onClick={handleLogout} style={{background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '8px', display: 'block', fontWeight: 600}}>
              🚪 Logout
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
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
          </div>
        </header>

        {/* 1. Overview Stats Cards */}
        <div className="stats-row">
          <div className="stat-card">
            <h3>Assigned Users</h3>
            <div className="stat-value blue">{loadingClients ? '...' : `${clients.length} Users`}</div>
            <span style={{fontSize: '0.8rem', color: '#718096'}}>From PostgreSQL Database</span>
          </div>

          <div className="stat-card">
            <h3>Avg Habit Score</h3>
            <div className="stat-value green">{avgHabitScore}<span style={{fontSize: '1rem', color: '#718096'}}>/100</span></div>
            <span style={{fontSize: '0.8rem', color: '#38a169'}}>Based on Assigned Clients</span>
          </div>

          <div className="stat-card">
            <h3>Avg Wake-up Rate</h3>
            <div className="stat-value green">94.2%</div>
            <span style={{fontSize: '0.8rem', color: '#38a169'}}>+3.2% vs last month</span>
          </div>

          <div className="stat-card">
            <h3>Users Needing Attention</h3>
            <div className="stat-value" style={{color: '#e53e3e'}}>{loadingClients ? '...' : `${usersNeedingAttention} User${usersNeedingAttention !== 1 ? 's' : ''}`}</div>
            <span style={{fontSize: '0.8rem', color: '#e53e3e'}}>Requires Consultation</span>
          </div>

          {/* NEW: Alarm Sessions Stats */}
          <div className="stat-card">
            <h3>Total Alarm Sessions</h3>
            <div className="stat-value blue">{loadingSessions ? '...' : totalSessions}</div>
            <span style={{fontSize: '0.8rem', color: '#718096'}}>From alarm_sessions DB</span>
          </div>

          <div className="stat-card">
            <h3>Challenge Solve Rate</h3>
            <div className="stat-value green">{loadingSessions ? '...' : `${challengeSolveRate}%`}</div>
            <span style={{fontSize: '0.8rem', color: '#38a169'}}>{solvedSessions} of {totalSessions} Solved</span>
          </div>
        </div>

        {/* 2. User Behavior Insights */}
        <div className="card" id="behavior-insights" style={{marginBottom: '24px'}}>
          <h3 className="section-title">🧠 User Behavior Insights</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
            {behaviorInsights.map((item, idx) => (
              <div key={idx} style={{padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                  <strong style={{color: '#1a365d', fontSize: '1rem'}}>{item.title}</strong>
                  <span className="status-badge success">{item.priority}</span>
                </div>
                <p style={{margin: 0, color: '#4a5568', fontSize: '0.9rem'}}>{item.insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Habit Adherence Analytics */}
        <div className="card" id="habit-analytics" style={{marginBottom: '24px'}}>
          <h3 className="section-title">🎯 Habit Adherence Analytics</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Habit Adherence</th>
                <th>Sleep Avg</th>
                <th>Mood Trend</th>
                <th>Last Active</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingClients ? (
                <tr><td colSpan="6" style={{textAlign: 'center', color: '#718096', padding: '20px'}}>⏳ Loading assigned clients from database...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan="6" style={{textAlign: 'center', color: '#718096', padding: '20px'}}>No clients assigned to you yet.</td></tr>
              ) : clients.map((client, idx) => (
                <tr key={idx}>
                  <td><strong>{client.name}</strong><div style={{fontSize:'0.75rem',color:'#718096'}}>{client.email}</div></td>
                  <td><strong style={{color: '#2b6cb0'}}>{client.habitAdherence}</strong></td>
                  <td>{client.sleepAvg}</td>
                  <td style={{fontSize: '1.1rem'}}>{client.moodTrend}</td>
                  <td>{client.lastActive}</td>
                  <td>
                    <span className={`status-badge ${client.status === 'Optimal' || client.status === 'Excellent' ? 'success' : client.status === 'Needs Attention' ? 'warning' : 'danger'}`}>
                      {client.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. Sleep Trend Reports & Alarm Sessions Grid */}
        <div className="content-grid">
          {/* Sleep Trend Reports */}
          <div className="card" id="sleep-reports">
            <h3 className="section-title">🌙 Sleep Trend Reports</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
              {sleepTrendReports.map((report, idx) => (
                <div key={idx} style={{padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px'}}>
                  <h4 style={{margin: '0 0 10px 0', color: '#1a365d', fontSize: '0.95rem'}}>{report.period}</h4>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#4a5568', marginBottom: '8px'}}>
                    <span>Avg Duration: <strong>{report.avgDuration}</strong></span>
                    <span>REM Efficiency: <strong>{report.remEfficiency}</strong></span>
                    <span>Deep Sleep: <strong>{report.deepSleep}</strong></span>
                  </div>
                  <span className="status-badge success">{report.trend}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Monitoring */}
          <div className="card" id="progress-monitoring">
            <h3 className="section-title">📈 Progress Monitoring</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              {loadingClients ? (
                <p style={{color: '#718096', fontSize: '0.9rem'}}>⏳ Loading client progress from database...</p>
              ) : clients.length === 0 ? (
                <p style={{color: '#718096', fontSize: '0.9rem'}}>No clients assigned to monitor yet.</p>
              ) : clients.map((client, idx) => (
                <div key={idx}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.9rem'}}>
                    <strong>{client.name} — <span style={{color: '#4a5568', fontWeight: 500}}>{client.program}</span></strong>
                    <span className={`status-badge ${client.programStatus === 'On Track' || client.programStatus === 'Ahead' ? 'success' : 'warning'}`}>
                      {client.programStatus}
                    </span>
                  </div>
                  <div style={{height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '4px'}}>
                    <div style={{height: '100%', background: '#3182ce', width: `${client.progress}%`, borderRadius: '4px'}}></div>
                  </div>
                  <span style={{fontSize: '0.8rem', color: '#718096'}}>{client.milestone} ({client.progress}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Alarm Sessions from PostgreSQL alarm_sessions table */}
        <div className="card" id="alarm-sessions" style={{marginTop: '24px'}}>
          <h3 className="section-title">⏰ Client Alarm Sessions (from Database)</h3>
          {loadingSessions ? (
            <div style={{color: '#718096', fontSize: '0.9rem', padding: '12px 0'}}>⏳ Loading alarm sessions from database...</div>
          ) : alarmSessions.length === 0 ? (
            <div style={{color: '#718096', fontSize: '0.9rem', padding: '12px 0'}}>No alarm sessions recorded for your clients yet.</div>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <table className="data-table" style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem'}}>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Time of Alarm</th>
                    <th>Alarm Title</th>
                    <th>Challenge Theme</th>
                    <th>Question</th>
                    <th>Correct Ans</th>
                    <th>User Ans</th>
                    <th>Solved</th>
                    <th>Snoozes</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alarmSessions.map((s, idx) => {
                    const dateStr = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '—';
                    return (
                      <tr key={idx}>
                        <td><strong style={{color: '#1a365d'}}>{s.clientName || '—'}</strong></td>
                        <td style={{color: '#4a5568'}}>{dateStr}</td>
                        <td style={{fontWeight: 600, color: '#2b6cb0'}}>{s.alarm_time || '—'}</td>
                        <td><strong style={{fontSize: '0.85rem'}}>{s.alarm_title || '—'}</strong></td>
                      <td>
                        <span style={{background: '#feebc8', color: '#744210', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap'}}>
                          {s.challenge_theme || '—'}
                        </span>
                      </td>
                      <td style={{maxWidth: '160px', color: '#2d3748'}}>{s.question || '—'}</td>
                      <td><span style={{color: '#38a169', fontWeight: 700}}>{s.correct_answer || '—'}</span></td>
                      <td>
                        <span style={{color: s.user_answer === s.correct_answer ? '#38a169' : '#e53e3e', fontWeight: 600}}>
                          {s.user_answer || '—'}
                        </span>
                      </td>
                      <td style={{textAlign: 'center'}}>{s.challenge_solved ? '✅' : '❌'}</td>
                      <td style={{textAlign: 'center', color: '#718096'}}>{s.snooze_count ?? 0}</td>
                      <td>
                        <span className={`status-badge ${s.status === 'Dismissed' ? 'success' : s.status === 'Snoozed' ? 'warning' : 'danger'}`}>
                          {s.status}
                        </span>
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {/* 6. Challenge Performance — from clients' alarm_sessions */}
        <div className="card" id="challenge-performance" style={{marginTop: '24px'}}>
          <h3 className="section-title">🧩 Challenge Performance (Clients)</h3>
          {loadingSessions ? (
            <div style={{color: '#718096', fontSize: '0.9rem'}}>Loading challenge stats from database...</div>
          ) : challengePerformance.length === 0 ? (
            <div style={{color: '#718096', fontSize: '0.9rem'}}>No challenge data recorded yet.</div>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {challengePerformance.map((ch, idx) => {
                const barColor = ch.pct >= 90 ? '#38a169' : ch.pct >= 70 ? '#d69e2e' : '#e53e3e';
                return (
                  <div key={idx} style={{padding: '14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                      <strong style={{color: '#1a365d', fontSize: '0.95rem'}}>{ch.title}</strong>
                      <span className="status-badge success">{ch.scoreBadge}</span>
                    </div>
                    <div style={{display: 'flex', gap: '18px', fontSize: '0.85rem', color: '#4a5568', marginBottom: '8px'}}>
                      <span>Accuracy: <strong style={{color: ch.pct >= 75 ? '#38a169' : '#e53e3e'}}>{ch.accuracy}</strong></span>
                      <span>Avg Speed: <strong>{ch.avgTime}</strong></span>
                      <span>Difficulty: <strong>{ch.level}</strong></span>
                      <span>Sessions: <strong>{ch.solved}/{ch.attempts}</strong></span>
                    </div>
                    <div style={{height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden'}}>
                      <div style={{height: '100%', width: `${ch.pct}%`, background: barColor, borderRadius: '3px'}}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default CoachDashboard;
