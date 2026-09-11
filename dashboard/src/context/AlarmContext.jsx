import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL, getAuthHeaders } from '../config/api';

const AlarmContext = createContext(null);

export const AlarmProvider = ({ children }) => {
  const { user } = useAuth();

  const [alarms, setAlarms] = useState([]);
  const [loadingAlarms, setLoadingAlarms] = useState(true);
  const [alarmHistory, setAlarmHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Ringing & Gemini Challenge State
  const [activeRingingAlarm, setActiveRingingAlarm] = useState(null);
  const [geminiChallenge, setGeminiChallenge] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [challengeSolved, setChallengeSolved] = useState(false);
  const [challengeFeedback, setChallengeFeedback] = useState('');
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  // Alarm Ringing & Snooze Mode States
  const [snoozeMode, setSnoozeMode] = useState(false); // true when user chooses to snooze (leads to 2 questions)
  const [snoozeSolvedCount, setSnoozeSolvedCount] = useState(0); // 0, 1, 2
  const [showWakefulnessRating, setShowWakefulnessRating] = useState(false); // true when normal question is solved
  const [wakefulnessRating, setWakefulnessRating] = useState(0);

  const alarmsRef = useRef(alarms);
  const challengeStartTimeRef = useRef(null);
  const lastSolvedQuestionRef = useRef(null);
  const lastRungMinuteRef = useRef('');
  const audioContextRef = useRef(null);

  useEffect(() => {
    alarmsRef.current = alarms;
  }, [alarms]);

  // Fetch live alarms for user directly from PostgreSQL
  const fetchAlarms = () => {
    const userId = user?.id || 20;
    fetch(`${API_BASE_URL}/api/alarms?userId=${userId}`, { headers: getAuthHeaders() })
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

  // Fetch alarm sessions only for the logged-in user
  const fetchUserSessions = () => {
    const userId = user?.id || 20;
    fetch(`${API_BASE_URL}/api/alarm-sessions?userId=${userId}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        setAlarmHistory(data.sessions || []);
        setLoadingHistory(false);
      })
      .catch(() => setLoadingHistory(false));
  };

  useEffect(() => {
    fetchAlarms();
    fetchUserSessions();
    const pollInterval = setInterval(fetchUserSessions, 3000);
    return () => clearInterval(pollInterval);
  }, [user?.id]);

  const soundIntervalRef = useRef(null);
  const titleIntervalRef = useRef(null);
  const originalTitleRef = useRef(document.title || 'CogniWell');

  // Web Audio Synthesizer for continuous alarm sound
  const playAlarmSound = (soundType = 'REM Sync') => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Play 3 high-pitch beeps in rapid succession
      const now = ctx.currentTime;
      [0, 0.25, 0.5].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = soundType.includes('Gentle') ? 'sine' : soundType.includes('Voice') ? 'triangle' : 'square';
        osc.frequency.setValueAtTime(soundType.includes('Gentle') ? 520 : 880, now + offset);
        gain.gain.setValueAtTime(0.2, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  };

  const startAlarmSoundLoop = (soundType) => {
    playAlarmSound(soundType);
    if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
    soundIntervalRef.current = setInterval(() => {
      playAlarmSound(soundType);
    }, 1500);
  };

  const stopAlarmSound = () => {
    if (soundIntervalRef.current) {
      clearInterval(soundIntervalRef.current);
      soundIntervalRef.current = null;
    }
    if (titleIntervalRef.current) {
      clearInterval(titleIntervalRef.current);
      titleIntervalRef.current = null;
    }
    document.title = originalTitleRef.current || 'CogniWell';

    if (audioContextRef.current && audioContextRef.current.state === 'running') {
      try {
        audioContextRef.current.suspend();
      } catch (e) {}
    }
  };

  const normalizeTimeStr = (t) => {
    if (!t) return '';
    return t.trim().toUpperCase().replace(/^0/, '');
  };

  // Request Desktop Notification permissions automatically on startup & interaction
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Check matching active alarms against current real-time clock
  const checkActiveAlarms = () => {
    const now = new Date();
    let hours = now.getHours();
    const mins = now.getMinutes().toString().padStart(2, '0');
    const currentAmPm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    
    const timePadded = `${hours.toString().padStart(2, '0')}:${mins} ${currentAmPm}`;
    const timeUnpadded = `${hours}:${mins} ${currentAmPm}`;
    const normPadded = normalizeTimeStr(timePadded);
    const normUnpadded = normalizeTimeStr(timeUnpadded);

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
  };

  // ─── UNTHROTTLED WEB WORKER BACKGROUND CLOCK (WORKS ON ANY TAB, APP, & WEBSITE) ───
  useEffect(() => {
    let worker = null;
    try {
      const workerCode = `
        setInterval(() => {
          postMessage('tick');
        }, 500);
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      worker = new Worker(URL.createObjectURL(blob));
      worker.onmessage = () => {
        checkActiveAlarms();
      };
    } catch (e) {
      // Fallback to window interval if Web Worker is restricted
      const fallbackTimer = setInterval(checkActiveAlarms, 500);
      return () => clearInterval(fallbackTimer);
    }

    return () => {
      if (worker) worker.terminate();
    };
  }, [activeRingingAlarm]);

  // Trigger Ringing Alarm & Gemini Challenge across any tab/app
  const triggerAlarmRinging = async (alarmObj) => {
    challengeStartTimeRef.current = Date.now();
    setActiveRingingAlarm(alarmObj);
    setUserAnswer('');
    setAttemptCount(0);
    setChallengeSolved(false);
    setChallengeFeedback('');
    setSnoozeMode(false);
    setSnoozeSolvedCount(0);
    setShowWakefulnessRating(false);
    setWakefulnessRating(0);
    setLoadingChallenge(true);

    // 1. Focus tab/window
    try {
      window.focus();
    } catch (e) {}

    // 2. Start continuous audio sound loop
    startAlarmSoundLoop(alarmObj.type || 'REM Sync');

    // 3. Flash browser tab title so user notices even on another tab/website
    let toggle = false;
    if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
    titleIntervalRef.current = setInterval(() => {
      toggle = !toggle;
      document.title = toggle ? `🚨 ALARM RINGING! (${alarmObj.time})` : `⏰ ${alarmObj.label || 'Wake Up!'}`;
    }, 600);

    // 4. System-level Desktop Notification (visible over any active app or website)
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          const notif = new Notification(`⏰ CogniWell Alarm: ${alarmObj.label || 'Morning Alarm'}`, {
            body: `🔔 Time: ${alarmObj.time}\nClick here to solve your cognitive challenge and mute the alarm!`,
            icon: '/favicon.ico',
            requireInteraction: true,
            silent: false
          });
          notif.onclick = () => {
            window.focus();
            if (window.parent) window.parent.focus();
            notif.close();
          };
        } catch (e) {
          console.warn('Notification error:', e);
        }
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/gemini/challenge`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          theme: alarmObj.challengeTheme || 'Math Challenge',
          difficulty: alarmObj.difficulty || 'Medium',
          userId: user?.id || 20
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

  // Save alarm session — accepts explicit values so every question attempt is recorded
  const saveAlarmSession = async (status, solveDurationSec, overrides = {}) => {
    if (!activeRingingAlarm) return;
    const challenge = overrides.challenge || geminiChallenge;
    if (!challenge) return;
    const targetUserId = user?.id || 20;
    try {
      const res = await fetch(`${API_BASE_URL}/api/alarm-sessions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          alarm_id: activeRingingAlarm.id,
          user_id: targetUserId,
          alarm_title: activeRingingAlarm.label || 'Cognitive Alarm',
          alarm_time: activeRingingAlarm.time || '06:30 AM',
          alarm_type: activeRingingAlarm.repeatRule || 'Daily',
          snooze_count: status === 'Snoozed' ? 1 : 0,
          status,
          question: challenge.prompt,
          correct_answer: challenge.answer,
          user_answer: overrides.userAnswer !== undefined ? overrides.userAnswer : userAnswer,
          challenge_theme: activeRingingAlarm.challengeTheme || 'Math Challenge',
          difficulty: activeRingingAlarm.difficulty || 'Medium',
          challenge_solved: overrides.solved !== undefined ? overrides.solved : challengeSolved,
          completion_time: solveDurationSec || null,
          wakefulness_rating: overrides.wakefulness_rating || null
        })
      });
      const data = await res.json();
      if (data.difficultyAdjusted) {
        fetchAlarms();
      }
      fetchUserSessions();
    } catch (e) {
      console.error('Failed to save alarm session:', e);
    }
  };

  // Helper to load fresh challenge
  const loadNextChallenge = async (overrideAlarm) => {
    const alarm = overrideAlarm || activeRingingAlarm;
    if (!alarm) return;
    setLoadingChallenge(true);
    challengeStartTimeRef.current = Date.now();
    try {
      const res = await fetch(`${API_BASE_URL}/api/gemini/challenge`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          theme: alarm.challengeTheme || 'Math Challenge',
          difficulty: alarm.difficulty || 'Medium',
          userId: user?.id || 20
        })
      });
      const data = await res.json();
      if (data.challenge) {
        setGeminiChallenge(data.challenge);
      }
    } catch {
      setGeminiChallenge({
        title: '🤖 Cognitive Challenge',
        prompt: 'Solve: (14 × 4) - 12 = ?',
        answer: '44',
        hint: '14×4=56, then subtract 12.'
      });
    } finally {
      setLoadingChallenge(false);
    }
  };

  // Switch to Snooze Mode (leads to 2 questions, after which alarm snoozes automatically)
  const handleEnterSnoozeMode = async () => {
    setSnoozeMode(true);
    setSnoozeSolvedCount(0);
    setUserAnswer('');
    setAttemptCount(0);
    setChallengeFeedback('');
    setShowWakefulnessRating(false);
    await loadNextChallenge();
  };

  // Cancel Snooze Mode (returns to normal dismiss flow)
  const handleCancelSnoozeMode = async () => {
    setSnoozeMode(false);
    setSnoozeSolvedCount(0);
    setUserAnswer('');
    setAttemptCount(0);
    setChallengeFeedback('');
    await loadNextChallenge();
  };

  // Verify Answer with exact 5-attempt retry rule:
  // - Correct within 5 attempts: Store ONCE in DB as solved: true
  // - Incorrect after 5th attempt: Store ONCE in DB as solved: false, then load next question
  const handleVerifyAnswer = async (e) => {
    if (e) e.preventDefault();
    if (!geminiChallenge) return;

    const timeTaken = challengeStartTimeRef.current
      ? Math.max(1, Math.round((Date.now() - challengeStartTimeRef.current) / 1000))
      : null;

    if (userAnswer.trim().toLowerCase() === geminiChallenge.answer.toLowerCase()) {
      const answeredCorrectly = userAnswer.trim();
      setUserAnswer('');
      setAttemptCount(0);
      setChallengeFeedback('');

      if (snoozeMode) {
        // ── SNOOZE FLOW (2 Questions required to snooze automatically) ──
        await saveAlarmSession('Snoozed', timeTaken, {
          challenge: geminiChallenge,
          userAnswer: answeredCorrectly,
          solved: true
        });

        const nextSnoozeCount = snoozeSolvedCount + 1;
        setSnoozeSolvedCount(nextSnoozeCount);

        if (nextSnoozeCount < 2) {
          // Solved Snooze Question 1 of 2 -> Load Snooze Question 2
          setChallengeFeedback(`✅ Snooze Question 1 of 2 Solved in ${timeTaken}s! Loading Question 2...`);
          await loadNextChallenge();
        } else {
          // Solved Snooze Question 2 of 2 -> AUTOMATICALLY SNOOZE FOR 5 MINUTES!
          await executeAutoSnooze();
        }
      } else {
        // ── NORMAL FLOW (Solve question -> Take wakefulness rating) ──
        // Store the question, typed answer, and time taken in ref so it is saved together with rating in ONE single row!
        lastSolvedQuestionRef.current = {
          challenge: geminiChallenge,
          userAnswer: answeredCorrectly,
          timeTaken: timeTaken
        };

        stopAlarmSound();
        setShowWakefulnessRating(true);
      }
    } else {
      const nextAttempt = attemptCount + 1;
      setAttemptCount(nextAttempt);

      if (nextAttempt < 5) {
        // Attempts 1 to 4: DO NOT STORE IN DATABASE (No duplicate rows!)
        setChallengeFeedback(`❌ Incorrect answer (Attempt ${nextAttempt}/5). Please try again!`);
      } else {
        // 5th attempt FAILED! Store EXACTLY ONCE as not solved, then load another question
        setChallengeFeedback('⚠️ 5 incorrect attempts reached! Storing as not solved & loading a new question...');
        await saveAlarmSession('Failed', timeTaken, {
          challenge: geminiChallenge,
          userAnswer: userAnswer.trim(),
          solved: false
        });

        setTimeout(async () => {
          setAttemptCount(0);
          setUserAnswer('');
          setChallengeFeedback('');
          await loadNextChallenge();
        }, 1200);
      }
    }
  };

  // Automatically Snooze the alarm for 5 minutes after completing 2 snooze questions
  const executeAutoSnooze = async () => {
    stopAlarmSound();
    if (activeRingingAlarm) {
      const id = activeRingingAlarm.id;
      const now = new Date();
      const snoozeTarget = new Date(now.getTime() + 5 * 60 * 1000);
      let sHours = snoozeTarget.getHours();
      const sMins = snoozeTarget.getMinutes().toString().padStart(2, '0');
      const sAmPm = sHours >= 12 ? 'PM' : 'AM';
      sHours = sHours % 12 || 12;
      const snoozeTimeStr = `${sHours.toString().padStart(2, '0')}:${sMins} ${sAmPm}`;

      // Persist snoozed time to PostgreSQL
      try {
        await fetch(`${API_BASE_URL}/api/alarms/${id}`, {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ alarm_time: snoozeTimeStr, is_active: true })
        });
      } catch (e) {
        console.error('Error persisting snooze time:', e);
      }

      setAlarms(prev => prev.map(a => a.id === id ? { ...a, time: snoozeTimeStr, status: 'Active' } : a));
    }
    setActiveRingingAlarm(null);
    setSnoozeMode(false);
    setSnoozeSolvedCount(0);
    setShowWakefulnessRating(false);
    fetchAlarms();
    fetchUserSessions();
  };

  // Handle wakefulness rating selection (scale 1 to 5) after solving question
  const handleWakefulnessRating = async (rating) => {
    setWakefulnessRating(rating);
    const solvedData = lastSolvedQuestionRef.current || {
      challenge: geminiChallenge,
      userAnswer: userAnswer.trim() || 'Solved',
      timeTaken: null
    };

    if (rating >= 4) {
      // Rating is 4 or 5: Fully Awake! Save dismissal with the user's typed answer and rating in ONE row
      await saveAlarmSession('Dismissed', solvedData.timeTaken, {
        challenge: solvedData.challenge,
        userAnswer: solvedData.userAnswer,
        solved: true,
        wakefulness_rating: rating
      });
      lastSolvedQuestionRef.current = null;
      await handleDismissAlarm();
    } else {
      // Rating is below 4 (1, 2, or 3): Save low wakefulness with the user's typed answer and rating in ONE row
      await saveAlarmSession('Low Wakefulness', solvedData.timeTaken, {
        challenge: solvedData.challenge,
        userAnswer: solvedData.userAnswer,
        solved: true,
        wakefulness_rating: rating
      });
      setShowWakefulnessRating(false);
      setChallengeFeedback(`⚠️ Wakefulness was ${rating}★ (below 4★). Solve another question to fully wake up!`);
      setAttemptCount(0);
      setWakefulnessRating(0);
      lastSolvedQuestionRef.current = null;
      playAlarmSound(activeRingingAlarm?.type || 'REM Sync');
      await loadNextChallenge();
    }
  };

  // Dismiss Alarm: Remove from My Cognitive Alarms (dismissed alarms not shown)
  const handleDismissAlarm = async () => {
    stopAlarmSound();
    if (activeRingingAlarm) {
      const id = activeRingingAlarm.id;
      // Delete dismissed alarm so it is NOT shown in My Cognitive Alarms
      try {
        await fetch(`${API_BASE_URL}/api/alarms/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
      } catch (e) {
        console.error('Failed to delete dismissed alarm:', e);
      }
      setAlarms(prev => prev.filter(a => a.id !== id));
    }
    setActiveRingingAlarm(null);
    setShowWakefulnessRating(false);
    setSnoozeMode(false);
    setSnoozeSolvedCount(0);
    setGeminiChallenge(null);
    setUserAnswer('');
    setAttemptCount(0);
    setWakefulnessRating(0);
    fetchAlarms();
    fetchUserSessions();
  };






  const toggleAlarmStatus = async (id) => {
    const target = alarms.find(a => a.id === id);
    if (!target) return;
    const isEnabling = target.status !== 'Active';
    const endpoint = isEnabling ? 'enable' : 'disable';

    setAlarms(prev => prev.map(a => a.id === id ? { ...a, status: isEnabling ? 'Active' : 'Disabled' } : a));

    try {
      await fetch(`${API_BASE_URL}/api/alarms/${id}/${endpoint}`, { method: 'PATCH' });
    } catch (e) {
      console.error('Error toggling alarm status:', e);
    }
  };

  const deleteAlarm = async (id) => {
    setAlarms(prev => prev.filter(alarm => alarm.id !== id));
    try {
      await fetch(`${API_BASE_URL}/api/alarms/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Error deleting alarm:', e);
    }
  };

  return (
    <AlarmContext.Provider value={{
      alarms,
      setAlarms,
      loadingAlarms,
      alarmHistory,
      loadingHistory,
      fetchAlarms,
      fetchUserSessions,
      activeRingingAlarm,
      triggerAlarmRinging,
      toggleAlarmStatus,
      deleteAlarm
    }}>
      {children}

      {/* ─── GLOBAL RINGING ALARM OVERLAY ─── */}
      {activeRingingAlarm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(10, 25, 47, 0.92)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)', padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '20px', maxWidth: '540px', width: '100%',
            padding: '30px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            animation: 'modalPulse 0.3s ease-out'
          }}>
            {/* ── STAGE 1: WAKEFULNESS RATING (Shown after solving normal question) ── */}
            {showWakefulnessRating ? (
              <div>
                <div style={{textAlign: 'center', marginBottom: '20px'}}>
                  <div style={{fontSize: '3rem', marginBottom: '4px'}}>🌅</div>
                  <h2 style={{margin: '0 0 6px 0', color: '#2d3748', fontSize: '1.6rem', fontWeight: 800}}>
                    How Awake Do You Feel?
                  </h2>
                  <p style={{margin: 0, color: '#2b6cb0', fontWeight: 700, fontSize: '1rem'}}>
                    {activeRingingAlarm.label} — {activeRingingAlarm.time}
                  </p>
                  <p style={{margin: '8px 0 0 0', color: '#718096', fontSize: '0.9rem'}}>
                    Rate your wakefulness. If below ★4, you'll get another challenge to fully wake up!
                  </p>
                </div>

                {/* 5-Star Wakefulness Rating scale */}
                <div style={{display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '14px'}}>
                  {[1, 2, 3, 4, 5].map(star => {
                    const isSelected = wakefulnessRating === star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleWakefulnessRating(star)}
                        style={{
                          width: '58px', height: '58px', borderRadius: '50%',
                          border: isSelected ? '3px solid #2b6cb0' : '2px solid #e2e8f0',
                          fontSize: '1.35rem', cursor: 'pointer', fontWeight: 800,
                          background: star <= 3 ? '#fed7d7' : '#c6f6d5',
                          color: star <= 3 ? '#c53030' : '#276749',
                          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                          boxShadow: isSelected ? '0 0 0 4px rgba(66, 153, 225, 0.4)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {star}★
                      </button>
                    );
                  })}
                </div>

                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#718096', padding: '0 6px', marginTop: '16px'}}>
                  <span style={{color: '#c53030', fontWeight: 600}}>😴 1★–3★ → Another challenge</span>
                  <span style={{color: '#276749', fontWeight: 600}}>4★–5★ → Directly Dismiss ✅</span>
                </div>
              </div>
            ) : (
              /* ── STAGE 2: QUESTION SCREEN (Normal Question OR Snooze 2-Question Mode) ── */
              <div>
                <div style={{textAlign: 'center', marginBottom: '16px'}}>
                  <div style={{fontSize: '2.8rem', animation: 'bounce 1s infinite'}}>
                    {snoozeMode ? '😴' : '⏰'}
                  </div>
                  <h2 style={{margin: '6px 0 2px 0', color: snoozeMode ? '#d69e2e' : '#e53e3e', fontSize: '1.5rem'}}>
                    {snoozeMode ? `Snooze Challenge (${snoozeSolvedCount + 1} of 2)` : 'Alarm Ringing!'}
                  </h2>
                  <p style={{margin: 0, color: '#4a5568', fontWeight: 600, fontSize: '1rem'}}>
                    {activeRingingAlarm.label} — <span style={{color: '#2b6cb0'}}>{activeRingingAlarm.time}</span>
                  </p>
                  <div style={{marginTop: '6px', fontSize: '0.8rem', color: '#718096'}}>
                    {snoozeMode ? (
                      <span style={{color: '#d69e2e', fontWeight: 700}}>
                        Solve 2 questions to snooze automatically ({snoozeSolvedCount}/2 completed)
                      </span>
                    ) : (
                      <span>Theme: {activeRingingAlarm.challengeTheme || 'Math Challenge'} • Difficulty: {activeRingingAlarm.difficulty || 'Medium'}</span>
                    )}
                  </div>
                </div>

                {loadingChallenge ? (
                  <div style={{textAlign: 'center', padding: '28px 0', color: '#718096'}}>
                    <div style={{fontSize: '1.8rem', marginBottom: '8px'}}>🤖</div>
                    <strong>Generating Cognitive Question...</strong>
                  </div>
                ) : geminiChallenge ? (
                  <div>
                    <div style={{
                      padding: '16px',
                      background: '#f7fafc',
                      border: `2px solid ${snoozeMode ? '#ecc94b' : '#bee3f8'}`,
                      borderRadius: '10px',
                      marginBottom: '16px'
                    }}>
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px'}}>
                        <h4 style={{margin: 0, color: snoozeMode ? '#744210' : '#2b6cb0', fontSize: '0.95rem'}}>
                          {geminiChallenge.title}
                        </h4>
                        {snoozeMode && (
                          <span style={{fontSize: '0.75rem', background: '#fefcbf', color: '#744210', padding: '2px 8px', borderRadius: '8px', fontWeight: 700}}>
                            Snooze Q {snoozeSolvedCount + 1}/2
                          </span>
                        )}
                      </div>
                      <p style={{margin: '6px 0', fontWeight: 700, color: '#1a202c', fontSize: '1.2rem'}}>{geminiChallenge.prompt}</p>
                      {geminiChallenge.hint && (
                        <span style={{fontSize: '0.78rem', color: '#718096'}}>💡 Hint: {geminiChallenge.hint}</span>
                      )}
                    </div>

                    <form onSubmit={handleVerifyAnswer}>
                      <div style={{marginBottom: '12px'}}>
                        <label style={{display: 'block', fontWeight: 700, marginBottom: '6px', color: '#2d3748', fontSize: '0.9rem'}}>
                          {snoozeMode ? `Enter answer for Snooze Question ${snoozeSolvedCount + 1}/2:` : `Enter your answer (Attempt ${attemptCount + 1}/5):`}
                        </label>
                        <input
                          type="text"
                          placeholder="Type answer here..."
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          autoFocus
                          required
                          style={{
                            width: '100%', fontSize: '1.25rem', padding: '12px',
                            textAlign: 'center', fontWeight: 700, borderRadius: '8px',
                            border: '2px solid #cbd5e0', boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {challengeFeedback && (
                        <div style={{
                          marginBottom: '12px', fontSize: '0.85rem', fontWeight: 600,
                          textAlign: 'center', padding: '10px', borderRadius: '6px',
                          background: challengeFeedback.startsWith('✅') ? '#c6f6d5' : '#fed7d7',
                          color: challengeFeedback.startsWith('✅') ? '#276749' : '#c53030'
                        }}>
                          {challengeFeedback}
                        </div>
                      )}

                      <button type="submit" style={{
                        width: '100%', padding: '14px',
                        backgroundColor: snoozeMode ? '#d69e2e' : '#e53e3e',
                        color: '#ffffff',
                        border: 'none', borderRadius: '8px',
                        fontSize: '1rem', fontWeight: 700, cursor: 'pointer'
                      }}>
                        {snoozeMode ? `⚡ Submit Snooze Answer (${snoozeSolvedCount + 1}/2)` : `⚡ Submit Answer & Proceed`}
                      </button>

                      {/* ── SNOOZE OPTION BELOW THE FIRST QUESTION ── */}
                      {!snoozeMode ? (
                        <button
                          type="button"
                          onClick={handleEnterSnoozeMode}
                          style={{
                            width: '100%',
                            padding: '11px',
                            background: '#fffbeb',
                            color: '#92400e',
                            border: '2px solid #f6e05e',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            marginTop: '10px'
                          }}
                        >
                          😴 Snooze Alarm (Solve 2 quick questions to snooze)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleCancelSnoozeMode}
                          style={{
                            width: '100%',
                            padding: '9px',
                            background: 'transparent',
                            color: '#718096',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            marginTop: '8px'
                          }}
                        >
                          ← Cancel Snooze (Return to normal wake-up)
                        </button>
                      )}
                    </form>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </AlarmContext.Provider>
  );
};

export const useAlarm = () => useContext(AlarmContext);
