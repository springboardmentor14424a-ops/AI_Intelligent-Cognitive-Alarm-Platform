import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './UserDashboard.css';

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const userName = user?.name || 'John Doe';
  const userAvatar = user?.avatar || userName.split(' ').map(n => n[0]).join('').toUpperCase();

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Stateful Alarm List
  const [alarms, setAlarms] = useState([
    { id: 1, time: '06:30 AM', label: 'Morning REM Wake-up', status: 'Completed', type: 'REM Sync' },
    { id: 2, time: '07:00 AM', label: 'Cognitive Boost & Meds', status: 'Snoozed', type: 'Voice Prompt' },
    { id: 3, time: '12:00 PM', label: 'Hydration & Posture Check', status: 'Active', type: 'Gentle Tone' },
    { id: 4, time: '10:30 PM', label: 'Wind-Down & Sleep Prep', status: 'Active', type: 'Dim Light' }
  ]);

  // Modal State for Setting Alarms
  const [showModal, setShowModal] = useState(false);
  const [newTime, setNewTime] = useState('08:00');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('REM Sync');

  const toggleAlarmStatus = (id) => {
    setAlarms(prev => prev.map(alarm => {
      if (alarm.id === id) {
        const nextStatus = alarm.status === 'Active' ? 'Disabled' : 'Active';
        return { ...alarm, status: nextStatus };
      }
      return alarm;
    }));
  };

  const deleteAlarm = (id) => {
    setAlarms(prev => prev.filter(alarm => alarm.id !== id));
  };

  const handleAddAlarm = (e) => {
    e.preventDefault();
    if (!newLabel) return;
    
    const [hours, minutes] = newTime.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 || 12;
    const formattedTime = `${formattedHours.toString().padStart(2, '0')}:${minutes} ${ampm}`;

    const newAlarmObj = {
      id: Date.now(),
      time: formattedTime,
      label: newLabel,
      status: 'Active',
      type: newType
    };

    setAlarms([newAlarmObj, ...alarms]);
    setNewLabel('');
    setShowModal(false);
  };

  // Mock data for new required sections
  const alarmHistory = [
    { date: 'Today, Jul 29', time: '06:30 AM', label: 'Morning REM Sync', action: 'Dismissed on 1st ring', snoozeCount: 0, status: 'On-Time' },
    { date: 'Yesterday, Jul 28', time: '06:30 AM', label: 'Morning REM Sync', action: 'Snoozed 1 time', snoozeCount: 1, status: 'Delayed' },
    { date: 'Jul 27', time: '07:00 AM', label: 'Weekend Routine', action: 'Dismissed', snoozeCount: 0, status: 'On-Time' },
    { date: 'Jul 26', time: '06:30 AM', label: 'Morning REM Sync', action: 'Dismissed on 1st ring', snoozeCount: 0, status: 'On-Time' }
  ];

  const habitScores = [
    { name: 'Consistent Sleep Time', score: 92, status: 'Excellent', icon: '🌙' },
    { name: 'Morning Hydration', score: 85, status: 'Good', icon: '💧' },
    { name: 'No Screens Before Bed', score: 74, status: 'Needs Focus', icon: '📵' },
    { name: 'Cognitive Puzzle Speed', score: 95, status: 'Superior', icon: '⚡' }
  ];

  const challengePerformance = [
    { title: 'Math Puzzle Challenge', accuracy: '98%', avgTime: '3.2s', level: 'Hard', scoreBadge: 'Top 5%' },
    { title: 'Memory Pattern Matrix', accuracy: '94%', avgTime: '4.5s', level: 'Medium', scoreBadge: 'Top 10%' },
    { title: 'Stroop Color Response', accuracy: '100%', avgTime: '2.1s', level: 'Expert', scoreBadge: 'Top 1%' }
  ];

  const activeAlarmsCount = alarms.filter(a => a.status === 'Active').length;

  return (
    <div className="ud-container">
      {/* Sidebar Navigation */}
      <aside className="ud-sidebar">
        <div className="ud-logo">CogniWell</div>
        
        <nav className="ud-nav">
          <Link to="/user" className="ud-nav-item active">📊 Dashboard</Link>
          <a href="#alarms-section" className="ud-nav-item">⏰ My Alarms</a>
          <a href="#alarm-history-section" className="ud-nav-item">📜 Alarm History</a>
          <a href="#wakeup-stats-section" className="ud-nav-item">📈 Wake-up Statistics</a>
          <a href="#habit-score-section" className="ud-nav-item">🎯 Habit Score</a>
          <a href="#challenge-section" className="ud-nav-item">🧩 Challenge Performance</a>
          <a href="#productivity-section" className="ud-nav-item">💡 Productivity Insights</a>
        </nav>

        <div className="ud-sidebar-footer">
          <div className="ud-user-info">
            <div className="ud-avatar">{userAvatar}</div>
            <span className="ud-user-name">{userName}</span>
          </div>
          {user && (
            <button onClick={logout} style={{background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '8px', display: 'block'}}>
              🚪 Logout ({user.role})
            </button>
          )}
          <Link to="/" className="ud-back-link">← Back to Home</Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ud-main-content">
        <header className="ud-header">
          <div>
            <h2>Welcome back, {userName} 👋</h2>
            <span style={{fontSize: '0.85rem', color: '#3182ce', fontWeight: 600}}>
              Logged in Account: {user?.email || 'user@cogniwell.com'}
            </span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
            <span className="ud-date">{currentDate}</span>
            <button onClick={logout} style={{padding: '6px 12px', background: '#fff5f5', color: '#e53e3e', border: '1px solid #feb2b2', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem'}}>
              Sign Out
            </button>
          </div>
        </header>

        {/* 1. Wake-up Statistics Overview Cards */}
        <div className="ud-stats-grid" id="wakeup-stats-section">
          <div className="ud-card">
            <div className="ud-stat-title">Wake-up Statistics</div>
            <div className="ud-stat-value blue">06:34 AM</div>
            <div style={{fontSize: '0.8rem', color: '#718096', marginTop: '4px'}}>Avg Wake-up Time (On Time: 95%)</div>
          </div>
          <div className="ud-card">
            <div className="ud-stat-title">Habit Score</div>
            <div className="ud-stat-value green">88.5<span style={{fontSize: '1rem', color: '#718096'}}>/100</span></div>
            <div className="ud-progress-bar-bg">
              <div className="ud-progress-bar-fill" style={{ width: '88.5%' }}></div>
            </div>
          </div>
          <div className="ud-card">
            <div className="ud-stat-title">Challenge Accuracy</div>
            <div className="ud-stat-value blue">97.3%</div>
            <div style={{fontSize: '0.8rem', color: '#38a169', marginTop: '4px'}}>+2.4% vs last week</div>
          </div>
          <div className="ud-card">
            <div className="ud-stat-title">Active Alarms</div>
            <div className="ud-stat-value">{activeAlarmsCount} Active</div>
            <div style={{fontSize: '0.8rem', color: '#718096', marginTop: '4px'}}>Streak: 12 days 🔥</div>
          </div>
        </div>

        {/* 2. My Alarms Section */}
        <div className="ud-card" id="alarms-section" style={{marginBottom: '24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3 className="ud-section-title" style={{margin: 0, border: 'none', padding: 0}}>My Cognitive Alarms</h3>
            <button className="ud-btn-add-alarm" onClick={() => setShowModal(true)}>+ Set New Alarm</button>
          </div>
          <div className="ud-alarms-list">
            {alarms.map(alarm => (
              <div key={alarm.id} className="ud-alarm-item">
                <div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <span className="ud-alarm-time">{alarm.time}</span>
                    <span className="ud-alarm-label">{alarm.label}</span>
                  </div>
                  <span style={{fontSize: '0.75rem', color: '#718096'}}>Mode: {alarm.type}</span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  <span className={`ud-badge ${alarm.status.toLowerCase()}`} onClick={() => toggleAlarmStatus(alarm.id)} style={{cursor: 'pointer'}}>
                    {alarm.status}
                  </span>
                  <button onClick={() => deleteAlarm(alarm.id)} style={{background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer'}}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Alarm History & Challenge Performance Grid */}
        <div className="ud-main-grid">
          {/* Alarm History */}
          <div className="ud-card" id="alarm-history-section">
            <h3 className="ud-section-title">📜 Alarm History</h3>
            <table className="ud-mood-table">
              <thead>
                <tr style={{textAlign: 'left', color: '#718096', fontSize: '0.8rem'}}>
                  <th style={{paddingBottom: '8px'}}>Date</th>
                  <th style={{paddingBottom: '8px'}}>Time</th>
                  <th style={{paddingBottom: '8px'}}>Response</th>
                  <th style={{paddingBottom: '8px'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {alarmHistory.map((item, index) => (
                  <tr key={index} className="ud-mood-row">
                    <td className="ud-mood-cell" style={{fontWeight: 600, fontSize: '0.85rem'}}>{item.date}</td>
                    <td className="ud-mood-cell ud-mood-date">{item.time}</td>
                    <td className="ud-mood-cell" style={{fontSize: '0.85rem'}}>{item.action}</td>
                    <td className="ud-mood-cell">
                      <span className={`ud-badge ${item.status === 'On-Time' ? 'active' : 'snoozed'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Challenge Performance */}
          <div className="ud-card" id="challenge-section">
            <h3 className="ud-section-title">🧩 Challenge Performance</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {challengePerformance.map((challenge, index) => (
                <div key={index} style={{padding: '12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#f8fafc'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                    <strong style={{color: '#1a365d', fontSize: '0.95rem'}}>{challenge.title}</strong>
                    <span className="ud-badge active">{challenge.scoreBadge}</span>
                  </div>
                  <div style={{display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#4a5568'}}>
                    <span>Accuracy: <strong>{challenge.accuracy}</strong></span>
                    <span>Avg Speed: <strong>{challenge.avgTime}</strong></span>
                    <span>Difficulty: <strong>{challenge.level}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Habit Score & Productivity Insights Grid */}
        <div className="ud-main-grid">
          {/* Habit Score Details */}
          <div className="ud-card" id="habit-score-section">
            <h3 className="ud-section-title">🎯 Habit Score Analytics</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
              {habitScores.map((habit, idx) => (
                <div key={idx}>
                  <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px'}}>
                    <span>{habit.icon} {habit.name}</span>
                    <strong style={{color: '#2b6cb0'}}>{habit.score}/100 ({habit.status})</strong>
                  </div>
                  <div className="ud-progress-bar-bg">
                    <div className="ud-progress-bar-fill" style={{ width: `${habit.score}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Productivity Insights */}
          <div className="ud-card" id="productivity-section">
            <h3 className="ud-section-title">💡 Productivity Insights</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
              <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px', background: '#ebf8ff', borderRadius: '6px'}}>
                <span style={{fontSize: '1.4rem'}}>⚡</span>
                <div>
                  <h4 style={{margin: '0 0 2px 0', color: '#1a365d', fontSize: '0.95rem'}}>Peak Energy Window</h4>
                  <p style={{margin: 0, color: '#2b6cb0', fontSize: '0.85rem'}}>Your cognitive focus peaks between <strong>09:00 AM – 11:30 AM</strong> based on wake-up timing.</p>
                </div>
              </div>
              <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px', background: '#f0fff4', borderRadius: '6px'}}>
                <span style={{fontSize: '1.4rem'}}>🧠</span>
                <div>
                  <h4 style={{margin: '0 0 2px 0', color: '#22543d', fontSize: '0.95rem'}}>Cognitive Alertness Rating</h4>
                  <p style={{margin: 0, color: '#2f855a', fontSize: '0.85rem'}}>Morning puzzle speed improved by <strong>18%</strong> after switching to REM Sleep Sync alarm.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Set Alarm Modal */}
      {showModal && (
        <div className="ud-modal-overlay">
          <div className="ud-modal-content">
            <h3>Set New Cognitive Alarm</h3>
            <form onSubmit={handleAddAlarm}>
              <div className="ud-form-group">
                <label>Alarm Time:</label>
                <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} required />
              </div>
              <div className="ud-form-group">
                <label>Alarm Title / Label:</label>
                <input type="text" placeholder="e.g. Early Study Session" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} required />
              </div>
              <div className="ud-form-group">
                <label>Adaptive Trigger Mode:</label>
                <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                  <option value="REM Sync">REM Sleep Sync (Adapts to light sleep phase)</option>
                  <option value="Voice Prompt">AI Voice Motivation</option>
                  <option value="Gentle Tone">Gradual Sound Ramping</option>
                  <option value="Dim Light">Smart Light Adaptation</option>
                </select>
              </div>
              <div className="ud-modal-actions">
                <button type="button" className="ud-btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="ud-btn-submit">Save Alarm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
