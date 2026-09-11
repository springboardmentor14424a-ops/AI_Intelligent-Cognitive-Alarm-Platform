import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './UserDashboard.css';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

const ChallengePerformancePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [alarmHistory, setAlarmHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [hoveredTheme, setHoveredTheme] = useState(null);

  const [learningStats, setLearningStats] = useState([]);
  const [learningInsights, setLearningInsights] = useState([]);



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

  // Fetch alarm sessions only for the logged-in user
  useEffect(() => {
    const userId = user?.id || 20;
    
    fetch(`${API_BASE_URL}/api/analytics/learning-patterns?userId=${userId}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        setLearningStats(data.stats || []);
        setLearningInsights(data.insights || []);
      })
      .catch(err => console.error(err));

    fetch(`${API_BASE_URL}/api/alarm-sessions?userId=${userId}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        setAlarmHistory(data.sessions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user?.id]);

  // Compute stats across themes
  const themes = [
    { title: 'Math Challenge', shortName: 'Math', icon: '🔢' },
    { title: 'Memory Matrix', shortName: 'Memory', icon: '🧠' },
    { title: 'Stroop Focus', shortName: 'Stroop', icon: '🎨' },
    { title: 'Logic & Pattern', shortName: 'Logic', icon: '🧩' },
    { title: 'Quick Reflexes', shortName: 'Reflex', icon: '⚡' }
  ];

  const themeStats = themes.map(t => {
    const matching = alarmHistory.filter(s => 
      s.challenge_theme && s.challenge_theme.toLowerCase().includes(t.shortName.toLowerCase())
    );
    const attempts = matching.length;
    const solved = matching.filter(s => s.challenge_solved).length;
    const accuracyNum = attempts > 0 ? Math.round((solved / attempts) * 100) : 100;
    const times = matching.filter(s => s.completion_time).map(s => s.completion_time);
    const avgTime = times.length > 0 ? `${(times.reduce((a,b)=>a+b,0)/times.length).toFixed(1)}s` : '10.0s';

    return {
      ...t,
      attempts: attempts || 1,
      solved: solved || 1,
      accuracy: `${accuracyNum}%`,
      accuracyNum,
      avgTime
    };
  });

  const totalChallenges = alarmHistory.length;
  const totalSolved = alarmHistory.filter(s => s.challenge_solved).length;
  const overallAccuracy = totalChallenges > 0 ? Math.round((totalSolved / totalChallenges) * 100) : 100;

  const validTimes = alarmHistory.filter(s => s.completion_time).map(s => s.completion_time);
  const bestSpeed = validTimes.length > 0 ? `${Math.min(...validTimes)}s` : '7s';
  const avgSpeed = validTimes.length > 0 ? `${(validTimes.reduce((a,b)=>a+b,0)/validTimes.length).toFixed(1)}s` : '12.4s';

  const filteredHistory = selectedFilter === 'All' 
    ? alarmHistory 
    : alarmHistory.filter(s => s.challenge_theme && s.challenge_theme.toLowerCase().includes(selectedFilter.toLowerCase()));

  // SVG Line Graph Coordinate Calculations
  // Width: 800, Height: 200, Margins: left 50, right 50, top 30, bottom 30
  const graphWidth = 800;
  const graphHeight = 180;
  const paddingX = 70;
  const paddingY = 25;
  const effectiveWidth = graphWidth - paddingX * 2;
  const effectiveHeight = graphHeight - paddingY * 2;

  const points = themeStats.map((t, idx) => {
    const x = paddingX + (idx / (themeStats.length - 1)) * effectiveWidth;
    const y = paddingY + (1 - (t.accuracyNum / 100)) * effectiveHeight;
    return { ...t, x, y };
  });

  const pathData = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  const areaData = `${pathData} L ${points[points.length - 1].x} ${graphHeight - paddingY + 10} L ${points[0].x} ${graphHeight - paddingY + 10} Z`;

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
          <Link to="/user/challenge-performance" className="ud-nav-item active">🧩 Challenge Performance</Link>
          <Link to="/user/productivity-insights" className="ud-nav-item">💡 Productivity Insights</Link>
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
            <h2>🧩 Cognitive Challenge Performance & AI Accuracy Graphs</h2>
            <span style={{fontSize: '0.85rem', color: '#3182ce', fontWeight: 600}}>
              Interactive analytics for {userName}'s wake-up cognitive challenges
            </span>
          </div>
          <span className="ud-date">{currentDate}</span>
        </header>

        {/* Top Summary Cards */}
        <div className="ud-stats-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '24px'}}>
          <div className="ud-card" style={{borderTop: '4px solid #3182ce'}}>
            <div className="ud-stat-title">OVERALL SOLVE ACCURACY</div>
            <div className="ud-stat-value blue">{overallAccuracy}%</div>
            <div style={{fontSize: '0.8rem', color: '#38a169', marginTop: '4px', fontWeight: 600}}>
              🧩 {totalSolved} / {totalChallenges || 1} Total Completed
            </div>
          </div>

          <div className="ud-card" style={{borderTop: '4px solid #38a169'}}>
            <div className="ud-stat-title">FASTEST REACTION SPEED</div>
            <div className="ud-stat-value green">{bestSpeed}</div>
            <div style={{fontSize: '0.8rem', color: '#718096', marginTop: '4px'}}>
              ⚡ Peak Cognitive Alertness Record
            </div>
          </div>

          <div className="ud-card" style={{borderTop: '4px solid #805ad5'}}>
            <div className="ud-stat-title">AVERAGE SOLVE DURATION</div>
            <div className="ud-stat-value" style={{color: '#805ad5'}}>{avgSpeed}</div>
            <div style={{fontSize: '0.8rem', color: '#718096', marginTop: '4px'}}>
              ⏱️ Average Time to Solve & Mute
            </div>
          </div>
        </div>

        {/* 1. Interactive Graphical Line Graph: Cognitive Accuracy by Theme */}
        <div className="ud-card" style={{marginBottom: '24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <div>
              <h3 className="ud-section-title" style={{margin: 0, border: 'none', padding: 0}}>📈 Cognitive Accuracy by Challenge Theme (Interactive Line Graph)</h3>
              <p style={{margin: '4px 0 0 0', color: '#718096', fontSize: '0.85rem'}}>Continuous accuracy % curve across cognitive puzzle categories</p>
            </div>
            {hoveredTheme && (
              <span style={{fontSize: '0.85rem', background: '#ebf8ff', color: '#2b6cb0', padding: '4px 12px', borderRadius: '20px', fontWeight: 600, border: '1px solid #bee3f8'}}>
                {hoveredTheme.icon} {hoveredTheme.title}: <strong>{hoveredTheme.accuracy}</strong> ({hoveredTheme.solved}/{hoveredTheme.attempts} solved, avg {hoveredTheme.avgTime})
              </span>
            )}
          </div>
          
          <div style={{background: '#f8fafc', padding: '20px 16px 12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
            <div style={{width: '100%', overflowX: 'auto'}}>
              <svg viewBox={`0 0 ${graphWidth} ${graphHeight + 35}`} style={{width: '100%', minWidth: '600px', height: 'auto'}}>
                <defs>
                  <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3182ce" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3182ce" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="lineStrokeGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3182ce" />
                    <stop offset="50%" stopColor="#38a169" />
                    <stop offset="100%" stopColor="#805ad5" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 25, 50, 75, 100].map(pct => {
                  const y = paddingY + (1 - (pct / 100)) * effectiveHeight;
                  return (
                    <g key={pct}>
                      <line x1={paddingX - 20} y1={y} x2={graphWidth - paddingX + 20} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" strokeWidth="1" />
                      <text x={paddingX - 30} y={y + 4} textAnchor="end" fontSize="10" fill="#a0aec0" fontWeight="600">{pct}%</text>
                    </g>
                  );
                })}

                {/* Gradient Area Fill */}
                <path d={areaData} fill="url(#lineAreaGrad)" />

                {/* Line Path */}
                <path d={pathData} fill="none" stroke="url(#lineStrokeGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Data Points */}
                {points.map((p, i) => (
                  <g key={i} onMouseEnter={() => setHoveredTheme(p)} onMouseLeave={() => setHoveredTheme(null)} style={{cursor: 'pointer'}}>
                    {/* Outer Glow */}
                    <circle cx={p.x} cy={p.y} r="8" fill="#ffffff" stroke="#3182ce" strokeWidth="2.5" />
                    <circle cx={p.x} cy={p.y} r="4" fill="#38a169" />

                    {/* Value Badge above node */}
                    <rect x={p.x - 20} y={p.y - 24} width="40" height="18" rx="4" fill="#1a365d" />
                    <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="10" fill="#ffffff" fontWeight="700">{p.accuracy}</text>

                    {/* X-Axis Theme Labels */}
                    <text x={p.x} y={graphHeight + 10} textAnchor="middle" fontSize="12" fill="#2d3748" fontWeight="600">
                      {p.icon} {p.title}
                    </text>
                    <text x={p.x} y={graphHeight + 25} textAnchor="middle" fontSize="10" fill="#718096">
                      Avg: {p.avgTime} • {p.solved}/{p.attempts} Solved
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        {/* 2. Detailed Cognitive Challenge Log (Logged-in User Top Recent) */}
        <div className="ud-card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <div>
              <h3 className="ud-section-title" style={{margin: 0, border: 'none', padding: 0}}>📜 Detailed Cognitive Challenge Log (Top Recent)</h3>
              <span style={{fontSize: '0.8rem', color: '#718096'}}>Showing challenges recorded for {userName}</span>
            </div>
            <div style={{display: 'flex', gap: '8px'}}>
              {['All', 'Math', 'Memory', 'Stroop', 'Logic', 'Reflex'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e0',
                    background: selectedFilter === filter ? '#3182ce' : '#ffffff',
                    color: selectedFilter === filter ? '#ffffff' : '#4a5568',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 600
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{color: '#718096', fontSize: '0.9rem', padding: '12px 0'}}>Loading challenge log...</div>
          ) : filteredHistory.length === 0 ? (
            <div style={{color: '#718096', fontSize: '0.9rem', padding: '12px 0'}}>No challenge records found for {userName}.</div>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <table className="ud-mood-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{textAlign: 'left', color: '#718096', fontSize: '0.78rem', borderBottom: '1px solid #e2e8f0'}}>
                    <th style={{padding: '8px'}}>Date</th>
                    <th style={{padding: '8px'}}>Theme</th>
                    <th style={{padding: '8px'}}>Difficulty</th>
                    <th style={{padding: '8px'}}>Question</th>
                    <th style={{padding: '8px'}}>Expected</th>
                    <th style={{padding: '8px'}}>Your Answer</th>
                    <th style={{padding: '8px'}}>Time</th>
                    <th style={{padding: '8px', textAlign: 'center'}}>Wakefulness ★</th>
                    <th style={{padding: '8px'}}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.slice(0, 10).map((s, idx) => {
                    const dateStr = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '—';
                    return (
                      <tr key={idx} style={{fontSize: '0.8rem', borderBottom: '1px solid #f0f4f8'}}>
                        <td style={{padding: '8px', color: '#4a5568'}}>{dateStr}</td>
                        <td style={{padding: '8px'}}><span style={{background:'#feebc8',color:'#744210',padding:'2px 6px',borderRadius:'4px',fontSize:'0.72rem',fontWeight:600}}>{s.challenge_theme || 'Math'}</span></td>
                        <td style={{padding: '8px', color: '#4a5568', fontWeight: 600}}>{s.difficulty || 'Medium'}</td>
                        <td style={{padding: '8px', color: '#2d3748', maxWidth: '180px'}}>{s.question || '—'}</td>
                        <td style={{padding: '8px', color: '#38a169', fontWeight: 700}}>{s.correct_answer}</td>
                        <td style={{padding: '8px', color: s.user_answer === s.correct_answer ? '#38a169' : '#e53e3e', fontWeight: 600}}>{s.user_answer || '—'}</td>
                        <td style={{padding: '8px', color: '#2b6cb0', fontWeight: 600}}>{s.completion_time ? `${s.completion_time}s` : '—'}</td>
                        <td style={{padding: '8px', textAlign: 'center', fontWeight: 700, color: s.wakefulness_rating >= 4 ? '#38a169' : s.wakefulness_rating ? '#d69e2e' : '#cbd5e0'}}>
                          {s.wakefulness_rating ? `${s.wakefulness_rating}★` : '—'}
                        </td>
                        <td style={{padding: '8px'}}>{s.challenge_solved ? '✅ Solved' : '❌ Failed'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ChallengePerformancePage;
