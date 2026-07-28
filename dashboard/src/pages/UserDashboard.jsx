import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './UserDashboard.css';

const UserDashboard = () => {
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
    
    // Format 24h to 12h AM/PM
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

  const sleepData = [
    { day: 'Mon', hours: 7 },
    { day: 'Tue', hours: 6.5 },
    { day: 'Wed', hours: 8 },
    { day: 'Thu', hours: 7.5 },
    { day: 'Fri', hours: 6 },
    { day: 'Sat', hours: 9 },
    { day: 'Sun', hours: 8.5 }
  ];
  const maxSleep = Math.max(...sleepData.map(d => d.hours));

  const moodHistory = [
    { emoji: '😊', date: 'Jul 28', note: 'Feeling rested and energetic' },
    { emoji: '😌', date: 'Jul 27', note: 'Calm day, good focus' },
    { emoji: '😴', date: 'Jul 26', note: 'A bit tired in the afternoon' },
    { emoji: '😄', date: 'Jul 25', note: 'Great workout, very positive' },
    { emoji: '😐', date: 'Jul 24', note: 'Average day, nothing special' }
  ];

  const activeAlarmsCount = alarms.filter(a => a.status === 'Active').length;

  return (
    <div className="ud-container">
      {/* Sidebar */}
      <aside className="ud-sidebar">
        <div className="ud-logo">CogniWell</div>
        
        <nav className="ud-nav">
          <Link to="/user" className="ud-nav-item active">
            <span>📊</span> Dashboard
          </Link>
          <a href="#alarms-section" className="ud-nav-item">
            <span>⏰</span> My Alarms
          </a>
          <a href="#sleep-section" className="ud-nav-item">
            <span>🌙</span> Sleep Log
          </a>
          <a href="#mood-section" className="ud-nav-item">
            <span>😊</span> Mood Tracker
          </a>
          <a href="#tips-section" className="ud-nav-item">
            <span>⚙️</span> Wellness Tips
          </a>
        </nav>

        <div className="ud-sidebar-footer">
          <div className="ud-user-info">
            <div className="ud-avatar">JD</div>
            <span className="ud-user-name">John Doe</span>
          </div>
          <Link to="/" className="ud-back-link">
            <span>←</span> Back to Home
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ud-main-content">
        <header className="ud-header">
          <h2>Welcome back, John 👋</h2>
          <span className="ud-date">{currentDate}</span>
        </header>

        {/* Stats Row */}
        <div className="ud-stats-grid">
          <div className="ud-card">
            <div className="ud-stat-title">Sleep Score</div>
            <div className="ud-stat-value">85<span style={{fontSize: '1rem', color: '#718096'}}>/100</span></div>
            <div className="ud-progress-bar-bg">
              <div className="ud-progress-bar-fill" style={{ width: '85%' }}></div>
            </div>
          </div>
          <div className="ud-card">
            <div className="ud-stat-title">Mood Level</div>
            <div className="ud-stat-value green">Good 😊</div>
          </div>
          <div className="ud-card">
            <div className="ud-stat-title">Active Alarms</div>
            <div className="ud-stat-value blue">{activeAlarmsCount}</div>
          </div>
          <div className="ud-card">
            <div className="ud-stat-title">Streak</div>
            <div className="ud-stat-value">12 days 🔥</div>
          </div>
        </div>

        <div className="ud-main-grid">
          {/* Today's Alarms */}
          <div className="ud-card" id="alarms-section">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
              <h3 className="ud-section-title" style={{margin: 0, border: 'none', padding: 0}}>My Cognitive Alarms</h3>
              <button 
                className="ud-btn-add-alarm" 
                onClick={() => setShowModal(true)}
              >
                + Set New Alarm
              </button>
            </div>

            <div className="ud-alarms-list">
              {alarms.map(alarm => (
                <div key={alarm.id} className="ud-alarm-item">
                  <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                      <span className="ud-alarm-time">{alarm.time}</span>
                      <span className="ud-alarm-label">{alarm.label}</span>
                    </div>
                    <span style={{fontSize: '0.75rem', color: '#718096'}}>Mode: {alarm.type}</span>
                  </div>

                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <span 
                      className={`ud-badge ${alarm.status.toLowerCase()}`}
                      onClick={() => toggleAlarmStatus(alarm.id)}
                      style={{cursor: 'pointer'}}
                      title="Click to toggle status"
                    >
                      {alarm.status}
                    </span>
                    <button 
                      onClick={() => deleteAlarm(alarm.id)}
                      style={{background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.9rem'}}
                      title="Delete Alarm"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weekly Sleep Pattern */}
          <div className="ud-card" id="sleep-section">
            <h3 className="ud-section-title">Weekly Sleep Pattern</h3>
            <div className="ud-chart-container">
              {sleepData.map((data, index) => (
                <div key={index} className="ud-chart-bar-wrapper">
                  <span className="ud-chart-value">{data.hours}h</span>
                  <div 
                    className="ud-chart-bar" 
                    style={{ height: `${(data.hours / maxSleep) * 100}%` }}
                  ></div>
                  <span className="ud-chart-label">{data.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ud-main-grid">
          {/* Mood History */}
          <div className="ud-card" id="mood-section">
            <h3 className="ud-section-title">Mood History</h3>
            <table className="ud-mood-table">
              <tbody>
                {moodHistory.map((item, index) => (
                  <tr key={index} className="ud-mood-row">
                    <td className="ud-mood-cell ud-mood-emoji">{item.emoji}</td>
                    <td className="ud-mood-cell ud-mood-date">{item.date}</td>
                    <td className="ud-mood-cell">{item.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Wellness Tips */}
          <div id="tips-section">
            <h3 className="ud-section-title" style={{paddingLeft: '4px', border: 'none', marginBottom: '16px'}}>Wellness Tips</h3>
            <div className="ud-tips-grid" style={{gridTemplateColumns: '1fr', gap: '16px'}}>
              <div className="ud-tip-card">
                <div className="ud-tip-icon">💧</div>
                <div className="ud-tip-content">
                  <h4>Stay Hydrated</h4>
                  <p>Aim for at least 8 glasses of water daily to maintain energy.</p>
                </div>
              </div>
              <div className="ud-tip-card">
                <div className="ud-tip-icon">🚶</div>
                <div className="ud-tip-content">
                  <h4>Take Breaks</h4>
                  <p>Stand up and stretch every hour to improve blood circulation.</p>
                </div>
              </div>
              <div className="ud-tip-card">
                <div className="ud-tip-icon">📵</div>
                <div className="ud-tip-content">
                  <h4>Digital Detox</h4>
                  <p>Avoid screens for 30 minutes before bed for better sleep.</p>
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
                <input 
                  type="time" 
                  value={newTime} 
                  onChange={(e) => setNewTime(e.target.value)} 
                  required 
                />
              </div>

              <div className="ud-form-group">
                <label>Alarm Title / Label:</label>
                <input 
                  type="text" 
                  placeholder="e.g. Early Morning Study Session" 
                  value={newLabel} 
                  onChange={(e) => setNewLabel(e.target.value)} 
                  required 
                />
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
