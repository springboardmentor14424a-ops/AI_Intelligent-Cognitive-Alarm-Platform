import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAlarm } from '../context/AlarmContext';
import './UserDashboard.css';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

const UserDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const {
    alarms,
    loadingAlarms,
    alarmHistory,
    loadingHistory,
    fetchAlarms,
    triggerAlarmRinging,
    toggleAlarmStatus,
    deleteAlarm
  } = useAlarm();

  const userName = user?.name || 'samhitha';
  const userAvatar = user?.avatar || userName.split(' ').map(n => n[0]).join('').toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Modal State for Setting Alarms with Explicit Hour, Minute, AM/PM Dropdowns
  const [showModal, setShowModal] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
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

  // Coach Messaging & Notification State
  const [assignedCoach, setAssignedCoach] = useState(null);
  const [userMessages, setUserMessages] = useState([]);
  const [userUnreadCount, setUserUnreadCount] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [weeklyModel, setWeeklyModel] = useState(null);
  const [notifTab, setNotifTab] = useState('all');
  const [showUserNotifications, setShowUserNotifications] = useState(false);
  const [userMsgSubject, setUserMsgSubject] = useState('');
  const [userMsgBody, setUserMsgBody] = useState('');
  const [sendingUserMsg, setSendingUserMsg] = useState(false);
  const [userMsgFeedback, setUserMsgFeedback] = useState(null);

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
      user_id: user?.id || 20,
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
      const res = await fetch(`${API_BASE_URL}/api/alarms`, {
        method: 'POST',
        headers: getAuthHeaders(),
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

  const activeAlarmsCount = alarms.filter(a => a.status === 'Active').length;

  // ─── DYNAMIC WAKE-UP STATISTICS COMPUTATION FROM ALARM HISTORY ───
  const totalSessionsCount = alarmHistory.length;
  const dismissedSessions = alarmHistory.filter(s => s.status === 'Dismissed').length;
  const solvedSessions = alarmHistory.filter(s => s.challenge_solved).length;
  const totalSnoozes = alarmHistory.reduce((sum, s) => sum + (s.snooze_count || 0), 0);

  const onTimePct = totalSessionsCount > 0 
    ? `${((dismissedSessions / totalSessionsCount) * 100).toFixed(1)}%`
    : '—';

  const validTimes = alarmHistory.filter(s => s.completion_time).map(s => s.completion_time);
  const avgSolveTime = validTimes.length > 0
    ? `${(validTimes.reduce((a, b) => a + b, 0) / validTimes.length).toFixed(1)}s`
    : '—';

  const overallChallengePerf = totalSessionsCount > 0
    ? `${((solvedSessions / totalSessionsCount) * 100).toFixed(1)}%`
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

  // ─── COACH MESSAGING & NOTIFICATIONS ───
  const fetchAssignedCoach = () => {
    const userId = user?.id || 20;
    fetch(`${API_BASE_URL}/api/user/coach/${userId}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => setAssignedCoach(data.coach || null))
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

  const handleSendUserMessage = async (e) => {
    e.preventDefault();
    if (!userMsgBody.trim()) return;
    setSendingUserMsg(true);
    setUserMsgFeedback(null);
    try {
      const userId = user?.id || 20;
      const res = await fetch(`${API_BASE_URL}/api/user/messages`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          coach_id: assignedCoach?.coach_id,
          subject: userMsgSubject.trim() || 'Question for Coach',
          message: userMsgBody.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setUserMsgFeedback({ type: 'success', text: data.message });
        setUserMsgSubject('');
        setUserMsgBody('');
        fetchUserMessages();
      } else {
        setUserMsgFeedback({ type: 'error', text: data.message || 'Failed to send message.' });
      }
    } catch {
      setUserMsgFeedback({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setSendingUserMsg(false);
    }
  };

  const fetchRecommendations = () => {
    const userId = user?.id || 20;
    fetch(`${API_BASE_URL}/api/user/recommendations?userId=${userId}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data?.weeklyModel) setWeeklyModel(data.weeklyModel);
        else if (data?.model) setWeeklyModel(data.model);
        if (data?.recommendations && data.recommendations.length > 0) {
          setRecommendations(data.recommendations);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchAssignedCoach();
    fetchUserMessages();
    fetchRecommendations();
    const interval = setInterval(fetchUserMessages, 3000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Smooth scroll to coach messaging / message history if redirected with hash
  useEffect(() => {
    if (window.location.hash === '#coach-messaging-section') {
      setTimeout(() => {
        const el = document.getElementById('coach-messaging-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, []);

  // ─── DOWNLOAD REPORT FUNCTION (SUMMARY OF METRICS & SESSIONS) ───
  const downloadReport = (period = 'weekly') => {
    const now = new Date();
    const dateFormatted = now.toISOString().split('T')[0];
    const timeFormatted = now.toLocaleTimeString();

    let filtered = alarmHistory;
    let periodLabel = 'Weekly Summary (Last 7 Days)';

    if (period === 'weekly') {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      filtered = alarmHistory.filter(s => s.created_at && new Date(s.created_at) >= cutoff);
      periodLabel = 'Weekly (Last 7 Days)';
    } else if (period === 'monthly') {
      const cutoff = new Date(now);
      cutoff.setMonth(cutoff.getMonth() - 1);
      filtered = alarmHistory.filter(s => s.created_at && new Date(s.created_at) >= cutoff);
      periodLabel = 'Monthly (Last 30 Days)';
    } else if (period === 'yearly') {
      const cutoff = new Date(now);
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      filtered = alarmHistory.filter(s => s.created_at && new Date(s.created_at) >= cutoff);
      periodLabel = 'Yearly (Last 365 Days)';
    }

    // Filtered period metrics calculation
    const pTotal = filtered.length;
    const pDismissed = filtered.filter(s => s.status === 'Dismissed').length;
    const pSolved = filtered.filter(s => s.challenge_solved).length;
    const pSnoozes = filtered.reduce((sum, s) => sum + (s.snooze_count || 0), 0);

    const pWakeUpPct = pTotal > 0 ? ((pDismissed / pTotal) * 100).toFixed(1) : (weeklyModel?.wake_up_consistency || 85);
    const pSolvePct = pTotal > 0 ? ((pSolved / pTotal) * 100).toFixed(1) : (weeklyModel?.challenge_completion_success || 90);
    const pSnoozeRed = pTotal > 0 ? Math.max(20, Math.round(100 - (pSnoozes * 15))) : (weeklyModel?.snooze_reduction || 88);
    const pSleepAdh = weeklyModel?.sleep_schedule_adherence || 92;

    const pHabitScore = Math.round(
      (Number(pWakeUpPct) * 0.35) +
      (Number(pSolvePct) * 0.25) +
      (Number(pSnoozeRed) * 0.20) +
      (Number(pSleepAdh) * 0.20)
    );

    const pValidTimes = filtered.filter(s => s.completion_time).map(s => Number(s.completion_time));
    const pAvgSolveTime = pValidTimes.length > 0 
      ? (pValidTimes.reduce((a, b) => a + b, 0) / pValidTimes.length).toFixed(1) + 's'
      : avgSolveTime || '6.4s';

    // Productivity metrics calculation
    const pProdScore = Math.round((Number(pWakeUpPct) * 0.4) + (Number(pSolvePct) * 0.35) + (Number(pSnoozeRed) * 0.25));
    const pProdImprovement = Math.max(8, Math.round(pProdScore - 70));

    // Construct CSV with comprehensive executive summaries and session details
    const lines = [];

    // Header & User Metadata
    lines.push(['========================================================================================']);
    lines.push(['COGNIVELL WELLNESS & PRODUCTIVITY PERFORMANCE REPORT']);
    lines.push(['========================================================================================']);
    lines.push(['Report Type', `"${periodLabel} - Comprehensive Performance Summary"`]);
    lines.push(['User Name', `"${userName}"`]);
    lines.push(['Email Account', `"${user?.email || 'user@cogniwell.com'}"`]);
    lines.push(['User ID', `"User #${user?.id || 20}"`]);
    lines.push(['Date Generated', `"${dateFormatted} ${timeFormatted}"`]);
    lines.push(['Total Sessions Analyzed', `"${pTotal} Sessions (${pDismissed} Dismissed, ${pSolved} Solved, ${pSnoozes} Snoozes)"`]);
    lines.push([]);

    // Section 1: HABIT SCORE SUMMARY (WEIGHTED SCORING MODEL)
    lines.push(['----------------------------------------------------------------------------------------']);
    lines.push(['1. HABIT SCORE SUMMARY (WEIGHTED SCORING MODEL)']);
    lines.push(['----------------------------------------------------------------------------------------']);
    lines.push(['Metric Attribute', 'Score / Value', 'Weight in Model', 'Description & Target Benchmark']);
    lines.push(['Composite Habit Score', `"${pHabitScore} / 100"`, '"100% Total"', `"${pHabitScore >= 85 ? 'Optimal Performance Tier' : pHabitScore >= 70 ? 'Moderate Consistency Tier' : 'Needs Optimization Focus'}"`]);
    lines.push(['Wake-Up Consistency', `"${pWakeUpPct}%"`, '"35% Weight"', `"${pDismissed} out of ${pTotal} alarms dismissed punctually (Target: ≥85%)"`]);
    lines.push(['Challenge Completion Success', `"${pSolvePct}%"`, '"25% Weight"', `"${pSolved} out of ${pTotal} cognitive challenges solved on first attempt"`]);
    lines.push(['Snooze Reduction', `"${pSnoozeRed}%"`, '"20% Weight"', `"${pSnoozes} total snoozes accumulated across this period"`]);
    lines.push(['Sleep Schedule Adherence', `"${pSleepAdh}%"`, '"20% Weight"', '"Regularity of circadian window and pre-sleep adherence"']);
    lines.push(['Habit Trend Direction', `"${habitTrend?.text || 'Improving'}"`, '"N/A"', `"${habitTrend?.note || 'Baseline Established'}"`]);
    lines.push([]);

    // Section 2: CHALLENGE PERFORMANCE SUMMARY
    lines.push(['----------------------------------------------------------------------------------------']);
    lines.push(['2. CHALLENGE PERFORMANCE SUMMARY']);
    lines.push(['----------------------------------------------------------------------------------------']);
    lines.push(['Performance Indicator', 'Measured Value', 'Context / Status']);
    lines.push(['Overall Challenge Solve Rate', `"${pSolvePct}%"`, `"${pSolved} of ${pTotal} sessions solved successfully"`]);
    lines.push(['Average Solve Time', `"${pAvgSolveTime}"`, '"Cognitive reaction speed from alarm trigger to puzzle solve"']);
    lines.push(['Current Solved Streak', `"${solvedStreak} Sessions"`, '"Consecutive active alarm sessions solved without skipping"']);
    lines.push(['On-Time Wake-Up Frequency', `"${pWakeUpPct}%"`, `"${pDismissed} punctual sessions recorded"`]);
    lines.push(['Total Snooze Count', `"${pSnoozes} Times"`, '"Cumulative snoozes requested by user in this period"']);
    lines.push([]);

    // Section 3: PRODUCTIVITY INSIGHTS & ACTIVE RECOMMENDATIONS
    lines.push(['----------------------------------------------------------------------------------------']);
    lines.push(['3. PRODUCTIVITY INSIGHTS & ACTIVE RECOMMENDATIONS']);
    lines.push(['----------------------------------------------------------------------------------------']);
    lines.push(['Productivity Metric', 'Value', 'Circadian Impact']);
    lines.push(['Cognitive Productivity Score', `"${pProdScore} / 100"`, '"Holistic morning execution score"']);
    lines.push(['Productivity Improvement Rate', `"↑ ${pProdImprovement}%"`, '"Execution speed acceleration vs baseline"']);
    lines.push(['Wake-Up → Productivity Correlation', '"+18%"', '"Circadian rhythm stabilization factor"']);
    lines.push([]);
    lines.push(['Active Recommendation #', 'Protocol Title', 'Metric Basis (Weekly Analysis)', 'Actionable Protocol Details']);
    if (recommendations && recommendations.length > 0) {
      recommendations.forEach((rec, idx) => {
        lines.push([
          `"Recommendation ${idx + 1}"`,
          `"${(rec.title || rec.titleWithStep || '').replace(/"/g, '""')}"`,
          `"${(rec.metricBadge || '7-Day Weekly Analysis').replace(/"/g, '""')}"`,
          `"${(rec.description || '').replace(/"/g, '""')}"`
        ]);
      });
    } else {
      lines.push(['"Recommendation 1"', '"Peak Focus Window Allocation (09:00 AM - 11:30 AM)"', '"Weekly Analysis"', '"Block your most demanding deep work between 09:00 AM - 11:30 AM."']);
      lines.push(['"Recommendation 2"', '"Early Sunlight & Neural Hydration Protocol"', '"Weekly Analysis"', '"Get 10-15 minutes of natural sunlight within 20 minutes of waking and drink 500ml of water."']);
      lines.push(['"Recommendation 3"', '"Progressive Challenge Tier Optimization"', '"Weekly Analysis"', '"Increase challenge complexity in Create Alarm to eliminate morning sleep inertia."']);
    }
    lines.push([]);

    // Section 4: DETAILED SESSION LOGS
    lines.push(['----------------------------------------------------------------------------------------']);
    lines.push([`4. DETAILED ALARM SESSION LOGS (${filtered.length} SESSIONS)`]);
    lines.push(['----------------------------------------------------------------------------------------']);
    const sessionHeaders = ['Date', 'Time of Alarm', 'Alarm Title', 'Theme', 'Difficulty', 'Question', 'Expected Answer', 'Your Answer', 'Solved', 'Snoozes', 'Time Taken (s)', 'Wakefulness ★', 'Status'];
    lines.push(sessionHeaders);

    filtered.forEach(s => {
      lines.push([
        s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '',
        s.alarm_time || '',
        `"${(s.alarm_title || 'Cognitive Alarm').replace(/"/g, '""')}"`,
        s.challenge_theme || '',
        s.difficulty || '',
        `"${(s.question || '').replace(/"/g, '""')}"`,
        `"${(String(s.correct_answer || '')).replace(/"/g, '""')}"`,
        `"${(String(s.user_answer || '')).replace(/"/g, '""')}"`,
        s.challenge_solved ? 'Yes' : 'No',
        s.snooze_count ?? 0,
        s.completion_time || '',
        s.wakefulness_rating ? s.wakefulness_rating + '★' : '',
        s.status || ''
      ]);
    });

    const csvContent = lines.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CogniWell_Executive_Report_${userName}_${period}_${dateFormatted}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


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
          <a href="#coach-messaging-section" className="ud-nav-item">
            💬 Message Coach {userUnreadCount > 0 ? `(${userUnreadCount})` : ''}
          </a>
          <Link to="/user/habit-score" className="ud-nav-item">🎯 Habit Score</Link>
          <Link to="/user/challenge-performance" className="ud-nav-item">🧩 Challenge Performance</Link>
          <Link to="/user/productivity-insights" className="ud-nav-item">💡 Productivity Insights</Link>
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
          <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
            {/* Notification Bell Symbol */}
            <div style={{position: 'relative'}}>
              <div
                className="notification-bell"
                onClick={() => setShowUserNotifications(v => !v)}
                title="Notifications"
                style={{cursor: 'pointer', position: 'relative', fontSize: '1.35rem', userSelect: 'none'}}
              >
                🔔 {(userUnreadCount + recommendations.length) > 0 && (
                  <span className="bell-badge">{userUnreadCount + recommendations.length}</span>
                )}
              </div>

              {/* User Notifications Dropdown (Recommendations + Coach Messages) */}
              {showUserNotifications && (
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
                      onClick={() => setShowUserNotifications(false)}
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

                  {/* Notifications List */}
                  <div style={{maxHeight: '340px', overflowY: 'auto'}}>
                    {/* Recommendations Section */}
                    {(notifTab === 'all' || notifTab === 'recommendations') && (
                      <div>
                        <div style={{padding: '8px 14px', background: '#f7fafc', borderBottom: '1px solid #edf2f7', fontSize: '0.72rem', fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.5px'}}>
                          💡 Recommendations (Weighted Scoring Model)
                        </div>
                        {recommendations.map((rec, i) => (
                          <div
                            key={rec.id || i}
                            onClick={() => {
                              setShowUserNotifications(false);
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
                                  👉 Click to view in Active Productivity Recommendations →
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Messages Section */}
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
                                setShowUserNotifications(false);
                                if (!m.is_read) markUserMessagesAsRead();
                                document.getElementById('coach-messaging-section')?.scrollIntoView({ behavior: 'smooth' });
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
                                👉 Click to view in Wellness Coach Message History →
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


            {/* Single Download Report dropdown button */}
            <div style={{position: 'relative'}}>
              <button
                onClick={() => setShowDownloadMenu(v => !v)}
                style={{
                  padding: '8px 18px', background: '#1a365d', color: '#fff',
                  border: 'none', borderRadius: '8px', fontSize: '0.85rem',
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                ⬇️ Download Report {showDownloadMenu ? '▲' : '▼'}
              </button>
              {showDownloadMenu && (
                <div style={{
                  position: 'absolute', top: '110%', right: 0, zIndex: 999,
                  background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: '160px', overflow: 'hidden'
                }}>
                  {[
                    { key: 'weekly',  label: '📅 Weekly Report' },
                    { key: 'monthly', label: '🗓️ Monthly Report' },
                    { key: 'yearly',  label: '📆 Yearly Report' }
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => { downloadReport(key); setShowDownloadMenu(false); }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'left',
                        padding: '10px 16px', background: 'none', border: 'none',
                        fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                        color: '#1a365d', borderBottom: '1px solid #f0f4f8'
                      }}
                      onMouseEnter={e => e.target.style.background = '#ebf8ff'}
                      onMouseLeave={e => e.target.style.background = 'none'}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="ud-date">{currentDate}</span>
          </div>
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
                  {/* Test Alarm — Icon only */}
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

        {/* 3. Alarm History Section — Top 10 Recent Sessions */}
        <div className="ud-card" id="alarm-history-section" style={{marginBottom: '24px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
            <h3 className="ud-section-title" style={{margin: 0, border: 'none', padding: 0}}>📜 Alarm history</h3>
            <span style={{fontSize: '0.8rem', color: '#718096'}}>Showing {Math.min(10, alarmHistory.length)} of {alarmHistory.length} total sessions from PostgreSQL</span>
          </div>

          {loadingHistory ? (
            <div style={{color: '#718096', fontSize: '0.9rem', padding: '12px 0'}}>Loading history from database...</div>
          ) : alarmHistory.length === 0 ? (
            <div style={{color: '#718096', fontSize: '0.9rem', padding: '12px 0'}}>No alarm sessions recorded yet.</div>
          ) : (
            <div style={{overflowX: 'auto'}}>
              <table className="ud-mood-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{textAlign: 'left', color: '#718096', fontSize: '0.78rem', borderBottom: '2px solid #e2e8f0', background: '#f7fafc'}}>
                    <th style={{padding: '10px 8px'}}>#</th>
                    <th style={{padding: '10px 8px'}}>Date</th>
                    <th style={{padding: '10px 8px'}}>Time of Alarm</th>
                    <th style={{padding: '10px 8px'}}>Type</th>
                    <th style={{padding: '10px 8px'}}>Alarm Title</th>
                    <th style={{padding: '10px 8px'}}>Theme</th>
                    <th style={{padding: '10px 8px'}}>Difficulty</th>
                    <th style={{padding: '10px 8px'}}>Question</th>
                    <th style={{padding: '10px 8px'}}>Expected Answer</th>
                    <th style={{padding: '10px 8px'}}>Your Answer</th>
                    <th style={{padding: '10px 8px'}}>Solved</th>
                    <th style={{padding: '10px 8px'}}>Snoozes</th>
                    <th style={{padding: '10px 8px'}}>Time Taken</th>
                    <th style={{padding: '10px 8px'}}>Wakefulness ★</th>
                    <th style={{padding: '10px 8px'}}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {alarmHistory.slice(0, 10).map((s, idx) => {
                    const dateStr = s.created_at ? new Date(s.created_at).toISOString().split('T')[0] : '—';
                    const statusColors = {
                      'Dismissed':       { bg: '#c6f6d5', color: '#276749' },
                      'Completed':       { bg: '#bee3f8', color: '#2c5282' },
                      'Snoozed':         { bg: '#fefcbf', color: '#744210' },
                      'Failed':          { bg: '#fed7d7', color: '#9b2c2c' },
                      'Low Wakefulness': { bg: '#e9d8fd', color: '#553c9a' },
                    };
                    const badge = statusColors[s.status] || { bg: '#e2e8f0', color: '#4a5568' };
                    return (
                      <tr key={idx} className="ud-mood-row" style={{fontSize: '0.8rem', borderBottom: '1px solid #f0f4f8', background: idx % 2 === 0 ? '#fff' : '#fafafa'}}>
                        <td style={{padding: '8px', color: '#a0aec0', fontWeight: 600}}>{alarmHistory.length - idx}</td>
                        <td style={{padding: '8px', color: '#4a5568'}}>{dateStr}</td>
                        <td style={{padding: '8px', fontWeight: 600, color: '#2b6cb0'}}>{s.alarm_time || '—'}</td>
                        <td style={{padding: '8px'}}><span style={{background:'#ebf8ff',color:'#2b6cb0',padding:'2px 6px',borderRadius:'4px',fontSize:'0.72rem',fontWeight:600}}>{s.alarm_type || 'Daily'}</span></td>
                        <td style={{padding: '8px', fontWeight: 600, color: '#1a365d'}}>{s.alarm_title || '—'}</td>
                        <td style={{padding: '8px'}}><span style={{background:'#feebc8',color:'#744210',padding:'2px 6px',borderRadius:'4px',fontSize:'0.72rem',fontWeight:600}}>{s.challenge_theme || '—'}</span></td>
                        <td style={{padding: '8px', color: '#4a5568', fontWeight: 600}}>{s.difficulty || 'Medium'}</td>
                        <td style={{padding: '8px', color: '#2d3748', maxWidth: '160px', fontSize: '0.78rem'}}>{s.question || '—'}</td>
                        <td style={{padding: '8px'}}>
                          <span style={{color:'#38a169',fontWeight:700}}>{s.correct_answer || '—'}</span>
                        </td>
                        <td style={{padding: '8px'}}>
                          <span style={{color: s.user_answer === s.correct_answer ? '#38a169' : '#e53e3e', fontWeight: 600}}>{s.user_answer || '—'}</span>
                        </td>
                        <td style={{padding: '8px', textAlign: 'center', fontSize: '1rem'}}>{s.challenge_solved ? '✅' : '❌'}</td>
                        <td style={{padding: '8px', textAlign: 'center', color: '#718096'}}>{s.snooze_count ?? 0}</td>
                        <td style={{padding: '8px', color: '#2b6cb0', fontWeight: 600}}>{s.completion_time ? `${s.completion_time}s` : '—'}</td>
                        <td style={{padding: '8px', textAlign: 'center', fontWeight: 700, color: s.wakefulness_rating >= 4 ? '#38a169' : s.wakefulness_rating ? '#d69e2e' : '#cbd5e0'}}>
                          {s.wakefulness_rating ? `${s.wakefulness_rating}★` : '—'}
                        </td>
                        <td style={{padding: '8px'}}>
                          <span style={{background: badge.bg, color: badge.color, padding: '3px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap'}}>
                            {s.status || '—'}
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

        {/* 4. Coach Messaging Section */}
        <div className="ud-card" id="coach-messaging-section" style={{marginBottom: '24px', borderTop: '3px solid #3182ce'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px'}}>
            <div>
              <h3 className="ud-section-title" style={{margin: 0, border: 'none', padding: 0}}>💬 Wellness Coach Communication</h3>
              <span style={{fontSize: '0.85rem', color: '#4a5568'}}>
                Assigned Coach: <strong style={{color: '#2b6cb0'}}>{assignedCoach?.coach_name || 'Wellness Coach'}</strong> ({assignedCoach?.coach_email || 'coach1@gmail.com'})
              </span>
            </div>
            {userUnreadCount > 0 && (
              <button
                onClick={markUserMessagesAsRead}
                style={{background: '#ebf8ff', border: '1px solid #bee3f8', color: '#2b6cb0', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'}}
              >
                Mark {userUnreadCount} new as read
              </button>
            )}
          </div>

          {/* Form to send message to coach */}
          <form onSubmit={handleSendUserMessage} style={{marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
            <h4 style={{margin: '0 0 12px 0', fontSize: '0.9rem', color: '#1a365d', fontWeight: 700}}>✉️ Send Message to Coach</h4>
            <div style={{marginBottom: '12px'}}>
              <label style={{display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#4a5568', marginBottom: '4px'}}>Subject</label>
              <input
                type="text"
                value={userMsgSubject}
                onChange={e => setUserMsgSubject(e.target.value)}
                placeholder="e.g. Question about morning routine, sleep habits..."
                style={{width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.85rem', boxSizing: 'border-box'}}
              />
            </div>
            <div style={{marginBottom: '12px'}}>
              <label style={{display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#4a5568', marginBottom: '4px'}}>Message</label>
              <textarea
                value={userMsgBody}
                onChange={e => setUserMsgBody(e.target.value)}
                placeholder="Type your question or wellness update for your coach here..."
                rows={3}
                required
                style={{width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #cbd5e0', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box'}}
              />
            </div>
            {userMsgFeedback && (
              <div style={{padding: '8px 12px', borderRadius: '6px', background: userMsgFeedback.type === 'success' ? '#c6f6d5' : '#fed7d7', color: userMsgFeedback.type === 'success' ? '#276749' : '#9b2c2c', fontWeight: 600, fontSize: '0.82rem', marginBottom: '12px'}}>
                {userMsgFeedback.type === 'success' ? '✅' : '❌'} {userMsgFeedback.text}
              </div>
            )}
            <button
              type="submit"
              disabled={sendingUserMsg || !userMsgBody.trim()}
              style={{padding: '8px 20px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: sendingUserMsg ? 'not-allowed' : 'pointer'}}
            >
              {sendingUserMsg ? '⏳ Sending...' : '📤 Send Message to Coach'}
            </button>
          </form>

          {/* Conversation history between User and Coach */}
          <div>
            <h4 style={{margin: '0 0 12px 0', fontSize: '0.9rem', color: '#2d3748', fontWeight: 700}}>
              📬 Message History ({userMessages.length})
            </h4>
            {userMessages.length === 0 ? (
              <div style={{padding: '20px', textAlign: 'center', color: '#718096', fontSize: '0.85rem', background: '#f8fafc', borderRadius: '8px'}}>
                No messages exchanged with your coach yet.
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '360px', overflowY: 'auto'}}>
                {userMessages.map((m, i) => {
                  const isFromCoach = m.sender_type === 'coach';
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        background: isFromCoach ? (!m.is_read ? '#ebf8ff' : '#f0f4f8') : '#f7fafc',
                        borderLeft: isFromCoach ? '4px solid #3182ce' : '4px solid #48bb78',
                        marginLeft: isFromCoach ? 0 : '24px',
                        marginRight: isFromCoach ? '24px' : 0
                      }}
                    >
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px'}}>
                        <strong style={{fontSize: '0.85rem', color: isFromCoach ? '#2b6cb0' : '#276749'}}>
                          {isFromCoach ? `🧑‍⚕️ Coach ${m.coach_name || 'Sarah'}` : `👤 You`}
                          {isFromCoach && !m.is_read && (
                            <span style={{background: '#3182ce', color: '#fff', fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px', marginLeft: '6px'}}>
                              NEW
                            </span>
                          )}
                        </strong>
                        <span style={{fontSize: '0.72rem', color: '#718096'}}>{new Date(m.created_at).toLocaleString()}</span>
                      </div>
                      {m.subject && (
                        <div style={{fontSize: '0.82rem', fontWeight: 600, color: '#2d3748', marginBottom: '3px'}}>
                          Subject: {m.subject}
                        </div>
                      )}
                      <p style={{margin: 0, fontSize: '0.82rem', color: '#4a5568', lineHeight: 1.4}}>{m.message}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ─── CREATE ALARM MODAL WITH 5 DIFFICULTY LEVELS ─── */}
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
                    <option value="Beginner">Beginner</option>
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
    </div>
  );
};

export default UserDashboard;
