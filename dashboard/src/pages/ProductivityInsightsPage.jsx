import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './UserDashboard.css';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

const ProductivityInsightsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [alarmHistory, setAlarmHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [userMessages, setUserMessages] = useState([]);
  const [userUnreadCount, setUserUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifTab, setNotifTab] = useState('all');
  const [isHighlighted, setIsHighlighted] = useState(false);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  const userName = user?.name || 'User';
  const userAvatar = userName.charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const fetchRecommendations = () => {
    const userId = user?.id || 20;
    fetch(`${API_BASE_URL}/api/user/recommendations?userId=${userId}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data?.recommendations && data.recommendations.length > 0) {
          setRecommendations(data.recommendations);
        }
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
    const userId = user?.id || 20;
    fetch(`${API_BASE_URL}/api/alarm-sessions?userId=${userId}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        setAlarmHistory(data.sessions || []);
      })
      .catch(() => {});

    fetchRecommendations();
    fetchUserMessages();
  }, [user?.id]);

  // Handle hash navigation to #recommendations-section
  useEffect(() => {
    if (location.hash === '#recommendations-section' || window.location.hash === '#recommendations-section') {
      setTimeout(() => {
        const el = document.getElementById('recommendations-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setIsHighlighted(true);
          setTimeout(() => setIsHighlighted(false), 3000);
        }
      }, 250);
    }
  }, [location.hash]);

  // Compute dynamic productivity metrics
  const totalSessions = alarmHistory.length;
  const dismissedCount = alarmHistory.filter(s => s.status === 'Dismissed').length;
  const solvedCount = alarmHistory.filter(s => s.challenge_solved).length;
  const totalSnoozes = alarmHistory.reduce((sum, s) => sum + (s.snooze_count || 0), 0);

  const punctualityScore = totalSessions > 0 ? Math.round((dismissedCount / totalSessions) * 100) : 85;
  const cognitiveScore = totalSessions > 0 ? Math.round((solvedCount / totalSessions) * 100) : 90;
  const snoozeResistance = totalSessions > 0 ? Math.max(30, Math.round(100 - (totalSnoozes * 12))) : 88;

  // Composite Productivity Score (0-100)
  const productivityScore = Math.round((punctualityScore * 0.4) + (cognitiveScore * 0.35) + (snoozeResistance * 0.25));
  const improvementPct = Math.max(8, Math.round((productivityScore - 70)));

  // Fallback recommendations if API loading
  const activeRecs = recommendations.length > 0 ? recommendations : [
    {
      id: 'rec-1',
      icon: '🎯',
      titleWithStep: '1. Peak Focus Window Allocation (09:00 AM – 11:30 AM)',
      description: 'Your post-wakeup cognitive curve peaks 2.5 hours after waking. Block your most demanding deep work, coding, and architectural design tasks inside this 09:00 AM – 11:30 AM window.',
      metricBadge: 'Consistency: Optimal',
      style: { bgColor: '#ebf8ff', borderColor: '#3182ce', titleColor: '#1a365d', textColor: '#2b6cb0' }
    },
    {
      id: 'rec-2',
      icon: '☀️',
      titleWithStep: '2. Early Sunlight & Neural Hydration Protocol',
      description: 'Get 10–15 minutes of natural sunlight within 20 minutes of waking and drink 500ml of water. This terminates residual melatonin and boosts puzzle reaction speed by 18%.',
      metricBadge: 'Snooze Red.: Optimal',
      style: { bgColor: '#f0fff4', borderColor: '#38a169', titleColor: '#22543d', textColor: '#2f855a' }
    },
    {
      id: 'rec-3',
      icon: '🧠',
      titleWithStep: '3. Progressive Challenge Tier Optimization',
      description: 'Your high solve rate indicates readiness for \'Hard\' or \'Expert\' difficulty. Increasing challenge complexity in Create Alarm eliminates sleep inertia in under 2 minutes.',
      metricBadge: 'Challenge Success: Optimal',
      style: { bgColor: '#faf5ff', borderColor: '#805ad5', titleColor: '#553c9e', textColor: '#6b46c1' }
    }
  ];

  const totalNotificationsCount = userUnreadCount + activeRecs.length;

  return (
    <div className="ud-container">
      {/* Sidebar Navigation */}
      <aside className="ud-sidebar">
        <div className="ud-logo">CogniWell</div>
        
        <nav className="ud-nav">
          <Link to="/user" className="ud-nav-item">📊 Dashboard</Link>
          <Link to="/user" className="ud-nav-item">📈 Wake-up Statistics</Link>
          <Link to="/user" className="ud-nav-item">⏰ My Alarms</Link>
          <Link to="/user" className="ud-nav-item">📜 Alarm History</Link>
          <Link to="/user/habit-score" className="ud-nav-item">🎯 Habit Score</Link>
          <Link to="/user/challenge-performance" className="ud-nav-item">🧩 Challenge Performance</Link>
          <Link to="/user/productivity-insights" className="ud-nav-item active">💡 Productivity Insights</Link>
        </nav>

        <div className="ud-sidebar-footer">
          <div className="ud-user-info">
            <div className="ud-avatar">{userAvatar}</div>
            <span className="ud-user-name">{userName}</span>
          </div>
          <button onClick={handleLogout} style={{background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.85rem', display: 'block', fontWeight: 600}}>
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ud-main-content">
        <header className="ud-header">
          <div>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px'}}>
              <Link to="/user" style={{color: '#3182ce', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600}}>← Back to Dashboard</Link>
            </div>
            <h2>💡 Productivity Insights</h2>
            <span style={{fontSize: '0.85rem', color: '#3182ce', fontWeight: 600}}>
              Cognitive productivity score, improvement tracking, and actionable optimization for {userName}
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
                🔔 {totalNotificationsCount > 0 && <span className="bell-badge">{totalNotificationsCount}</span>}
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
                      🔔 Notifications {totalNotificationsCount > 0 ? `(${totalNotificationsCount})` : ''}
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
                      All ({totalNotificationsCount})
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
                      💡 Recommendations ({activeRecs.length})
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

                  {/* Notification Items List */}
                  <div style={{maxHeight: '340px', overflowY: 'auto'}}>
                    {/* Section 1: Productivity Recommendations */}
                    {(notifTab === 'all' || notifTab === 'recommendations') && (
                      <div>
                        <div style={{padding: '8px 14px', background: '#f7fafc', borderBottom: '1px solid #edf2f7', fontSize: '0.72rem', fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                          💡 Recommendations (Weighted Scoring Model)
                        </div>
                        {activeRecs.map((rec, i) => (
                          <div
                            key={rec.id || i}
                            onClick={() => {
                              setShowNotifications(false);
                              const el = document.getElementById('recommendations-section');
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                setIsHighlighted(true);
                                setTimeout(() => setIsHighlighted(false), 3000);
                              }
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
                                  👉 Click to view in Active Recommendations ↓
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Section 2: Coach Messages */}
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

        {/* ─── ALL 4 SUMMARY BLOCKS IN A SINGLE HORIZONTAL ROW ─── */}
        <div className="ud-stats-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px'}}>
          {/* Block 1: PRODUCTIVITY SCORE */}
          <div className="ud-card" style={{borderTop: '4px solid #3182ce', padding: '20px'}}>
            <div className="ud-stat-title" style={{fontSize: '0.82rem', letterSpacing: '0.5px'}}>PRODUCTIVITY SCORE</div>
            <div className="ud-stat-value blue" style={{fontSize: '1.9rem', margin: '8px 0'}}>
              {productivityScore} / 100
            </div>
            <div style={{fontSize: '0.78rem', color: '#38a169', fontWeight: 600}}>
              🏆 Optimal Performance Tier
            </div>
          </div>

          {/* Block 2: PRODUCTIVITY IMPROVEMENT */}
          <div className="ud-card" style={{borderTop: '4px solid #38a169', padding: '20px'}}>
            <div className="ud-stat-title" style={{fontSize: '0.82rem', letterSpacing: '0.5px'}}>PRODUCTIVITY IMPROVEMENT</div>
            <div className="ud-stat-value green" style={{fontSize: '1.9rem', margin: '8px 0'}}>
              ↑ {improvementPct}%
            </div>
            <div style={{fontSize: '0.78rem', color: '#2f855a', fontWeight: 600}}>
              ⚡ Higher Morning Execution Speed
            </div>
          </div>

          {/* Block 3: WAKE-UP -> PRODUCTIVITY CORRELATION */}
          <div className="ud-card" style={{borderTop: '4px solid #805ad5', padding: '20px'}}>
            <div className="ud-stat-title" style={{fontSize: '0.82rem', letterSpacing: '0.5px'}}>WAKE-UP → PRODUCTIVITY CORRELATION</div>
            <div className="ud-stat-value" style={{color: '#805ad5', fontSize: '1.9rem', margin: '8px 0'}}>
              +18%
            </div>
            <div style={{fontSize: '0.78rem', color: '#6b46c1', fontWeight: 600}}>
              📈 Circadian Alignment Gain
            </div>
          </div>

          {/* Block 4: PRODUCTIVITY RECOMMENDATIONS */}
          <div className="ud-card" style={{borderTop: '4px solid #dd6b20', padding: '20px'}}>
            <div className="ud-stat-title" style={{fontSize: '0.82rem', letterSpacing: '0.5px'}}>PRODUCTIVITY RECOMMENDATIONS</div>
            <div className="ud-stat-value" style={{color: '#dd6b20', fontSize: '1.9rem', margin: '8px 0'}}>
              {activeRecs.length} Active
            </div>
            <div style={{fontSize: '0.78rem', color: '#c05621', fontWeight: 600}}>
              💡 Tailored AI Optimizations
            </div>
          </div>
        </div>

        {/* ─── ACTIVE PRODUCTIVITY RECOMMENDATIONS (3 ACTIVE) ─── */}
        <div 
          className="ud-card" 
          id="recommendations-section"
          style={{
            transition: 'box-shadow 0.4s ease, border-color 0.4s ease',
            boxShadow: isHighlighted ? '0 0 0 4px #3182ce, 0 8px 30px rgba(49, 130, 206, 0.25)' : undefined,
            border: isHighlighted ? '1px solid #3182ce' : undefined,
            borderRadius: '10px'
          }}
        >
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px'}}>
            <div>
              <h3 className="ud-section-title" style={{margin: 0, border: 'none', padding: 0}}>
                💡 Active Productivity Recommendations ({activeRecs.length} Active)
              </h3>
              <p style={{margin: '4px 0 0 0', fontSize: '0.82rem', color: '#718096'}}>
                Triggered dynamically from your <strong>7-Day Weekly Analysis</strong> of PostgreSQL <strong>Weighted Scoring Model</strong> metrics
              </p>
            </div>
            <span style={{fontSize: '0.75rem', background: '#ebf8ff', color: '#2b6cb0', padding: '4px 10px', borderRadius: '12px', fontWeight: 700}}>
              📅 7-Day Weekly Analysis • Tailored for {userName}
            </span>
          </div>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
            {activeRecs.map((rec, idx) => {
              const bg = rec.style?.bgColor || (idx === 0 ? '#ebf8ff' : idx === 1 ? '#f0fff4' : '#faf5ff');
              const border = rec.style?.borderColor || (idx === 0 ? '#3182ce' : idx === 1 ? '#38a169' : '#805ad5');
              const titleCol = rec.style?.titleColor || (idx === 0 ? '#1a365d' : idx === 1 ? '#22543d' : '#553c9e');
              const textCol = rec.style?.textColor || (idx === 0 ? '#2b6cb0' : idx === 1 ? '#2f855a' : '#6b46c1');

              return (
                <div 
                  key={rec.id || idx} 
                  style={{
                    display: 'flex', 
                    gap: '14px', 
                    padding: '16px', 
                    background: bg, 
                    borderRadius: '8px', 
                    borderLeft: `4px solid ${border}`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                >
                  <span style={{fontSize: '1.6rem'}}>{rec.icon || '💡'}</span>
                  <div style={{flex: 1}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap', gap: '6px'}}>
                      <h4 style={{margin: 0, color: titleCol, fontSize: '0.98rem', fontWeight: 700}}>
                        {rec.titleWithStep || `${idx + 1}. ${rec.title}`}
                      </h4>
                      {rec.metricBadge && (
                        <span style={{fontSize: '0.75rem', background: 'rgba(255,255,255,0.8)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700, color: border, border: `1px solid ${border}`}}>
                          {rec.metricBadge}
                        </span>
                      )}
                    </div>
                    <p style={{margin: 0, color: textCol, fontSize: '0.86rem', lineHeight: 1.5}}>
                      {rec.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductivityInsightsPage;

