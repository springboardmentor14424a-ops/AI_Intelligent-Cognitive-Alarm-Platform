import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { playAlarmSound, stopAlarmSound } from '../utils/alarmSound';
import './UserDashboard.css';

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userName = user?.name || 'samhitha';
  const userAvatar = user?.avatar || userName.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleLogout = () => {
    stopAlarmSound();
    logout();
    navigate('/');
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Stateful Alarm List backed by PostgreSQL
  const [alarms, setAlarms] = useState([]);
  const [loadingAlarms, setLoadingAlarms] = useState(true);

  // Alarm History from alarm_sessions PostgreSQL table
  const [alarmHistory, setAlarmHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Modal State for Setting Alarms with Explicit Hour, Minute, AM/PM Dropdowns
  const [showModal, setShowModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [hour, setHour] = useState('07');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('AM');
  const [repeatRule, setRepeatRule] = useState('Daily');
  const [challengeTheme, setChallengeTheme] = useState('Math Challenge'); // Themes only
  const [sound, setSound] = useState('REM Sync');
  const [difficulty, setDifficulty] = useState('Medium');
  const [snooze, setSnooze] = useState(5);
  const [vibration, setVibration] = useState(true);
  const [smartGradient, setSmartGradient] = useState(true);

  // ─── RINGING ALARM & GEMINI AI CHALLENGE OVERLAY STATE ───
  const [activeRingingAlarm, setActiveRingingAlarm] = useState(null);
  const [geminiChallenge, setGeminiChallenge] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [challengeSolved, setChallengeSolved] = useState(false);
  const [challengeFeedback, setChallengeFeedback] = useState('');
  const [loadingChallenge, setLoadingChallenge] = useState(false);

  // Fetch all alarm sessions across all users for global view
  const fetchAllSessions = () => {
    fetch('http://localhost:5001/api/alarm-sessions/all')
      .then(r => r.json())
      .then(data => {
        setAlarmHistory(data.sessions || []);
        setLoadingHistory(false);
      })
      .catch(() => setLoadingHistory(false));
  };

  // Fetch live alarms for user directly from PostgreSQL
  const fetchAlarms = () => {
    const userId = user?.id || 1;
    fetch(`http://localhost:5001/api/alarms?userId=${userId}`)
      .then(res => res.json())
      .then(data => {
        const mapped = (data.alarms || []).map(a => ({
          id: a.id,
          time: a.alarm_time,
          label: a.title,
          status: a.is_active ? 'Active' : 'Disabled',
          type: a.sound || a.alarm_type,
          repeatRule: a.alarm_type || 'Daily',
          challengeTheme: a.challenge_theme || 'Math Challenge',
          difficulty: a.difficulty_level || 'Medium',
          snooze: a.snooze_interval || 5
        }));
        setAlarms(mapped);
        setLoadingAlarms(false);
      })
      .catch(() => setLoadingAlarms(false));
  };

  // Fetch live alarms and set up real-time 3s polling for alarm sessions
  useEffect(() => {
    fetchAlarms();
    fetchAllSessions();
    const pollInterval = setInterval(fetchAllSessions, 3000);
    return () => clearInterval(pollInterval);
  }, [user?.id]);

  // Ref to track live alarms for ticker without stale closures
  const alarmsRef = React.useRef(alarms);
  useEffect(() => {
    alarmsRef.current = alarms;
  }, [alarms]);

  // Ref to track when challenge started for precise completion_time measurement
  const challengeStartTimeRef = React.useRef(null);
  const lastRungMinuteRef = React.useRef('');

  const normalizeTimeStr = (t) => {
    if (!t) return '';
    return t.trim().toUpperCase().replace(/^0/, '');
  };

  // ─── LIVE ALARM TICKER: CHECKS SYSTEM TIME EVERY 500MS FOR INSTANT RINGING ───
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      let hours = now.getHours();
      const mins = now.getMinutes().toString().padStart(2, '0');
      const currentAmPm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      
      const timePadded = `${hours.toString().padStart(2, '0')}:${mins} ${currentAmPm}`;
      const timeUnpadded = `${hours}:${mins} ${currentAmPm}`;
      const normPadded = normalizeTimeStr(timePadded);
      const normUnpadded = normalizeTimeStr(timeUnpadded);

      // Check matching active alarms instantly using alarmsRef
      if (!activeRingingAlarm && alarmsRef.current.length > 0) {
        const matchingAlarm = alarmsRef.current.find(a => {
          if (a.status !== 'Active') return false;
          const aNorm = normalizeTimeStr(a.time);
          return aNorm === normPadded || aNorm === normUnpadded;
        });

        if (matchingAlarm) {
          const minuteKey = `${matchingAlarm.id}_${mins}_${hours}_${currentAmPm}`;
          if (lastRungMinuteRef.current !== minuteKey) {
            lastRungMinuteRef.current = minuteKey;
            triggerAlarmRinging(matchingAlarm);
          }
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [activeRingingAlarm]);

  // Trigger Ringing Alarm & Gemini Challenge
  const triggerAlarmRinging = async (alarmObj) => {
    challengeStartTimeRef.current = Date.now();
    setActiveRingingAlarm(alarmObj);
    setUserAnswer('');
    setChallengeSolved(false);
    setChallengeFeedback('');
    setLoadingChallenge(true);

    // 1. Play real sound via Web Audio API immediately
    playAlarmSound(alarmObj.type || 'REM Sync');

    // 2. Fetch Gemini AI Challenge
    try {
      const res = await fetch('http://localhost:5001/api/gemini/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: alarmObj.challengeTheme || 'Math Challenge',
          difficulty: alarmObj.difficulty || 'Medium'
        })
      });
      const data = await res.json();
      if (data.challenge) {
        setGeminiChallenge(data.challenge);
      }
    } catch (e) {
      setGeminiChallenge({
        title: '🤖 Gemini AI Cognitive Challenge',
        prompt: 'Solve: (15 × 3) - 10 = ?',
        answer: '35',
        hint: 'Multiply 15 by 3 (45), then subtract 10.'
      });
    } finally {
      setLoadingChallenge(false);
    }
  };

  // Verify Gemini AI Answer
  const handleVerifyAnswer = (e) => {
    e.preventDefault();
    if (!geminiChallenge) return;

    if (userAnswer.trim().toLowerCase() === geminiChallenge.answer.toLowerCase()) {
      setChallengeSolved(true);
      setChallengeFeedback('✅ Correct! Task Completed. Sound muted. Select Snooze or Dismiss.');
      stopAlarmSound(); // Mute sound upon successful task completion!
    } else {
      setChallengeFeedback('❌ Incorrect answer. Please try again to stop the alarm!');
    }
  };

  // Save alarm session to PostgreSQL with title and time preserved
  const saveAlarmSession = async (status, solveDurationSec) => {
    if (!activeRingingAlarm || !geminiChallenge) return;
    const userId = user?.id || 1;
    try {
      await fetch('http://localhost:5001/api/alarm-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alarm_id: activeRingingAlarm.id,
          user_id: userId,
          alarm_title: activeRingingAlarm.label || 'Cognitive Alarm',
          alarm_time: activeRingingAlarm.time || '06:30 AM',
          alarm_type: activeRingingAlarm.repeatRule || 'Daily',
          snooze_count: status === 'Snoozed' ? 1 : 0,
          status,
          question: geminiChallenge.prompt,
          correct_answer: geminiChallenge.answer,
          user_answer: userAnswer,
          challenge_theme: activeRingingAlarm.challengeTheme || 'Math Challenge',
          difficulty: activeRingingAlarm.difficulty || 'Medium',
          challenge_solved: challengeSolved,
          completion_time: solveDurationSec || null
        })
      });
      fetchAllSessions();
    } catch (e) {
      console.error('Failed to save alarm session:', e);
    }
  };

  // Dismiss Alarm
  const handleDismissAlarm = async () => {
    stopAlarmSound();
    if (activeRingingAlarm) {
      const id = activeRingingAlarm.id;
      const timeTaken = challengeStartTimeRef.current 
        ? Math.max(1, Math.round((Date.now() - challengeStartTimeRef.current) / 1000))
        : 12;
      const solvedAt = challengeSolved ? timeTaken : null;
      await saveAlarmSession('Dismissed', solvedAt);
      // Delete the alarm from the database to remove it from all dashboards
      try {
        await fetch(`http://localhost:5001/api/alarms/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to delete alarm after dismiss:', e);
      }
      // Remove from UI state
      setAlarms(prev => prev.filter(a => a.id !== id));
    }
    setActiveRingingAlarm(null);
  };

  // Snooze Alarm
  const handleSnoozeAlarm = async () => {
    stopAlarmSound();
    if (activeRingingAlarm) {
      const id = activeRingingAlarm.id;
      await saveAlarmSession('Snoozed', null);
      setAlarms(prev => prev.map(a => a.id === id ? { ...a, status: 'Snoozed' } : a));
    }
    setActiveRingingAlarm(null);
  };

  const toggleAlarmStatus = async (id) => {
    const target = alarms.find(a => a.id === id);
    if (!target) return;
    const isEnabling = target.status !== 'Active';
    const endpoint = isEnabling ? 'enable' : 'disable';

    setAlarms(prev => prev.map(a => a.id === id ? { ...a, status: isEnabling ? 'Active' : 'Disabled' } : a));

    try {
      await fetch(`http://localhost:5001/api/alarms/${id}/${endpoint}`, { method: 'PATCH' });
    } catch (e) {
      console.error('Error toggling alarm status:', e);
    }
  };

  const deleteAlarm = async (id) => {
    setAlarms(prev => prev.filter(alarm => alarm.id !== id));
    try {
      await fetch(`http://localhost:5001/api/alarms/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Error deleting alarm:', e);
    }
  };

  const handleAddAlarm = async (e) => {
    e.preventDefault();
    const alarmTitle = newLabel.trim() || 'Cognitive Alarm';
    const formattedTime = `${hour}:${minute} ${ampm}`;

    const repeatDaysMap = {
      'Daily': 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
      'Weekday': 'Mon,Tue,Wed,Thu,Fri',
      'Weekend': 'Sat,Sun',
      'One-Time': '',
      'Smart Adaptive': 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'
    };

    const newAlarmPayload = {
      user_id: user?.id || 1,
      title: alarmTitle,
      alarm_time: formattedTime,
      alarm_type: repeatRule,
      repeat_days: repeatDaysMap[repeatRule] || 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
      difficulty_level: difficulty,
      sound: sound,
      vibration: vibration,
      snooze_interval: parseInt(snooze, 10),
      challenge_theme: challengeTheme,
      is_active: true
    };

    try {
      const res = await fetch('http://localhost:5001/api/alarms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAlarmPayload)
      });
      await res.json();
      fetchAlarms();
    } catch (e) {
      console.error('Error creating alarm:', e);
      fetchAlarms();
    }

    setNewLabel('');
    setShowModal(false);
  };




  const habitScores = [
    { name: 'Consistent Sleep Time', score: 92, status: 'Excellent', icon: '🌙' },
    { name: 'Morning Hydration', score: 85, status: 'Good', icon: '💧' },
    { name: 'No Screens Before Bed', score: 74, status: 'Needs Focus', icon: '📵' },
    { name: 'Cognitive Puzzle Speed', score: 95, status: 'Superior', icon: '⚡' }
  ];

  // All alarm challenge themes — always show all 5
  const ALARM_THEMES = [
    { key: 'Math Challenge',   icon: '🤖', desc: 'Arithmetic & equations' },
    { key: 'Memory Matrix',    icon: '🧠', desc: 'Sequence memorization' },
    { key: 'Stroop Focus',     icon: '🎨', desc: 'Word-color recognition' },
    { key: 'Logic & Pattern',  icon: '🔢', desc: 'Sequence reasoning' },
    { key: 'Quick Reflexes',   icon: '⚡', desc: 'Speed addition' },
  ];

  // Challenge Performance: always all 5 themes, stats filled from alarm_sessions DB
  const challengePerformance = (() => {
    const themeMap = {};
    alarmHistory.forEach(s => {
      const theme = s.challenge_theme || 'Other';
      if (!themeMap[theme]) themeMap[theme] = { attempts: 0, solved: 0, totalTime: 0, difficulty: s.difficulty || 'Medium' };
      themeMap[theme].attempts++;
      if (s.challenge_solved) themeMap[theme].solved++;
      if (s.completion_time) themeMap[theme].totalTime += s.completion_time;
    });
    return ALARM_THEMES.map(({ key, icon, desc }) => {
      const stats = themeMap[key] || { attempts: 0, solved: 0, totalTime: 0, difficulty: 'Medium' };
      const pct = stats.attempts > 0 ? Math.round((stats.solved / stats.attempts) * 100) : 0;
      const avgSec = stats.solved > 0 ? (stats.totalTime / stats.solved).toFixed(1) : null;
      const badge = stats.attempts === 0 ? 'No Data' : pct >= 90 ? 'Top 5%' : pct >= 75 ? 'Top 10%' : pct >= 50 ? 'Top 25%' : 'Improving';
      return {
        title: `${icon} ${key}`, desc,
        accuracy: stats.attempts > 0 ? `${pct}%` : '—',
        pct, attempts: stats.attempts, solved: stats.solved,
        avgTime: avgSec ? `${avgSec}s` : '—',
        level: stats.difficulty,
        scoreBadge: badge,
        hasData: stats.attempts > 0
      };
    });
  })();


  const activeAlarmsCount = alarms.filter(a => a.status === 'Active').length;

  // ─── DYNAMIC WAKE-UP STATISTICS COMPUTATION FROM ALARM HISTORY ───
  const totalSessionsCount = alarmHistory.length;
  const dismissedSessions = alarmHistory.filter(s => s.status === 'Dismissed').length;
  const solvedSessions = alarmHistory.filter(s => s.challenge_solved).length;
  const totalSnoozes = alarmHistory.reduce((sum, s) => sum + (s.snooze_count || 0), 0);

  const onTimePct = totalSessionsCount > 0 
    ? `${((dismissedSessions / totalSessionsCount) * 100).toFixed(1)}%`
    : '—';

  const overallChallengePerf = totalSessionsCount > 0
    ? `${Math.round((solvedSessions / totalSessionsCount) * 100)}%`
    : '—';

  const completedTimes = alarmHistory.filter(s => s.completion_time).map(s => s.completion_time);
  const avgSolveTime = completedTimes.length > 0
    ? `${(completedTimes.reduce((a, b) => a + b, 0) / completedTimes.length).toFixed(1)}s`
    : '—';

  // Calculate current streak of solved challenges
  let solvedStreak = 0;
  for (const s of alarmHistory) {
    if (s.challenge_solved) solvedStreak++;
    else break;
  }

  const habitTrend = totalSessionsCount === 0
    ? { text: '📈 Baseline', color: '#718096', note: 'Awaiting Session Data' }
    : (solvedSessions / totalSessionsCount) >= 0.7
    ? { text: '📈 Improving', color: '#38a169', note: 'Improving (+5.2%)' }
    : { text: '⚠️ Needs Focus', color: '#dd6b20', note: 'Action Required' };

  return (
    <div className="ud-container">
      {/* Sidebar Navigation */}
      <aside className="ud-sidebar">
        <div className="ud-logo">CogniWell</div>
        
        <nav className="ud-nav">
          <Link to="/user" className="ud-nav-item active">📊 Dashboard</Link>
          <a href="#wakeup-stats-section" className="ud-nav-item">📈 Wake-up Statistics</a>
          <a href="#alarms-section" className="ud-nav-item">⏰ My Alarms</a>
          <a href="#alarm-history-section" className="ud-nav-item">📜 Alarm History</a>
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
            <button onClick={handleLogout} style={{background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.85rem', display: 'block', fontWeight: 600}}>
              🚪 Logout
            </button>
          )}
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
          <span className="ud-date">{currentDate}</span>
        </header>

        {/* 1. Wake-up Statistics Analytics (Dynamically Computed from Alarm History) */}
        <div style={{marginBottom: '28px'}} id="wakeup-stats-section">
          <h3 className="ud-section-title">📈 Wake-up Statistics Analytics</h3>
          <div className="ud-stats-grid" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'}}>
            <div className="ud-card">
              <div className="ud-stat-title">ON-TIME WAKE-UP FREQUENCY</div>
              <div className="ud-stat-value green">{onTimePct}</div>
              <div style={{fontSize: '0.8rem', color: '#718096', marginTop: '4px'}}>
                ⏱️ {totalSessionsCount > 0 ? `${dismissedSessions} out of ${totalSessionsCount} Sessions Punctual` : 'No alarm sessions yet'}
              </div>
            </div>

            <div className="ud-card" style={{borderTop: '3px solid #3182ce'}}>
              <div className="ud-stat-title">OVERALL CHALLENGE PERFORMANCE</div>
              <div className="ud-stat-value blue">{overallChallengePerf}</div>
              <div style={{fontSize: '0.8rem', color: '#2b6cb0', marginTop: '4px', fontWeight: 600}}>
                🧩 {totalSessionsCount > 0 ? `${solvedSessions}/${totalSessionsCount} Challenges Solved (${avgSolveTime} avg)` : 'No challenge data yet'}
              </div>
            </div>

            <div className="ud-card">
              <div className="ud-stat-title">TOTAL SNOOZE COUNT</div>
              <div className="ud-stat-value blue">{totalSessionsCount > 0 ? `${totalSnoozes} Times` : '0 Times'}</div>
              <div style={{fontSize: '0.8rem', color: '#38a169', marginTop: '4px'}}>
                💤 {totalSessionsCount > 0 ? 'Accumulated Snooze Count' : 'Zero snoozes recorded'}
              </div>
            </div>

            <div className="ud-card">
              <div className="ud-stat-title">Current Wake-up Streak</div>
              <div className="ud-stat-value green">{solvedStreak} {solvedStreak === 1 ? 'Session' : 'Sessions'} 🔥</div>
              <div style={{fontSize: '0.8rem', color: '#38a169', marginTop: '4px'}}>🔥 Active Consistency Record</div>
            </div>

            <div className="ud-card" style={{borderLeft: '4px solid ' + habitTrend.color}}>
              <div className="ud-stat-title">HABIT TREND DIRECTION</div>
              <div className="ud-stat-value" style={{color: habitTrend.color, fontSize: '1.4rem'}}>{habitTrend.text}</div>
              <div style={{fontSize: '0.8rem', color: habitTrend.color, marginTop: '4px', fontWeight: 600}}>{habitTrend.note}</div>
            </div>
          </div>
        </div>

        {/* 2. My Alarms Section */}
        <div className="ud-card" id="alarms-section" style={{marginBottom: '24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3 className="ud-section-title" style={{margin: 0, border: 'none', padding: 0}}>My Cognitive Alarms ({activeAlarmsCount} Active)</h3>
            <button className="ud-btn-add-alarm" onClick={() => setShowModal(true)}>+ Create New Alarm</button>
          </div>

          <div className="ud-alarms-list">
            {loadingAlarms ? (
              <div style={{color: '#718096', padding: '12px 0', fontSize: '0.9rem'}}>Loading alarms from database...</div>
            ) : alarms.length === 0 ? (
              <div style={{color: '#718096', padding: '12px 0', fontSize: '0.9rem'}}>No cognitive alarms created yet. Click "+ Create New Alarm" above to set one.</div>
            ) : (
              alarms.map(alarm => (
              <div key={alarm.id} className="ud-alarm-item">
                <div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'}}>
                    <span className="ud-alarm-time">{alarm.time}</span>
                    <span className="ud-alarm-label">{alarm.label}</span>
                    <span className="ud-alarm-tag" style={{background: '#ebf8ff', color: '#2b6cb0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600}}>
                      {alarm.repeatRule || 'Daily'}
                    </span>
                    {alarm.challengeTheme && alarm.challengeTheme !== 'None' && (
                      <span className="ud-alarm-tag" style={{background: '#feebc8', color: '#744210', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600}}>
                        🧩 {alarm.challengeTheme}
                      </span>
                    )}
                  </div>
                  <div style={{fontSize: '0.78rem', color: '#718096', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                    <span>Sound: <strong>{alarm.type || 'REM Sync'}</strong></span>
                    <span>Difficulty: <strong>{alarm.difficulty || 'Medium'}</strong></span>
                    <span>Snooze: <strong>{alarm.snooze || 5}m</strong></span>
                  </div>
                </div>

                <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                  {/* Test Alarm — Icon only, no text */}
                  <button 
                    onClick={() => triggerAlarmRinging(alarm)}
                    style={{
                      background: '#ebf8ff',
                      color: '#2b6cb0',
                      border: '1px solid #bee3f8',
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Test Alarm Ringing & Gemini AI Challenge"
                  >
                    🔊
                  </button>

                  <span className={`ud-badge ${alarm.status.toLowerCase()}`} onClick={() => toggleAlarmStatus(alarm.id)} style={{cursor: 'pointer'}}>
                    {alarm.status}
                  </span>
                  <button onClick={() => deleteAlarm(alarm.id)} style={{background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '1.1rem'}} title="Delete Alarm">🗑️</button>
                </div>
              </div>
            )))}
          </div>
        </div>

        {/* 3. Alarm History & Challenge Performance Grid */}
        <div className="ud-main-grid">
          {/* Alarm History — from alarm_sessions PostgreSQL table */}
          <div className="ud-card" id="alarm-history-section">
            <h3 className="ud-section-title">📜 Alarm History</h3>
            {loadingHistory ? (
              <div style={{color: '#718096', fontSize: '0.9rem'}}>Loading history from database...</div>
            ) : alarmHistory.length === 0 ? (
              <div style={{color: '#718096', fontSize: '0.9rem'}}>No alarm sessions recorded yet.</div>
            ) : (
              <div style={{overflowX: 'auto'}}>
                <table className="ud-mood-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{textAlign: 'left', color: '#718096', fontSize: '0.78rem', borderBottom: '1px solid #e2e8f0'}}>
                      <th style={{padding: '6px 8px'}}>Date</th>
                      <th style={{padding: '6px 8px'}}>Time of Alarm</th>
                      <th style={{padding: '6px 8px'}}>Alarm Title</th>
                      <th style={{padding: '6px 8px'}}>Theme</th>
                      <th style={{padding: '6px 8px'}}>Question</th>
                      <th style={{padding: '6px 8px'}}>Answer</th>
                      <th style={{padding: '6px 8px'}}>Solved</th>
                      <th style={{padding: '6px 8px'}}>Snoozes</th>
                      <th style={{padding: '6px 8px'}}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alarmHistory.map((s, idx) => {
                      const dateStr = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '—';
                      return (
                        <tr key={idx} className="ud-mood-row" style={{fontSize: '0.8rem', borderBottom: '1px solid #f0f4f8'}}>
                          <td style={{padding: '8px', color: '#4a5568'}}>{dateStr}</td>
                          <td style={{padding: '8px', fontWeight: 600, color: '#2b6cb0'}}>{s.alarm_time || '—'}</td>
                          <td style={{padding: '8px', fontWeight: 600, color: '#1a365d'}}>{s.alarm_title || '—'}</td>
                          <td style={{padding: '8px'}}><span style={{background:'#feebc8',color:'#744210',padding:'2px 6px',borderRadius:'4px',fontSize:'0.72rem',fontWeight:600}}>{s.challenge_theme || '—'}</span></td>
                          <td style={{padding: '8px', color: '#2d3748', maxWidth: '160px', fontSize: '0.78rem'}}>{s.question || '—'}</td>
                          <td style={{padding: '8px'}}>
                            <span style={{color:'#38a169',fontWeight:700}}>{s.correct_answer}</span>
                            {s.user_answer && s.user_answer !== s.correct_answer && <span style={{color:'#e53e3e',marginLeft:'6px'}}>→ {s.user_answer}</span>}
                          </td>
                          <td style={{padding: '8px', textAlign: 'center'}}>{s.challenge_solved ? '✅' : '❌'}</td>
                          <td style={{padding: '8px', textAlign: 'center', color: '#718096'}}>{s.snooze_count ?? 0}</td>
                          <td style={{padding: '8px'}}>
                            <span className={`ud-badge ${s.status === 'Dismissed' ? 'active' : s.status === 'Snoozed' ? 'snoozed' : 'disabled'}`}>{s.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Challenge Performance — live from alarm_sessions DB */}
          <div className="ud-card" id="challenge-section">
            <h3 className="ud-section-title">🧩 Challenge Performance</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
              {loadingHistory ? (
                <div style={{color: '#718096', fontSize: '0.9rem'}}>Loading challenge stats...</div>
              ) : challengePerformance.map((challenge, index) => {
                const pctNum = parseInt(challenge.accuracy) || 0;
                const barColor = pctNum >= 90 ? '#38a169' : pctNum >= 70 ? '#d69e2e' : pctNum === 0 ? '#e2e8f0' : '#e53e3e';
                return (
                  <div key={index} style={{padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#f8fafc'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                      <strong style={{color: '#1a365d', fontSize: '0.95rem'}}>{challenge.title}</strong>
                      <span className={`ud-badge ${challenge.scoreBadge === 'No Data' ? 'disabled' : 'active'}`}>{challenge.scoreBadge}</span>
                    </div>
                    <div style={{display: 'flex', gap: '16px', fontSize: '0.85rem', color: '#4a5568', marginBottom: '8px'}}>
                      <span>Accuracy: <strong style={{color: pctNum >= 75 ? '#38a169' : '#e53e3e'}}>{challenge.accuracy}</strong></span>
                      <span>Avg Speed: <strong>{challenge.avgTime}</strong></span>
                      <span>Difficulty: <strong>{challenge.level}</strong></span>
                      <span>Sessions: <strong>{challenge.solved}/{challenge.attempts}</strong></span>
                    </div>
                    {challenge.attempts > 0 && (
                      <div style={{height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden'}}>
                        <div style={{height: '100%', width: `${pctNum}%`, background: barColor, borderRadius: '3px', transition: 'width 0.5s ease'}}></div>
                      </div>
                    )}
                  </div>
                );
              })}
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

      {/* ─── CREATE ALARM MODAL WITH THEMES ONLY UNDER CHALLENGE REQUIRED ─── */}
      {showModal && (
        <div className="ud-modal-overlay">
          <div className="ud-modal-content">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
              <h3 style={{margin: 0, color: '#1a365d', fontSize: '1.25rem'}}>Create Alarm</h3>
              <button 
                onClick={() => setShowModal(false)}
                style={{background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#a0aec0'}}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAlarm}>
              {/* 1. Alarm Name */}
              <div className="ud-form-group">
                <label>Alarm Name</label>
                <input 
                  type="text" 
                  placeholder="Morning Alarm" 
                  value={newLabel} 
                  onChange={(e) => setNewLabel(e.target.value)} 
                  required 
                />
              </div>

              {/* 2. Alarm Time Picker (Hour, Minute 00-59, AM/PM) */}
              <div className="ud-form-group">
                <label>Alarm Time</label>
                <div style={{display: 'grid', gridTemplateColumns: '1fr auto 1fr 1fr', gap: '8px', alignItems: 'center'}}>
                  <select value={hour} onChange={(e) => setHour(e.target.value)} style={{padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontWeight: 600}}>
                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <span style={{fontWeight: 700, fontSize: '1.2rem'}}>:</span>
                  <select value={minute} onChange={(e) => setMinute(e.target.value)} style={{padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontWeight: 600}}>
                    {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select value={ampm} onChange={(e) => setAmpm(e.target.value)} style={{padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', fontWeight: 600}}>
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
              </div>

              {/* 3. Repeat Rule */}
              <div className="ud-form-group">
                <label>Repeat Rule</label>
                <select value={repeatRule} onChange={(e) => setRepeatRule(e.target.value)}>
                  <option value="Daily">Daily (Mon - Sun)</option>
                  <option value="Weekday">Weekday (Mon - Fri)</option>
                  <option value="Weekend">Weekend (Sat - Sun)</option>
                  <option value="Once">Once / One-Time</option>
                  <option value="Smart Adaptive">Smart Adaptive (REM Phase Rule)</option>
                </select>
              </div>

              {/* 4. Challenge Required (THEMES ONLY) */}
              <div className="ud-form-group">
                <label>Challenge Required (Themes Only)</label>
                <select value={challengeTheme} onChange={(e) => setChallengeTheme(e.target.value)}>
                  <option value="Math Challenge">Math Challenge Theme</option>
                  <option value="Memory Matrix">Memory Matrix Theme</option>
                  <option value="Stroop Focus">Stroop Focus Response Theme</option>
                  <option value="Logic & Pattern">Logic & Pattern Theme</option>
                  <option value="Quick Reflexes">Quick Reflexes Theme</option>
                  <option value="None">None (No Challenge Required)</option>
                </select>
              </div>

              {/* 5. Sound Customization & Difficulty */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div className="ud-form-group">
                  <label>Alarm Sound</label>
                  <select value={sound} onChange={(e) => setSound(e.target.value)}>
                    <option value="REM Sync">REM Sync Beep</option>
                    <option value="Voice Prompt">Voice Motivation Chime</option>
                    <option value="Gentle Tone">Gentle Tone Wave</option>
                    <option value="Chimes">Chimes</option>
                  </select>
                </div>

                <div className="ud-form-group">
                  <label>Difficulty Level</label>
                  <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
              </div>

              {/* 6. Checkboxes */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px', margin: '12px 0 20px 0'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#4a5568', cursor: 'pointer'}}>
                  <input 
                    type="checkbox" 
                    checked={smartGradient} 
                    onChange={(e) => setSmartGradient(e.target.checked)} 
                  />
                  Enable Smart Gradient Sound Ramping
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#4a5568', cursor: 'pointer'}}>
                  <input 
                    type="checkbox" 
                    checked={vibration} 
                    onChange={(e) => setVibration(e.target.checked)} 
                  />
                  Vibration Enabled
                </label>
              </div>

              {/* Modal Action Buttons */}
              <div className="ud-modal-actions">
                <button type="button" className="ud-btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="ud-btn-submit">
                  Create Alarm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RINGING ALARM & GEMINI AI CHALLENGE OVERLAY ─── */}
      {activeRingingAlarm && (
        <div className="ud-modal-overlay" style={{backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 9999}}>
          <div className="ud-modal-content" style={{maxWidth: '520px', border: '2px solid #e53e3e', animation: 'pulse 1.5s infinite'}}>
            <div style={{textAlign: 'center', marginBottom: '20px'}}>
              <span style={{fontSize: '3rem', display: 'block', marginBottom: '8px', animation: 'bounce 1s infinite'}}>🔔 🔊</span>
              <h2 style={{color: '#e53e3e', margin: 0, fontSize: '1.6rem'}}>ALARM RINGING!</h2>
              <h3 style={{color: '#1a365d', margin: '6px 0 0 0', fontSize: '1.2rem'}}>{activeRingingAlarm.label} ({activeRingingAlarm.time})</h3>
              <span style={{fontSize: '0.85rem', color: '#38a169', fontWeight: 600}}>
                🔊 Audio Tone Active ({activeRingingAlarm.type || 'REM Sync'})
              </span>
            </div>

            {loadingChallenge ? (
              <div style={{textAlign: 'center', padding: '24px', color: '#3182ce', fontWeight: 600}}>
                🤖 Generating Gemini AI Cognitive Challenge...
              </div>
            ) : geminiChallenge ? (
              <div>
                <div style={{padding: '16px', background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px'}}>
                  <h4 style={{margin: '0 0 8px 0', color: '#2b6cb0', fontSize: '1.05rem'}}>{geminiChallenge.title}</h4>
                  <p style={{margin: '0 0 8px 0', fontWeight: 600, color: '#1a202c', fontSize: '1.1rem'}}>{geminiChallenge.prompt}</p>
                  {geminiChallenge.hint && (
                    <span style={{fontSize: '0.8rem', color: '#718096'}}>💡 Hint: {geminiChallenge.hint}</span>
                  )}
                </div>

                {!challengeSolved ? (
                  <form onSubmit={handleVerifyAnswer}>
                    <div className="ud-form-group">
                      <label style={{fontWeight: 700}}>Enter your answer to stop alarm:</label>
                      <input 
                        type="text" 
                        placeholder="Type answer here..." 
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        autoFocus
                        required
                        style={{fontSize: '1.1rem', padding: '12px', textAlign: 'center', fontWeight: 700}}
                      />
                    </div>
                    {challengeFeedback && (
                      <div style={{marginBottom: '12px', fontSize: '0.85rem', color: challengeSolved ? '#276749' : '#c53030', fontWeight: 600, textAlign: 'center'}}>
                        {challengeFeedback}
                      </div>
                    )}
                    <button 
                      type="submit" 
                      className="ud-btn-submit" 
                      style={{width: '100%', padding: '12px', backgroundColor: '#e53e3e', fontSize: '1rem', fontWeight: 700}}
                    >
                      ⚡ Submit Answer & Complete Task
                    </button>
                  </form>
                ) : (
                  <div>
                    <div style={{padding: '12px', background: '#c6f6d5', color: '#22543d', borderRadius: '6px', fontWeight: 600, textAlign: 'center', marginBottom: '16px'}}>
                      🎉 Task Completed Successfully! Sound Muted.
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                      <button 
                        onClick={handleSnoozeAlarm} 
                        style={{padding: '12px', background: '#ecc94b', color: '#744210', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem'}}
                      >
                        😴 Snooze ({activeRingingAlarm.snooze || 5} Mins)
                      </button>
                      <button 
                        onClick={handleDismissAlarm} 
                        style={{padding: '12px', background: '#38a169', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem'}}
                      >
                        ✅ Dismiss Alarm
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
