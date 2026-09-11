import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './UserDashboard.css';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

const HabitScorePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [dailyHistory, setDailyHistory] = useState([]);
  const [selectedDayRow, setSelectedDayRow] = useState(null);
  const [hoveredDay, setHoveredDay] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [userMessages, setUserMessages] = useState([]);
  const [userUnreadCount, setUserUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifTab, setNotifTab] = useState('all');

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric'
  });

  const userName = user?.name || 'User';
  const userAvatar = userName.charAt(0).toUpperCase();

  const handleLogout = () => { logout(); navigate('/'); };

  const formatDateLabel = (dStr) => {
    if (!dStr) return 'Today';
    const d = new Date(dStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateFull = (dStr) => {
    if (!dStr) return 'Today';
    const d = new Date(dStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fetchWeightedModel = () => {
    const userId = user?.id || 20;
    fetch(`${API_BASE_URL}/api/user/weighted-scoring-model?userId=${userId}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        const history = data?.dailyHistory || (data?.model ? [data.model] : []);
        setDailyHistory(history);
        if (!selectedDayRow && history.length > 0) setSelectedDayRow(history[0]);
        else if (history.length > 0) {
          setSelectedDayRow(prev => prev
            ? (history.find(r => r.id === prev.id || r.score_date === prev.score_date) || history[0])
            : history[0]);
        }
      })
      .catch(() => {});
  };

  const fetchRecommendations = () => {
    const userId = user?.id || 20;
    fetch(`${API_BASE_URL}/api/user/recommendations?userId=${userId}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data?.recommendations) setRecommendations(data.recommendations);
      })
      .catch(() => {});
  };

  const fetchUserMessages = () => {
    const userId = user?.id || 20;
    fetch(`${API_BASE_URL}/api/user/messages/${userId}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        setUserMessages(data.messages || []);
        setUserUnreadCount(data.unread_count || 0);
      })
      .catch(() => {});
  };

  const markUserMessagesAsRead = async () => {
    const userId = user?.id || 20;
    try {
      await fetch(`${API_BASE_URL}/api/messages/mark-read`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'user', id: userId })
      });
      setUserUnreadCount(0);
      fetchUserMessages();
    } catch {}
  };

  useEffect(() => {
    fetchWeightedModel();
    fetchRecommendations();
    fetchUserMessages();
  }, [user?.id]);

  // Active record for top stat cards (selected day or today)

  const activeRecord = selectedDayRow || dailyHistory[0] || {
    habit_score: 85, wake_up_consistency: 85,
    challenge_completion_success: 90, snooze_reduction: 88,
    sleep_schedule_adherence: 92, total_sessions: 0,
    total_snoozes: 0, solved_count: 0
  };

  const displayHabitScore = Math.round(Number(activeRecord.habit_score || 85));
  const displayWakeUp = Math.round(Number(activeRecord.wake_up_consistency || 85));
  const displayChallenge = Math.round(Number(activeRecord.challenge_completion_success || 90));
  const displaySnooze = Math.round(Number(activeRecord.snooze_reduction || 88));
  const displaySessions = activeRecord.total_sessions || 0;
  const displaySnoozes = activeRecord.total_snoozes || 0;
  const displaySolved = activeRecord.solved_count || 0;
  const displayDate = activeRecord.score_date ? formatDateFull(activeRecord.score_date) : 'Today';

  // SVG Trend Graph — chronological (oldest left → newest right)
  const graphWidth = 820;
  const graphHeight = 220;
  const paddingX = 60;
  const paddingY = 35;
  const effectiveWidth = graphWidth - paddingX * 2;
  const effectiveHeight = graphHeight - paddingY * 2;

  const graphHistory = [...dailyHistory].reverse(); // oldest first for left-to-right trend

  const graphPoints = graphHistory.map((row, idx) => {
    const score = Number(row.habit_score || 85);
    const x = graphHistory.length === 1
      ? graphWidth / 2
      : paddingX + (idx / (graphHistory.length - 1)) * effectiveWidth;
    const y = paddingY + (1 - score / 100) * effectiveHeight;
    return { ...row, score: Math.round(score), x, y, dateLabel: formatDateLabel(row.score_date) };
  });

  const pathData = graphPoints.reduce((acc, p, idx) =>
    idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');

  const areaData = graphPoints.length > 0
    ? `${pathData} L ${graphPoints[graphPoints.length - 1].x} ${graphHeight - paddingY + 20} L ${graphPoints[0].x} ${graphHeight - paddingY + 20} Z`
    : '';

  return (
    <div className="ud-container">
      {/* Sidebar */}
      <aside className="ud-sidebar">
        <div className="ud-logo">CogniWell</div>
        <nav className="ud-nav">
          <Link to="/user" className="ud-nav-item">📊 Dashboard</Link>
          <Link to="/user" className="ud-nav-item">📈 Wake-up Statistics</Link>
          <Link to="/user" className="ud-nav-item">⏰ My Alarms</Link>
          <Link to="/user" className="ud-nav-item">📜 Alarm History</Link>
          <Link to="/user/habit-score" className="ud-nav-item active">🎯 Habit Score</Link>
          <Link to="/user/challenge-performance" className="ud-nav-item">🧩 Challenge Performance</Link>
          <Link to="/user/productivity-insights" className="ud-nav-item">💡 Productivity Insights</Link>
        </nav>
        <div className="ud-sidebar-footer">
          <div className="ud-user-info">
            <div className="ud-avatar">{userAvatar}</div>
            <span className="ud-user-name">{userName}</span>
          </div>
          <button onClick={handleLogout} style={{background:'none',border:'none',color:'#e53e3e',cursor:'pointer',fontSize:'0.85rem',display:'block',fontWeight:600}}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ud-main-content">
        <header className="ud-header">
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
              <Link to="/user" style={{color:'#3182ce',textDecoration:'none',fontSize:'0.9rem',fontWeight:600}}>← Back to Dashboard</Link>
            </div>
            <h2>🎯 Habit Score Analytics</h2>
            <span style={{fontSize:'0.85rem',color:'#3182ce',fontWeight:600}}>
              Stored per day, recalculated on every alarm dismissal — {userName} (User ID #{user?.id || 20})
            </span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            <span className="ud-date">{currentDate}</span>

            {/* Notification Bell Symbol */}
            <div style={{position: 'relative'}}>
              <div
                className="notification-bell"
                onClick={() => setShowNotifications(v => !v)}
                title="Notifications"
                style={{cursor: 'pointer', position: 'relative', fontSize: '1.35rem', userSelect: 'none'}}
              >
                🔔 {(userUnreadCount + recommendations.length) > 0 && (
                  <span className="bell-badge">{userUnreadCount + recommendations.length}</span>
                )}
              </div>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div
                  style={{
                    position: 'absolute', top: '135%', right: 0, zIndex: 1000,
                    width: '380px', background: '#fff', borderRadius: '10px',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.18)', border: '1px solid #e2e8f0',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{padding: '12px 16px', background: '#1a365d', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <span style={{fontWeight: 700, fontSize: '0.92rem'}}>
                      🔔 Notifications {(userUnreadCount + recommendations.length) > 0 ? `(${userUnreadCount + recommendations.length})` : ''}
                    </span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      style={{background: 'none', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer', opacity: 0.8}}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Tabs */}
                  <div style={{display: 'flex', background: '#edf2f7', borderBottom: '1px solid #e2e8f0', padding: '4px'}}>
                    <button
                      onClick={() => setNotifTab('all')}
                      style={{
                        flex: 1, padding: '6px 8px', fontSize: '0.75rem', fontWeight: 600,
                        border: 'none', borderRadius: '6px', cursor: 'pointer',
                        background: notifTab === 'all' ? '#fff' : 'transparent',
                        color: notifTab === 'all' ? '#2b6cb0' : '#718096',
                        boxShadow: notifTab === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      All ({userUnreadCount + recommendations.length})
                    </button>
                    <button
                      onClick={() => setNotifTab('recommendations')}
                      style={{
                        flex: 1, padding: '6px 8px', fontSize: '0.75rem', fontWeight: 600,
                        border: 'none', borderRadius: '6px', cursor: 'pointer',
                        background: notifTab === 'recommendations' ? '#fff' : 'transparent',
                        color: notifTab === 'recommendations' ? '#2b6cb0' : '#718096',
                        boxShadow: notifTab === 'recommendations' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      💡 Recommendations ({recommendations.length})
                    </button>
                    <button
                      onClick={() => setNotifTab('messages')}
                      style={{
                        flex: 1, padding: '6px 8px', fontSize: '0.75rem', fontWeight: 600,
                        border: 'none', borderRadius: '6px', cursor: 'pointer',
                        background: notifTab === 'messages' ? '#fff' : 'transparent',
                        color: notifTab === 'messages' ? '#2b6cb0' : '#718096',
                        boxShadow: notifTab === 'messages' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      💬 Messages ({userMessages.length})
                    </button>
                  </div>

                  {/* Notification List */}
                  <div style={{maxHeight: '340px', overflowY: 'auto'}}>
                    {(notifTab === 'all' || notifTab === 'recommendations') && (
                      <div>
                        <div style={{padding: '8px 14px', background: '#f7fafc', borderBottom: '1px solid #edf2f7', fontSize: '0.72rem', fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                          💡 Recommendations (Weighted Scoring Model)
                        </div>
                        {recommendations.map((rec, i) => (
                          <div
                            key={rec.id || i}
                            onClick={() => {
                              setShowNotifications(false);
                              navigate('/user/productivity-insights#recommendations-section');
                            }}
                            style={{
                              padding: '12px 14px',
                              borderBottom: '1px solid #edf2f7',
                              cursor: 'pointer',
                              background: '#fff',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#ebf8ff'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                          >
                            <div style={{display: 'flex', alignItems: 'flex-start', gap: '10px'}}>
                              <span style={{fontSize: '1.25rem', marginTop: '2px'}}>{rec.icon}</span>
                              <div style={{flex: 1}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px'}}>
                                  <strong style={{fontSize: '0.82rem', color: '#1a365d'}}>{rec.titleWithStep}</strong>
                                  <span style={{fontSize: '0.68rem', background: '#e2e8f0', color: '#2b6cb0', padding: '1px 6px', borderRadius: '4px', fontWeight: 600}}>
                                    Active
                                  </span>
                                </div>
                                <p style={{margin: '0 0 4px 0', fontSize: '0.76rem', color: '#4a5568', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                                  {rec.description}
                                </p>
                                <span style={{fontSize: '0.7rem', color: '#3182ce', fontWeight: 600}}>
                                  👉 Click to view in Active Recommendations →
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {(notifTab === 'all' || notifTab === 'messages') && (
                      <div>
                        <div style={{padding: '8px 14px', background: '#f7fafc', borderBottom: '1px solid #edf2f7', fontSize: '0.72rem', fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                          💬 Wellness Coach Messages
                        </div>
                        {userMessages.filter(m => m.sender_type === 'coach').length === 0 ? (
                          <div style={{padding: '16px', textAlign: 'center', color: '#a0aec0', fontSize: '0.8rem'}}>No messages from your coach yet.</div>
                        ) : (
                          userMessages.filter(m => m.sender_type === 'coach').map((m, i) => (
                            <div
                              key={m.id || i}
                              onClick={() => {
                                setShowNotifications(false);
                                if (!m.is_read) markUserMessagesAsRead();
                                navigate('/user#coach-messaging-section');
                              }}
                              style={{
                                padding: '12px 14px',
                                borderBottom: '1px solid #edf2f7',
                                cursor: 'pointer',
                                background: !m.is_read ? '#f0fff4' : '#fff',
                                transition: 'background 0.15s ease'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#ebf8ff'}
                              onMouseLeave={e => e.currentTarget.style.background = !m.is_read ? '#f0fff4' : '#fff'}
                            >
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px'}}>
                                <strong style={{fontSize: '0.82rem', color: '#2b6cb0'}}>🧑‍⚕️ {m.coach_name || 'Wellness Coach'}</strong>
                                <span style={{fontSize: '0.68rem', color: '#a0aec0'}}>
                                  {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                                </span>
                              </div>
                              <div style={{fontSize: '0.78rem', fontWeight: 600, color: '#2d3748', marginBottom: '2px'}}>
                                {m.subject || 'Wellness Guidance'}
                              </div>
                              <p style={{margin: '0 0 4px 0', fontSize: '0.75rem', color: '#4a5568', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'}}>
                                {m.message}
                              </p>
                              <span style={{fontSize: '0.7rem', color: '#38a169', fontWeight: 600}}>
                                👉 Click to view in Wellness Coach Communication →
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Info Banner */}
        <div style={{background:'#ebf8ff',border:'1px solid #bee3f8',padding:'12px 18px',borderRadius:'8px',marginBottom:'20px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
          <div>
            <span style={{fontSize:'0.85rem',color:'#2b6cb0',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.5px'}}>Inspecting:</span>
            <span style={{fontSize:'1.1rem',fontWeight:800,color:'#2c5282',marginLeft:'8px'}}>📅 {displayDate}</span>
            <span style={{marginLeft:'12px',fontSize:'0.8rem',background:'#3182ce',color:'#fff',padding:'2px 8px',borderRadius:'12px',fontWeight:600}}>
              {displaySessions} Sessions • {displaySnoozes} Snoozes • {displaySolved} Solved
            </span>
          </div>
        </div>

        {/* Top Stat Cards */}
        <div className="ud-stats-grid" style={{gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',marginBottom:'24px'}}>
          <div className="ud-card" style={{borderTop:'4px solid #3182ce'}}>
            <div className="ud-stat-title">
              {selectedDayRow?.score_date ? `HABIT SCORE (${formatDateLabel(selectedDayRow.score_date)})` : 'TODAY\'S HABIT SCORE'}
            </div>
            <div className="ud-stat-value blue">{displayHabitScore}/100</div>
            <div style={{fontSize:'0.8rem',color:'#38a169',marginTop:'4px',fontWeight:600}}>🔥 Stored in "Weighted Scoring Model"</div>
          </div>
          <div className="ud-card" style={{borderTop:'4px solid #38a169'}}>
            <div className="ud-stat-title">WAKE-UP CONSISTENCY (35%)</div>
            <div className="ud-stat-value green">{displayWakeUp}%</div>
            <div style={{fontSize:'0.8rem',color:'#718096',marginTop:'4px'}}>⏱️ Dismissed / total sessions on this day</div>
          </div>
          <div className="ud-card" style={{borderTop:'4px solid #805ad5'}}>
            <div className="ud-stat-title">SNOOZE REDUCTION (20%)</div>
            <div className="ud-stat-value" style={{color:'#805ad5'}}>{displaySnooze}%</div>
            <div style={{fontSize:'0.8rem',color:'#718096',marginTop:'4px'}}>💤 {displaySnoozes} snoozes across all alarms today</div>
          </div>
          <div className="ud-card" style={{borderTop:'4px solid #dd6b20'}}>
            <div className="ud-stat-title">CHALLENGE SUCCESS (25%)</div>
            <div className="ud-stat-value" style={{color:'#dd6b20'}}>{displayChallenge}%</div>
            <div style={{fontSize:'0.8rem',color:'#718096',marginTop:'4px'}}>🧠 Puzzles solved: {displaySolved}/{displaySessions}</div>
          </div>
        </div>

        {/* Daily Habit Score Trend Graph */}
        <div className="ud-card" style={{marginBottom:'24px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'8px',marginBottom:'16px'}}>
            <div>
              <h3 className="ud-section-title" style={{margin:0,border:'none',padding:0}}>📈 Daily Habit Score Trend</h3>
              <p style={{margin:'4px 0 0 0',color:'#718096',fontSize:'0.85rem'}}>
                Chronological score history from PostgreSQL table <code>"Weighted Scoring Model"</code> — 1 row per day, recalculated per alarm dismissal
              </p>
            </div>
            {hoveredDay && (
              <span style={{fontSize:'0.85rem',background:'#ebf8ff',color:'#2b6cb0',padding:'4px 14px',borderRadius:'20px',fontWeight:600,border:'1px solid #bee3f8'}}>
                📅 {hoveredDay.dateLabel}: <strong>{hoveredDay.score}%</strong> (Wake: {Math.round(hoveredDay.wake_up_consistency)}%, Challenge: {Math.round(hoveredDay.challenge_completion_success)}%, Snooze: {Math.round(hoveredDay.snooze_reduction)}%)
              </span>
            )}
          </div>

          <div style={{background:'#f8fafc',padding:'24px 16px 16px 16px',borderRadius:'8px',border:'1px solid #e2e8f0'}}>
            <div style={{width:'100%',overflowX:'auto'}}>
              <svg viewBox={`0 0 ${graphWidth} ${graphHeight + 40}`} style={{width:'100%',minWidth:'650px',height:'auto'}}>
                <defs>
                  <linearGradient id="habitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3182ce" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#3182ce" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="habitStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3182ce" />
                    <stop offset="50%" stopColor="#805ad5" />
                    <stop offset="100%" stopColor="#38a169" />
                  </linearGradient>
                </defs>
                {[0, 25, 50, 75, 100].map(pct => {
                  const y = paddingY + (1 - pct / 100) * effectiveHeight;
                  return (
                    <g key={pct}>
                      <line x1={paddingX - 20} y1={y} x2={graphWidth - paddingX + 20} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" />
                      <text x={paddingX - 30} y={y + 4} textAnchor="end" fontSize="10" fill="#a0aec0" fontWeight="600">{pct}%</text>
                    </g>
                  );
                })}
                {areaData && <path d={areaData} fill="url(#habitAreaGrad)" />}
                {pathData && <path d={pathData} fill="none" stroke="url(#habitStrokeGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}
                {graphPoints.map((p, i) => {
                  const isSel = selectedDayRow && (p.id === selectedDayRow.id || p.score_date === selectedDayRow.score_date);
                  return (
                    <g key={i} onClick={() => setSelectedDayRow(p)} onMouseEnter={() => setHoveredDay(p)} onMouseLeave={() => setHoveredDay(null)} style={{cursor:'pointer'}}>
                      <circle cx={p.x} cy={p.y} r={isSel ? 10 : 8} fill={isSel ? '#3182ce' : '#ffffff'} stroke="#3182ce" strokeWidth={isSel ? 4 : 3} />
                      <circle cx={p.x} cy={p.y} r={isSel ? 4 : 3.5} fill={isSel ? '#ffffff' : '#38a169'} />
                      <rect x={p.x - 22} y={p.y - 26} width="44" height="18" rx="4" fill="#1a365d" />
                      <text x={p.x} y={p.y - 13} textAnchor="middle" fontSize="10" fill="#ffffff" fontWeight="700">{p.score}%</text>
                      <text x={p.x} y={graphHeight + 16} textAnchor="middle" fontSize="12" fill={isSel ? '#2b6cb0' : '#4a5568'} fontWeight={isSel ? 700 : 500}>{p.dateLabel}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div style={{textAlign:'center',marginTop:'10px',fontSize:'0.8rem',color:'#718096'}}>
              💡 Click any day on the graph to inspect its breakdown below.
            </div>
          </div>
        </div>

        {/* Weighted Scoring Model Table — Per Day */}
        <div className="ud-card" style={{marginBottom:'24px',borderLeft:'5px solid #3182ce',background:'#f8fafc'}}>
          <div style={{marginBottom:'14px'}}>
            <h3 style={{margin:0,fontSize:'1.15rem',color:'#2d3748',fontWeight:700}}>
              🗄️ Weighted Scoring Model
            </h3>
            <p style={{margin:'4px 0 0 0',color:'#718096',fontSize:'0.82rem'}}>
              Showing last {dailyHistory.length} days for {userName}
            </p>
          </div>

          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.85rem',background:'#ffffff',borderRadius:'6px',overflow:'hidden',border:'1px solid #e2e8f0'}}>
              <thead>
                <tr style={{background:'#edf2f7',textAlign:'left',color:'#4a5568',textTransform:'uppercase',fontSize:'0.72rem',letterSpacing:'0.5px'}}>
                  <th style={{padding:'10px 14px'}}>Date (score_date)</th>
                  <th style={{padding:'10px 14px'}}>Habit Score</th>
                  <th style={{padding:'10px 14px'}}>Wake-Up (35%)</th>
                  <th style={{padding:'10px 14px'}}>Challenge (25%)</th>
                  <th style={{padding:'10px 14px'}}>Snooze Red. (20%)</th>
                  <th style={{padding:'10px 14px'}}>Sleep Adh. (20%)</th>
                  <th style={{padding:'10px 14px'}}>Sessions</th>
                  <th style={{padding:'10px 14px'}}>Snoozes</th>
                </tr>
              </thead>
              <tbody>
                {dailyHistory.map(row => {
                  const isSel = selectedDayRow && (row.id === selectedDayRow.id || row.score_date === selectedDayRow.score_date);
                  const scoreVal = Math.round(Number(row.habit_score));
                  return (
                    <tr key={row.id || row.score_date} onClick={() => setSelectedDayRow(row)}
                      style={{borderBottom:'1px solid #edf2f7',cursor:'pointer',background:isSel?'#ebf8ff':'#ffffff',transition:'background 0.15s ease'}}>
                      <td style={{padding:'10px 14px',fontWeight:700,color:isSel?'#2b6cb0':'#2d3748'}}>
                        📅 {formatDateFull(row.score_date)} {isSel && <span style={{fontSize:'0.7rem',color:'#3182ce',fontWeight:700}}>(Selected)</span>}
                      </td>
                      <td style={{padding:'10px 14px',fontWeight:700,fontSize:'0.95rem',color:scoreVal>=85?'#2b6cb0':scoreVal>=70?'#38a169':'#dd6b20'}}>
                        {scoreVal} / 100
                      </td>
                      <td style={{padding:'10px 14px'}}><span style={{fontWeight:600}}>{Math.round(Number(row.wake_up_consistency))}%</span></td>
                      <td style={{padding:'10px 14px'}}><span style={{fontWeight:600}}>{Math.round(Number(row.challenge_completion_success))}%</span></td>
                      <td style={{padding:'10px 14px'}}><span style={{fontWeight:600}}>{Math.round(Number(row.snooze_reduction))}%</span></td>
                      <td style={{padding:'10px 14px'}}><span style={{fontWeight:600}}>{Math.round(Number(row.sleep_schedule_adherence))}%</span></td>
                      <td style={{padding:'10px 14px',color:'#4a5568',fontWeight:600}}>{row.total_sessions || 0}</td>
                      <td style={{padding:'10px 14px',color:'#805ad5',fontWeight:600}}>{row.total_snoozes || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'10px',fontSize:'0.75rem',color:'#a0aec0',flexWrap:'wrap',gap:'8px'}}>
            <span>PostgreSQL: <code>"Weighted Scoring Model"</code></span>
            <span>Total Days Stored: {dailyHistory.length}</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HabitScorePage;
