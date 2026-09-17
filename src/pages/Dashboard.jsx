import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import NeuralCore from "../components/NeuralCore";
import { enablePushNotifications } from "../notifications/push";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";
const baseNav = ["Command", "Alarms", "Challenges", "Analytics", "Settings"];
const alarmTypes = [
  ["DAILY", "Daily alarm", "Runs every day"],
  ["WEEKDAY", "Weekday alarm", "Monday through Friday"],
  ["WEEKEND", "Weekend alarm", "Saturday and Sunday"],
  ["ONE_TIME", "One-time alarm", "A single intentional wake-up"],
  ["SMART_ADAPTIVE", "Smart adaptive", "Shifts gently with recovery signals"],
];
const challengeTypes = [
  ["MATH", "Quick calculation", "Turn numbers into a first win."],
  ["LOGIC", "Logic puzzle", "Untangle a small morning riddle."],
  ["MEMORY", "Memory matrix", "Recall the active sequence."],
  ["WORD", "Word spark", "Wake your language circuits."],
  ["PATTERN", "Signal sequence", "Find the next beat in the pattern."],
  ["RIDDLE", "Daybreak riddle", "Use a fresh perspective."],
  ["QUIZ", "Quick quiz", "Make one clear decision."],
  ["REACTION", "Reaction test", "Respond before the pulse fades."],
];
const knownChallengeTypes = new Set(challengeTypes.map(([type]) => type));
const defaultPreferences = {
  preferredWakeTime: "07:00",
  sleepDuration: "8",
  timezone: "Asia/Kolkata",
  productivityGoal: "Protect a 90-minute focus block",
  difficulty: "MEDIUM",
  habits: "Water before screen time, 10-minute daylight walk",
};

const headers = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${window.localStorage.getItem("brainos_token") || ""}`,
});
const readJson = async (response) => { try { return await response.json(); } catch { return null; } };
const fetchWithTimeout = (url, options = {}, timeoutMs = 20000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
};
const magnetic = (strength = 14) => ({
  onMouseMove: (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    event.currentTarget.style.transform = `translate(${(x / rect.width) * strength}px, ${(y / rect.height) * strength}px)`;
  },
  onMouseLeave: (event) => { event.currentTarget.style.transform = ""; },
});
function useAnimatedNumber(target, duration = 1100) {
  const targetValue = Number.isFinite(Number(target)) ? Number(target) : 0;
  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);

  useEffect(() => {
    const from = displayRef.current;
    let frame;
    let start = null;
    const step = (timestamp) => {
      if (start === null) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const next = from + (targetValue - from) * eased;
      displayRef.current = next;
      setDisplay(next);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [targetValue, duration]);

  return display;
}
function AnimatedNumber({ value, decimals = 0 }) {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : null;
  const shown = useAnimatedNumber(numeric ?? 0);
  if (numeric === null) return "—";
  return decimals ? shown.toFixed(decimals) : Math.round(shown);
}
function TypewriterBubble({ text, className }) {
  const [length, setLength] = useState(0);
  useEffect(() => {
    if (!text) return undefined;
    const interval = setInterval(() => {
      setLength((current) => {
        if (current >= text.length) {
          clearInterval(interval);
          return current;
        }
        return current + 1;
      });
    }, 16);
    return () => clearInterval(interval);
  }, [text]);
  const done = length >= text.length;
  return <p className={done ? className : `${className} assistant-bubble-typing`}>{text.slice(0, length)}</p>;
}
const safeRead = (key, fallback) => {
  try { const saved = window.localStorage.getItem(key); return saved ? JSON.parse(saved) : fallback; } catch { return fallback; }
};
const safeWrite = (key, value) => { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Device storage is optional. */ } };
const preferenceKey = (userId) => `brainos_daybreak_preferences_${userId || "guest"}`;
const intentKey = (userId) => `brainos_alarm_intents_${userId || "guest"}`;
const historyKey = (userId) => `brainos_challenge_history_${userId || "guest"}`;
const defaultRepeatDays = (type) => ({ DAILY: "Mon,Tue,Wed,Thu,Fri,Sat,Sun", WEEKDAY: "Mon,Tue,Wed,Thu,Fri", WEEKEND: "Sat,Sun", ONE_TIME: "", SMART_ADAPTIVE: "Mon,Tue,Wed,Thu,Fri" })[type] ?? "";
const labelForAlarmType = (type) => alarmTypes.find(([value]) => value === String(type).toUpperCase())?.[1] || "Wake alarm";
const repeatDayLetters = (alarm) => {
  const type = String(alarm?.alarm_type || "").toUpperCase();
  if (type === "ONE_TIME") return { letters: ["•"], active: [true], oneTime: true };
  const source = String(alarm?.repeat_days || "").toLowerCase();
  const names = ["mon","tue","wed","thu","fri","sat","sun"];
  return {
    letters: ["M","T","W","T","F","S","S"],
    active: names.map((name) => source.includes(name)),
    oneTime: false,
  };
};
const formatTime = (value) => {
  const match = String(value || "07:00").match(/(\d{1,2}):(\d{2})/);
  if (!match) return "07:00";
  const hour = Number(match[1]); const minute = match[2]; const suffix = hour >= 12 ? "PM" : "AM"; const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
};
const bedtimeFrom = (wakeTime, hours) => {
  const match = String(wakeTime || "07:00").match(/(\d{1,2}):(\d{2})/);
  if (!match) return "11:00 PM";
  const totalMinutes = (Number(match[1]) * 60 + Number(match[2]) - Number(hours || 8) * 60 + 1440) % 1440;
  return formatTime(`${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`);
};
const normalizeAnswer = (value) => String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "");
const numericValue = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const normalizeDifficulty = (value, fallback = "MEDIUM") => ["BEGINNER", "EASY", "MEDIUM", "HARD", "EXPERT"].includes(String(value || "").toUpperCase()) ? String(value).toUpperCase() : fallback;
const fallbackTimeLimit = (difficulty) => ({ BEGINNER: 110, EASY: 90, MEDIUM: 75, HARD: 60, EXPERT: 45 })[normalizeDifficulty(difficulty)] || 75;
const fallbackMaxAttempts = (difficulty) => ({ BEGINNER: 3, EASY: 3, MEDIUM: 2, HARD: 2, EXPERT: 1 })[normalizeDifficulty(difficulty)] || 2;
const challengeTitle = (type) => challengeTypes.find(([value]) => value === String(type).toUpperCase())?.[1] || "Cognitive checkpoint";
const preferencesFromProfile = (profile) => {
  const preferences = {};
  if (typeof profile?.preferred_wake_time === "string" && profile.preferred_wake_time) preferences.preferredWakeTime = profile.preferred_wake_time.slice(0, 5);
  if (Number.isFinite(Number(profile?.target_sleep_duration_minutes))) preferences.sleepDuration = String(Math.max(1, Math.round(Number(profile.target_sleep_duration_minutes) / 60)));
  if (typeof profile?.timezone === "string" && profile.timezone) preferences.timezone = profile.timezone;
  if (typeof profile?.productivity_goal === "string" && profile.productivity_goal.trim()) preferences.productivityGoal = profile.productivity_goal;
  if (profile?.difficulty_preference) preferences.difficulty = normalizeDifficulty(profile.difficulty_preference);
  if (Array.isArray(profile?.habit_preferences)) preferences.habits = profile.habit_preferences.join(", ");
  return preferences;
};
const profilePreferencesPayload = (name, preferences) => ({
  name: name.trim(),
  timezone: preferences.timezone,
  preferred_wake_time: preferences.preferredWakeTime,
  target_sleep_duration_minutes: Math.max(60, Math.min(960, Math.round(numericValue(preferences.sleepDuration, 8) * 60))),
  productivity_goal: preferences.productivityGoal.trim(),
  difficulty_preference: normalizeDifficulty(preferences.difficulty),
  habit_preferences: String(preferences.habits || "").split(",").map((habit) => habit.trim()).filter(Boolean),
});
const formatCountdown = (seconds) => {
  const safeSeconds = Math.max(0, Math.ceil(numericValue(seconds, 0)));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
};
const defaultAlarmTitle = (alarmTime) => {
  const hour = Number(String(alarmTime || "").slice(0, 2));
  if (!Number.isFinite(hour)) return "Morning Focus";
  if (hour < 5) return "Night Focus";
  if (hour < 12) return "Morning Focus";
  if (hour < 17) return "Afternoon Focus";
  if (hour < 21) return "Evening Focus";
  return "Night Focus";
};
const getAlarmDueAt = (alarm) => {
  if (!alarm) return null;

  const nextAt = Date.parse(alarm.next_at || "");

  if (Number.isFinite(nextAt)) {
    return nextAt;
  }

  return null;
};
const getChallengeRemainingSeconds = (challenge) => {
  const expiresAt = Date.parse(challenge?.expiresAt || "");
  const deadline = Number.isFinite(expiresAt) ? expiresAt : numericValue(challenge?.startedAt, Date.now()) + numericValue(challenge?.timeLimitSeconds, 0) * 1000;
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
};
const isTerminalChallengeStatus = (status) => ["COMPLETED", "CORRECT", "FAILED", "EXPIRED", "TIMED_OUT", "TIMEOUT", "LOCKED", "MAX_ATTEMPTS"].includes(String(status || "").toUpperCase());
const performanceRecommendation = (performance) => {
  const recommendation = performance?.recommendation;
  const type = recommendation?.challenge_type ?? performance?.recommended_challenge_type ?? performance?.next_challenge_type;
  const difficulty = recommendation?.difficulty ?? performance?.recommended_difficulty ?? performance?.next_difficulty;
  const reason = recommendation?.reason ?? performance?.selection_reason ?? performance?.difficulty_reason;
  return {
    type: knownChallengeTypes.has(String(type || "").toUpperCase()) ? String(type).toUpperCase() : null,
    difficulty: ["BEGINNER", "EASY", "MEDIUM", "HARD", "EXPERT"].includes(String(difficulty || "").toUpperCase()) ? String(difficulty).toUpperCase() : null,
    reason: typeof reason === "string" && reason.trim() ? reason.trim() : null,
  };
};

function fallbackChallenge(type, difficulty = "MEDIUM") {
  const collection = {
    MATH: { prompt: "A calm start uses 19 minutes of movement and 27 minutes of focus. How many minutes is that?", expectedAnswer: "46", options: ["44", "46", "48", "52"], hint: "Add the two blocks together." },
    LOGIC: { prompt: "Three lights wake in order: amber, cyan, violet, then amber. Which light is next?", expectedAnswer: "cyan", options: ["Amber", "Cyan", "Violet", "None"], hint: "The sequence repeats every three lights." },
    MEMORY: { prompt: "Memorize this route: 3 - 8 - 1 - 6. Type the four digits in order.", expectedAnswer: "3816", hint: "Picture each number as a stop on your route." },
    WORD: { prompt: "Unscramble the morning word: R E N E G Y", expectedAnswer: "energy", hint: "It is the resource you are protecting today." },
    PATTERN: { prompt: "Which signal continues this pattern: square, circle, square, circle, ?", expectedAnswer: "square", options: ["Square", "Circle", "Triangle", "Line"], hint: "Alternate the two shapes." },
    RIDDLE: { prompt: "I arrive every morning but never need an invitation. What am I?", expectedAnswer: "sunrise", options: ["Sunrise", "Coffee", "An alarm", "A shadow"], hint: "It changes the colour of the sky." },
    QUIZ: { prompt: "Which tiny action best protects a focused morning?", expectedAnswer: "choose one priority", options: ["Open every notification", "Choose one priority", "Skip water", "Add another meeting"], hint: "Reduce choices before you begin." },
    REACTION: { prompt: "The route is live. Select the word that means ready.", expectedAnswer: "awake", options: ["Paused", "Awake", "Muted", "Later"], hint: "It describes your intended state." },
  };
  const selectedType = knownChallengeTypes.has(String(type).toUpperCase()) ? String(type).toUpperCase() : "PATTERN";
  const challenge = collection[selectedType] || collection.PATTERN;
  const selectedDifficulty = normalizeDifficulty(difficulty);
  const startedAt = Date.now();
  const timeLimitSeconds = fallbackTimeLimit(selectedDifficulty);
  const maxAttempts = fallbackMaxAttempts(selectedDifficulty);
  return {
    ...challenge,
    id: `route-${selectedType}-${startedAt}`,
    type: selectedType,
    difficulty: selectedDifficulty,
    source: "Offline route",
    isOffline: true,
    startedAt,
    expiresAt: new Date(startedAt + timeLimitSeconds * 1000).toISOString(),
    timeLimitSeconds,
    maxAttempts,
    attemptsRemaining: maxAttempts,
    instructions: "Work steadily. Your result stays on this device while the route is offline.",
    selectionReason: "Offline route using your saved difficulty preference.",
  };
}

function adaptChallenge(payload, requestedType, difficulty) {
  const source = payload?.challenge || payload?.data || payload;
  const prompt = source?.prompt ?? source?.question ?? source?.text ?? source?.challenge;
  const remoteId = source?.challenge_id ?? source?.id ?? source?.challengeId;
  if (!prompt || remoteId === undefined || remoteId === null) return null;
  const selectedDifficulty = normalizeDifficulty(source?.difficulty, normalizeDifficulty(difficulty));
  const maxAttempts = Math.max(1, numericValue(source?.max_attempts, fallbackMaxAttempts(selectedDifficulty)));
  const attemptsRemaining = Math.max(0, numericValue(source?.attempts_remaining, maxAttempts));
  const timeLimitSeconds = Math.max(1, numericValue(source?.time_limit_seconds, fallbackTimeLimit(selectedDifficulty)));
  const expiresAt = typeof source?.expires_at === "string" ? source.expires_at : new Date(Date.now() + timeLimitSeconds * 1000).toISOString();
  return {
    id: String(remoteId),
    remoteId,
    type: String(source?.challenge_type || requestedType).toUpperCase(),
    requestedType,
    difficulty: selectedDifficulty,
    prompt,
    options: Array.isArray(source?.options) ? source.options : Array.isArray(source?.choices) ? source.choices : [],
    instructions: source?.instructions || "Choose your answer before the route timer expires.",
    hint: source?.hint || null,
    source: "Adaptive engine",
    isOffline: false,
    startedAt: Date.now(),
    expiresAt,
    timeLimitSeconds,
    maxAttempts,
    attemptsRemaining,
    selectionReason: source?.selection_reason || null,
  };
}

export default function Dashboard({ onSignOut }) {
  const [view, setView] = useState("Command");
  const [profile, setProfile] = useState(null);
  const [alarms, setAlarms] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [missions, setMissions] = useState([]);
  const [nextAlarm, setNextAlarm] = useState(null);
  const [ringingAlarm, setRingingAlarm] = useState(null);
  const [notice, setNotice] = useState("");
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [alarmIntents, setAlarmIntents] = useState({});
  const alarmToneRef = useRef(null);
  const alarmTimerRef = useRef(null);
  const autoStartedAlarmRef = useRef(null);
  const [challengeHistory, setChallengeHistory] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengePerformance, setChallengePerformance] = useState(null);
  const [assistantMessages, setAssistantMessages] = useState([
    { role: "ASSISTANT", content: "Start with one small win: drink water, then protect one focus block.", id: 0 },
  ]);
  const [assistantInput, setAssistantInput] = useState("I am tired and need help waking up");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantHistoryLoaded, setAssistantHistoryLoaded] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState(null);
  const assistantMessageIdRef = useRef(1);
  const nextAssistantMessageId = () => assistantMessageIdRef.current++;
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const refreshChallengePerformance = useCallback(async () => {
    try {
      const response = await fetch(`${API}/challenges/performance`, { headers: headers() });
      if (response.status === 401) { onSignOut(); return null; }
      if (!response.ok) return null;
      const payload = await readJson(response);
      if (payload) setChallengePerformance(payload);
      return payload;
    } catch {
      return null;
    }
  }, [onSignOut]);

  const stopAlarmTone = useCallback(() => {
    if (alarmTimerRef.current) {
      window.clearInterval(alarmTimerRef.current);
      alarmTimerRef.current = null;
    }
    if (alarmToneRef.current) {
      try { alarmToneRef.current.close(); } catch { /* Audio context cleanup is optional. */ }
      alarmToneRef.current = null;
    }
  }, []);

  const playAlarmTone = useCallback(() => {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.045;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.22);
    alarmToneRef.current = context;
    const cleanup = () => {
      try { oscillator.disconnect(); gain.disconnect(); context.close(); } catch { /* Browser audio shutdown is best effort only. */ }
    };
    window.setTimeout(cleanup, 350);
  }, []);

  const triggerAlarmNotification = useCallback((alarm) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      new Notification(alarm?.title || "Wake mission", {
        body: `It is time to wake up. ${formatTime(alarm?.alarm_time || "07:00")}`,
        tag: `brainos-alarm-${alarm?.alarm_id || "active"}`,
      });
    }
  }, []);

  const ringAlarm = useCallback((alarm) => {
    if (!alarm || ringingAlarm?.alarm_id === alarm.alarm_id) return;
    setRingingAlarm(alarm);
    setNotice(`${alarm.title || "Wake mission"} is ringing. Solve the cognitive checkpoint first.`);
    triggerAlarmNotification(alarm);
    playAlarmTone();
    if (alarmTimerRef.current) window.clearInterval(alarmTimerRef.current);
    alarmTimerRef.current = window.setInterval(playAlarmTone, 1800);
  }, [playAlarmTone, ringingAlarm, triggerAlarmNotification]);

  const snoozeActiveAlarm = useCallback(async (alarm) => {
  if (!alarm) return;
    if (ringingAlarm?.alarm_id === alarm.alarm_id) {
      setNotice("Complete the cognitive checkpoint before snoozing this alarm.");
      return;
    }

  const minutes = Number(alarm.snooze_minutes ?? 5) || 5;

  try {
    const response = await fetch(
      `${API}/alarms/${alarm.alarm_id}/snooze`,
      {
        method: "POST",
        headers: headers(),
      }
    );

    if (response.status === 401) {
      onSignOut();
      return;
    }

    const payload = await readJson(response);

    if (!response.ok) {
      setNotice(payload?.detail || "Unable to snooze this alarm.");
      return;
    }

    stopAlarmTone();
    setRingingAlarm(null);

    const snoozedUntil = payload?.snoozed_until;

    setNextAlarm((current) => {
      if (!current || current.alarm_id !== alarm.alarm_id) {
        return current;
      }

      return {
        ...current,
        next_at:
          snoozedUntil ||
          new Date(Date.now() + minutes * 60000).toISOString(),
        snoozed_until: snoozedUntil || null,
      };
    });

    setNotice(
      `Alarm snoozed for ${minutes} minute${minutes === 1 ? "" : "s"}.`
    );

    
  } catch {
    setNotice("The alarm service is unavailable right now.");
  }
}, [onSignOut, ringingAlarm, stopAlarmTone]);

  const load = useCallback(async () => {
    try {
      const [profileResponse, alarmsResponse, analyticsResponse] = await Promise.all([
        fetch(`${API}/profile`, { headers: headers() }),
        fetch(`${API}/alarms`, { headers: headers() }),
        fetch(`${API}/analytics`, { headers: headers() }),
      ]);
      if ([profileResponse, alarmsResponse, analyticsResponse].some((response) => response.status === 401)) return onSignOut();
      if (![profileResponse, alarmsResponse, analyticsResponse].every((response) => response.ok)) throw new Error("Core route data could not be loaded.");
      const [nextProfile, nextAlarms, nextAnalytics] = await Promise.all([readJson(profileResponse), readJson(alarmsResponse), readJson(analyticsResponse)]);
      setProfile(nextProfile);
      setAlarms(Array.isArray(nextAlarms) ? nextAlarms : []);
      setAnalytics(nextAnalytics);
      setNextAlarm((Array.isArray(nextAlarms) ? nextAlarms : []).find((alarm) => alarm.status !== "DISABLED") || null);
      if (nextProfile?.id) {
        setPreferences({
          ...defaultPreferences,
          ...preferencesFromProfile(nextProfile),
          ...safeRead(preferenceKey(nextProfile.id), {}),
        });
        setAlarmIntents(safeRead(intentKey(nextProfile.id), {}));
        setChallengeHistory(safeRead(historyKey(nextProfile.id), []));
      }

      const [nextResponse, missionsResponse, performanceResponse] = await Promise.all([
        fetch(`${API}/alarms/check-next`, { method: "POST", headers: headers() }).catch(() => null),
        fetch(`${API}/missions`, { headers: headers() }).catch(() => null),
        fetch(`${API}/challenges/performance`, { headers: headers() }).catch(() => null),
      ]);
      if (nextResponse?.status === 401 || missionsResponse?.status === 401 || performanceResponse?.status === 401) return onSignOut();
      if (nextResponse?.ok) {
        const payload = await readJson(nextResponse);
        const next = payload?.next_alarm ? { ...payload.next_alarm, next_at: payload.next_at } : null;
        setNextAlarm(next);
      }
      if (missionsResponse?.ok) { const payload = await readJson(missionsResponse); setMissions(Array.isArray(payload) ? payload : []); }
      if (performanceResponse?.ok) { const payload = await readJson(performanceResponse); if (payload) setChallengePerformance(payload); }
    } catch {
      setNotice("The Daybreak Route is in offline mode. Your saved preferences still work on this device.");
    }
  }, [onSignOut]);

  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission()
        .then((permission) => { if (permission === "granted") void enablePushNotifications(); })
        .catch(() => { /* Browser permission prompts are optional. */ });
    } else if (Notification.permission === "granted") {
      void enablePushNotifications();
    }
  }, []);
  
useEffect(() => {
  if (!nextAlarm || ringingAlarm) return undefined;

  const dueAt = getAlarmDueAt(nextAlarm);

  if (!Number.isFinite(dueAt)) return undefined;

  const checkAlarm = () => {
    const lateness = Date.now() - dueAt;
    if (lateness >= 0 && lateness <= 15 * 60 * 1000) {
      ringAlarm(nextAlarm);
    }
  };

  checkAlarm();

  const timer = window.setInterval(checkAlarm, 1000);

  return () => window.clearInterval(timer);
}, [nextAlarm, ringingAlarm, ringAlarm]);

  useEffect(() => {
    return () => stopAlarmTone();
  }, [stopAlarmTone]);

  const saveAlarmIntent = (alarmId, intent) => {
    if (!alarmId || !intent) return;
    setAlarmIntents((current) => {
      const next = { ...current, [alarmId]: intent };
      safeWrite(intentKey(profile?.id), next);
      return next;
    });
  };

  const createAlarm = async (form) => {
    const { intent, ...payload } = form;
    const create = () => fetch(`${API}/alarm`, { method: "POST", headers: headers(), body: JSON.stringify(payload) });
    try {
      let response = await create();
      if (response.status === 404) response = await fetch(`${API}/alarms`, { method: "POST", headers: headers(), body: JSON.stringify(payload) });
      if (response.status === 401) return onSignOut();
      if (!response.ok) return setNotice("This wake signal could not be synchronized. Check the required fields and try again.");
      const created = await readJson(response);
      saveAlarmIntent(created?.alarm_id, intent);
      setNotice("Wake signal added to your Daybreak Route.");
      await load();
      return true;
    } catch {
      setNotice("The alarm service is unavailable right now. Your route remains unchanged.");
      return false;
    }
  };

  const updateAlarm = async (alarmId, form, intent) => {
    const alarmTime = String(form.alarm_time || "").slice(0, 5);
    const payload = {
      title: form.title?.trim() || defaultAlarmTitle(alarmTime),
      alarm_time: alarmTime,
      alarm_type: form.alarm_type || "DAILY",
      repeat_days: form.alarm_type === "ONE_TIME" ? "" : form.repeat_days || null,
      difficulty: normalizeDifficulty(form.difficulty, preferences.difficulty || "MEDIUM"),
      sound: form.sound || "Neural Dawn",
      vibration: form.vibration !== false,
      snooze_minutes: Number(form.snooze_minutes ?? 5),
      status: form.status || "ACTIVE",
    };

    try {
      let response = await fetch(`${API}/alarm/${alarmId}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(payload),
      });

      if (response.status === 404) {
        response = await fetch(`${API}/alarms/${alarmId}`, {
          method: "PUT",
          headers: headers(),
          body: JSON.stringify(payload),
        });
      }

      if (response.status === 401) return onSignOut();

      if (!response.ok) {
        const error = await readJson(response);
        setNotice(error?.detail || "That wake signal could not be updated.");
        return false;
      }

      saveAlarmIntent(alarmId, intent);
      setNotice("Wake protocol updated.");
      await load();
      return true;
    } catch {
      setNotice("The alarm service is unavailable right now.");
      return false;
    }
  };

  const removeAlarm = async (alarmId) => {
    try {
      let response = await fetch(`${API}/alarm/${alarmId}`, { method: "DELETE", headers: headers() });
      if (response.status === 404) response = await fetch(`${API}/alarms/${alarmId}`, { method: "DELETE", headers: headers() });
      if (response.status === 401) return onSignOut();
      if (!response.ok) return setNotice("That wake signal could not be removed.");
      if (ringingAlarm?.alarm_id === alarmId) {
        stopAlarmTone();
        setRingingAlarm(null);
      }
      if (nextAlarm?.alarm_id === alarmId) {
        setNextAlarm((current) => current?.alarm_id === alarmId ? null : current);
      }
      setNotice("Wake signal removed from your route.");
      await load();
    } catch { setNotice("The alarm service is unavailable right now."); }
  };

  const toggleAlarm = async (alarm) => {
    const enabled = alarm.status === "DISABLED";
    try {
      let response = await fetch(`${API}/alarms/${alarm.alarm_id}/${enabled ? "enable" : "disable"}`, { method: "PATCH", headers: headers() });
      if (response.status === 404) {
        const payload = {
          title: alarm.title || "Wake mission", alarm_time: String(alarm.alarm_time).slice(0, 5), alarm_type: alarm.alarm_type || "DAILY",
          repeat_days: alarm.repeat_days || null, difficulty: alarm.difficulty || "MEDIUM", sound: alarm.sound || "Neural Dawn",
          vibration: alarm.vibration !== false, snooze_minutes: Number(alarm.snooze_minutes ?? 5), status: enabled ? "ACTIVE" : "DISABLED",
        };
        response = await fetch(`${API}/alarm/${alarm.alarm_id}`, { method: "PATCH", headers: headers(), body: JSON.stringify(payload) });
      }
      if (response.status === 401) return onSignOut();
      if (!response.ok) return setNotice("The alarm status could not be changed.");
      if (!enabled && ringingAlarm?.alarm_id === alarm.alarm_id) {
        stopAlarmTone();
        setRingingAlarm(null);
      }
      if (nextAlarm?.alarm_id === alarm.alarm_id && !enabled) {
        setNextAlarm((current) => current?.alarm_id === alarm.alarm_id ? null : current);
      }
      setAlarms((current) => current.map((item) => item.alarm_id === alarm.alarm_id ? { ...item, status: enabled ? "ACTIVE" : "DISABLED" } : item));
      setNotice(enabled ? "Wake signal is active again." : "Wake signal paused.");
    } catch { setNotice("The alarm service is unavailable right now."); }
  };

  const activateChallenge = useCallback(async (type, difficulty, context = {}) => {
    setChallengeLoading(true);
    try {
      const recommendedDifficulty = performanceRecommendation(challengePerformance).difficulty;
      const fallbackDifficulty = normalizeDifficulty(difficulty || recommendedDifficulty || preferences.difficulty);
      let challenge = fallbackChallenge(type, fallbackDifficulty);
      try {
        const request = { challenge_type: type, intent: "WAKE_UP" };
        if (difficulty) request.difficulty = normalizeDifficulty(difficulty);
        const generated = await fetchWithTimeout(`${API}/challenges/generate`, { method: "POST", headers: headers(), body: JSON.stringify(request) }, 30000);
        if (generated.status === 401) return onSignOut();
        if (generated.ok) {
          const adapted = adaptChallenge(await readJson(generated), type, fallbackDifficulty);
          if (adapted) challenge = adapted;
          else setNotice("The challenge response was incomplete, so this checkpoint is running locally.");
        } else {
          setNotice("The challenge service is unavailable, so this checkpoint is running locally.");
        }
      } catch {
        setNotice("The challenge service is offline, so this checkpoint is running on this device.");
      }
      try {
        const missionResponse = await fetch(`${API}/mission`, { method: "POST", headers: headers(), body: JSON.stringify({ challenge_type: type, reward: 180 }) });
        if (missionResponse.status === 401) return onSignOut();
        if (missionResponse.ok) {
          const mission = await readJson(missionResponse);
          challenge = { ...challenge, missionId: mission?.mission_id };
          if (mission) setMissions((current) => [mission, ...current]);
        }
      } catch { /* A challenge can still be completed locally. */ }
     setActiveChallenge({
  ...challenge,
  alarmId: context.alarmId ?? null,
  alarmTriggered: Boolean(context.alarmId),
});

setView("Challenges");
    } finally {
      setChallengeLoading(false);
    }
  }, [challengePerformance, onSignOut, preferences.difficulty]);
  
 const startAlarmChallenge = useCallback(async (alarm) => {
  if (!alarm) return;
  if (activeChallenge?.alarmTriggered && activeChallenge.alarmId === alarm.alarm_id) return;

  const intent = alarmIntents?.[alarm.alarm_id] || {};
  const recommendation = performanceRecommendation(challengePerformance);

  const configuredTypes = Array.isArray(intent.challengeTypes)
    ? intent.challengeTypes
        .map((type) => String(type).toUpperCase())
        .filter((type) => knownChallengeTypes.has(type))
    : [];

  const recommendedType =
    recommendation.type && configuredTypes.includes(recommendation.type)
      ? recommendation.type
      : null;

  const type =
    recommendedType ||
    (configuredTypes.length > 0 ? configuredTypes[0] : null) ||
    (knownChallengeTypes.has(String(alarm.challenge_type || "").toUpperCase())
      ? String(alarm.challenge_type).toUpperCase()
      : null) ||
    recommendation.type ||
    "RIDDLE";

  const difficulty =
    intent.difficulty === "ADAPTIVE"
      ? recommendation.difficulty || preferences.difficulty || "MEDIUM"
      : normalizeDifficulty(
          intent.difficulty || alarm.difficulty || recommendation.difficulty || preferences.difficulty
        );

  await activateChallenge(type, difficulty, {
    alarmId: alarm.alarm_id,
  });
}, [
  activateChallenge,
  activeChallenge,
  alarmIntents,
  challengePerformance,
  preferences.difficulty,
]);

useEffect(() => {
  if (!ringingAlarm) {
    autoStartedAlarmRef.current = null;
    return;
  }
  if (autoStartedAlarmRef.current === ringingAlarm.alarm_id) return;
  autoStartedAlarmRef.current = ringingAlarm.alarm_id;
  void startAlarmChallenge(ringingAlarm);
}, [ringingAlarm, startAlarmChallenge]);

const recordChallengeOutcome = (challenge, outcome) => {
    if (!outcome.correct && !outcome.terminal) return;
    const entry = {
      id: `${challenge.id}-${Date.now()}`,
      challengeId: String(challenge.id),
      type: challenge.type,
      difficulty: challenge.difficulty,
      correct: Boolean(outcome.correct),
      terminal: true,
      elapsedSeconds: outcome.elapsedSeconds ?? null,
      completedAt: new Date().toISOString(),
    };
    setChallengeHistory((current) => {
      const next = [entry, ...current.filter((item) => item.challengeId !== entry.challengeId)].slice(0, 20);
      safeWrite(historyKey(profile?.id), next);
      return next;
    });
  };

  const completeChallengeMission = async (challenge) => {
    if (!challenge.missionId) return;
    try {
      const response = await fetch(`${API}/mission/${challenge.missionId}/complete`, { method: "PATCH", headers: headers() });
      if (response.status === 401) return onSignOut();
      if (response.ok) setMissions((current) => current.map((mission) => mission.mission_id === challenge.missionId ? { ...mission, completed: true } : mission));
    } catch { /* The verified or offline completion remains in device history. */ }
  };

 const completeAlarmWake = useCallback(async (alarmId) => {
  try {
    const response = await fetch(`${API}/alarms/${alarmId}/complete-wake`, {
      method: "POST",
      headers: headers(),
    });

    if (response.status === 401) {
      onSignOut();
      return false;
    }

    const payload = await readJson(response);

    if (!response.ok) {
      setNotice(
        payload?.detail || "Challenge cleared, but the alarm could not be finalized."
      );
      return false;
    }

    stopAlarmTone();
    setRingingAlarm(null);

    setNextAlarm((current) => {
      if (!current || current.alarm_id !== alarmId) return current;

      if (payload?.next_at) {
        return {
          ...current,
          status: payload.status || current.status || "ACTIVE",
          next_at: payload.next_at,
          snoozed_until: null,
        };
      }

      return null;
    });

    setNotice(
      payload?.next_at
        ? "Wake protocol complete. Your next wake signal is scheduled."
        : "Wake protocol complete. Alarm cleared."
    );

    return true;
  } catch {
    setNotice(
      "Challenge cleared, but alarm finalization is unavailable."
    );
    return false;
  }
}, [onSignOut, stopAlarmTone]);

const dismissVerifiedAlarm = useCallback(async (challenge) => {
  if (!challenge?.alarmId) return;
  const completed = await completeAlarmWake(challenge.alarmId);
  if (completed) {
    setActiveChallenge(null);
    setView("Command");
  }
}, [completeAlarmWake]);

const snoozeVerifiedAlarm = useCallback(async (challenge) => {
  if (!challenge?.alarmId) return;
  const alarm = alarms.find((item) => item.alarm_id === challenge.alarmId);
  if (!alarm) {
    setNotice("The verified alarm could not be found.");
    return;
  }
  await snoozeActiveAlarm(alarm);
  setActiveChallenge(null);
  setView("Command");
}, [alarms, snoozeActiveAlarm]);

const submitChallenge = async (challenge, answer, meta = {}) => {
  const timedOut = Boolean(meta.timedOut);

  if (challenge.remoteId) {
    try {
      const response = await fetch(
        `${API}/challenges/${challenge.remoteId}/validate`,
        {
          method: "POST",
          headers: headers(),
          body: JSON.stringify({ answer }),
        }
      );

      if (response.status === 401) {
        onSignOut();
        return {
          correct: false,
          terminal: true,
          message: "Your session has ended.",
        };
      }

      if (response.ok) {
        const verdict = await readJson(response);
        const correct = verdict?.correct === true;

        const attemptsRemaining = Math.max(
          0,
          numericValue(
            verdict?.attempts_remaining,
            challenge.attemptsRemaining
          )
        );

        const timeRemainingSeconds = Math.max(
          0,
          numericValue(
            verdict?.time_remaining_seconds,
            getChallengeRemainingSeconds(challenge)
          )
        );

        const terminal =
          correct ||
          timedOut ||
          verdict?.completed === true ||
          isTerminalChallengeStatus(verdict?.status) ||
          attemptsRemaining <= 0 ||
          timeRemainingSeconds <= 0;

        const elapsedSeconds = numericValue(
          verdict?.elapsed_seconds,
          Math.round((Date.now() - challenge.startedAt) / 1000)
        );

        const insight =
          typeof verdict?.insight === "string"
            ? verdict.insight
            : "";

        const outcome = {
          correct,
          terminal,
          status:
            verdict?.status ||
            (correct ? "COMPLETED" : terminal ? "FAILED" : "RETRY"),
          attemptsRemaining,
          timeRemainingSeconds,
          elapsedSeconds,
          message: correct
            ? insight ||
              "Checkpoint complete. Your morning momentum is protected."
            : terminal
              ? insight ||
                (
                  timedOut || timeRemainingSeconds <= 0
                    ? "Time is up for this checkpoint. Build a fresh one when you are ready."
                    : "This checkpoint is complete. Build a fresh one when you are ready."
                )
              : `${insight || "Not quite. Reset your breath and try again."} ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`,
        };

        recordChallengeOutcome(challenge, outcome);

        if (correct) {
          await completeChallengeMission(challenge);

          if (challenge.alarmTriggered && challenge.alarmId) {
            await completeAlarmWake(challenge.alarmId);
            setNotice(
              "Checkpoint verified. Choose whether to dismiss the alarm or snooze it."
            );
          } else {
            setNotice(
              `Route checkpoint complete - ${challenge.type.toLowerCase()} clarity unlocked.`
            );
          }
        }

        if (terminal) {
          void refreshChallengePerformance();
        }

        return outcome;
      }

      const error = await readJson(response);
      const terminal = timedOut || response.status === 409;

      const outcome = {
        correct: false,
        terminal,
        attemptsRemaining: Math.max(
          0,
          numericValue(
            challenge.attemptsRemaining,
            challenge.maxAttempts
          )
        ),
        timeRemainingSeconds: getChallengeRemainingSeconds(challenge),
        elapsedSeconds: Math.round(
          (Date.now() - challenge.startedAt) / 1000
        ),
        message:
          typeof error?.detail === "string"
            ? error.detail
            : terminal
              ? "This checkpoint can no longer be verified. Build a fresh one when you are ready."
              : "We could not verify that answer. Please try again while the connection returns.",
      };

      recordChallengeOutcome(challenge, outcome);
      return outcome;
    } catch {
      const terminal = timedOut;

      const outcome = {
        correct: false,
        terminal,
        attemptsRemaining: Math.max(
          0,
          numericValue(
            challenge.attemptsRemaining,
            challenge.maxAttempts
          )
        ),
        timeRemainingSeconds:
          getChallengeRemainingSeconds(challenge),
        elapsedSeconds: Math.round(
          (Date.now() - challenge.startedAt) / 1000
        ),
        message: terminal
          ? "Time is up for this checkpoint. Your device saved the terminal result locally."
          : "The validation service is unreachable. Keep this checkpoint open and try again when the connection returns.",
      };

      recordChallengeOutcome(challenge, outcome);
      return outcome;
    }
  }

  // Offline/local challenge validation
  const attemptsRemaining = Math.max(
    0,
    numericValue(
      meta.attemptsRemaining,
      challenge.attemptsRemaining
    )
  );

  const correct =
    !timedOut &&
    normalizeAnswer(answer) ===
      normalizeAnswer(challenge.expectedAnswer);

  const nextAttemptsRemaining = correct
    ? attemptsRemaining
    : Math.max(0, attemptsRemaining - 1);

  const terminal =
    correct ||
    timedOut ||
    nextAttemptsRemaining <= 0;

  const outcome = {
    correct,
    terminal,
    status: correct
      ? "COMPLETED"
      : terminal
        ? timedOut
          ? "TIMED_OUT"
          : "MAX_ATTEMPTS"
        : "RETRY",
    attemptsRemaining: nextAttemptsRemaining,
    timeRemainingSeconds:
      getChallengeRemainingSeconds(challenge),
    elapsedSeconds: Math.round(
      (Date.now() - challenge.startedAt) / 1000
    ),
    message: correct
      ? "Checkpoint complete. Your morning momentum is protected."
      : terminal
        ? timedOut
          ? "Time is up. This offline checkpoint has been saved as complete."
          : "No attempts remain. This offline checkpoint has been saved as complete."
        : `Not quite. Use the hint, reset your breath, and try again. ${nextAttemptsRemaining} attempt${nextAttemptsRemaining === 1 ? "" : "s"} remaining.`,
  };

  recordChallengeOutcome(challenge, outcome);

  if (correct) {
    await completeChallengeMission(challenge);

    if (challenge.alarmTriggered && challenge.alarmId) {
      await completeAlarmWake(challenge.alarmId);
    } else {
      setNotice(
        `Route checkpoint complete - ${challenge.type.toLowerCase()} clarity unlocked.`
      );
    }
  }

  return outcome;
};

  const saveSettings = async (name, nextPreferences) => {
    const cleanedName = name.trim();
    const profilePayload = profilePreferencesPayload(cleanedName, nextPreferences);
    safeWrite(preferenceKey(profile?.id), nextPreferences);
    setPreferences(nextPreferences);
    let profileSaved = false;
    try {
      const response = await fetch(`${API}/profile`, { method: "PATCH", headers: headers(), body: JSON.stringify(profilePayload) });
      if (response.status === 401) return onSignOut();
      if (response.ok) { setProfile((current) => ({ ...current, name: cleanedName })); profileSaved = true; }
    } catch { /* Preferences still persist locally if the account API is offline. */ }
    try {
      await fetch(`${API}/profile/preferences`, { method: "PATCH", headers: headers(), body: JSON.stringify(profilePayload) });
    } catch { /* Older API versions do not expose preference storage yet. */ }
    setNotice(profileSaved ? "Profile and Daybreak preferences saved." : "Daybreak preferences saved on this device; profile sync will resume when the API is online.");
  };

  const loadAssistantHistory = useCallback(async () => {
    try {
      const response = await fetch(`${API}/assistant/messages`, { headers: headers() });
      if (response.status === 401) return onSignOut();
      const payload = await readJson(response);
      if (payload?.messages?.length) setAssistantMessages(payload.messages.map((entry) => ({ ...entry, id: nextAssistantMessageId() })));
    } catch {
      // Keep the default greeting if history can't be loaded (e.g. offline).
    } finally {
      setAssistantHistoryLoaded(true);
    }
  }, [onSignOut]);

  useEffect(() => {
    if (assistantHistoryLoaded) return undefined;
    const timer = setTimeout(() => { void loadAssistantHistory(); }, 0);
    return () => clearTimeout(timer);
  }, [assistantHistoryLoaded, loadAssistantHistory]);

  const askAssistant = async () => {
    const message = assistantInput.trim();
    if (!message) return;
    setAssistantMessages((current) => [...current, { role: "USER", content: message, id: nextAssistantMessageId() }]);
    setAssistantInput("");
    setAssistantLoading(true);
    try {
      const response = await fetchWithTimeout(`${API}/assistant/help`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ message }),
      }, 30000);
      if (response.status === 401) return onSignOut();
      const payload = await readJson(response);
      const replyId = nextAssistantMessageId();
      setTypingMessageId(replyId);
      setAssistantMessages((current) => [
        ...current,
        { role: "ASSISTANT", content: payload?.reply || "Keep it small. One clear action is enough to start the day well.", id: replyId },
      ]);
    } catch {
      const replyId = nextAssistantMessageId();
      setTypingMessageId(replyId);
      setAssistantMessages((current) => [
        ...current,
        { role: "ASSISTANT", content: "The AI guide is unavailable right now, but a simple morning plan still helps: water, light, one priority task.", id: replyId },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  const clearAssistantConversation = async () => {
    setTypingMessageId(null);
    setAssistantMessages([{ role: "ASSISTANT", content: "New conversation. What's on your mind this morning?", id: nextAssistantMessageId() }]);
    try {
      await fetch(`${API}/assistant/messages`, { method: "DELETE", headers: headers() });
    } catch {
      // Local view already reset; the server-side history will just get pruned on next successful call.
    }
  };

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${API}/notifications`, { headers: headers() });
      if (response.status === 401) return onSignOut();
      const payload = await readJson(response);
      if (Array.isArray(payload)) setNotifications(payload);
    } catch {
      // Notifications are a convenience layer; a failed fetch just leaves the last known list.
    }
  }, [onSignOut]);

  useEffect(() => { const timer = setTimeout(() => { void loadNotifications(); }, 0); return () => clearTimeout(timer); }, [loadNotifications]);

  const markNotificationRead = async (notificationId) => {
    setNotifications((current) => current.map((n) => n.notification_id === notificationId ? { ...n, read: true } : n));
    try {
      await fetch(`${API}/notifications/${notificationId}/read`, { method: "PATCH", headers: headers() });
    } catch {
      // Local state already reflects "read"; a background retry isn't worth the complexity here.
    }
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  const toggleNotifications = () => {
    setNotificationsOpen((open) => {
      const next = !open;
      if (next) void loadNotifications();
      return next;
    });
  };

  const role = String(profile?.role || "USER").toUpperCase();
  const privileged = ["ADMIN", "WELLNESS_COACH", "COACH"].includes(role);
  const navigation = useMemo(() => privileged ? ["Workspace"] : baseNav, [privileged]);
  const workspaceLabel = ["WELLNESS_COACH", "COACH"].includes(role) ? "Coach Panel" : "Admin Panel";

  useEffect(() => {
    if (!privileged || navigation.includes(view)) return undefined;
    const timer = setTimeout(() => setView("Workspace"), 0);
    return () => clearTimeout(timer);
  }, [privileged, navigation, view]);

  const spotlightRef = useRef(null);
  const handleSpotlightMove = (event) => {
    const node = spotlightRef.current;
    if (!node) return;
    node.style.setProperty("--spot-x", `${event.clientX}px`);
    node.style.setProperty("--spot-y", `${event.clientY}px`);
    node.classList.add("is-active");
  };
  const handleSpotlightLeave = () => { spotlightRef.current?.classList.remove("is-active"); };

  return <main className="dashboard-shell" onMouseMove={handleSpotlightMove} onMouseLeave={handleSpotlightLeave}><div className="star-field" /><div className="cursor-spotlight" ref={spotlightRef} />
    <nav className="dash-nav"><div className="wordmark"><i /> BRAIN<span>OS</span></div><div className="nav-links">{navigation.map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item === "Command" ? "Today" : item === "Workspace" ? workspaceLabel : item}</button>)}</div><div className="nav-status"><b /> DAYBREAK LINK</div><div className="notification-bell-wrap"><button className="notification-bell" onClick={toggleNotifications} title="Notifications" aria-label="Notifications">ALERTS{unreadNotificationCount > 0 && <span className="notification-badge">{unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}</span>}</button>{notificationsOpen && <div className="notification-panel">
      <div className="notification-panel-heading"><span>NOTIFICATIONS</span><button type="button" onClick={() => setNotificationsOpen(false)} aria-label="Close notifications">&times;</button></div>
      <div className="notification-list">
        {notifications.map((entry) => (
          <button key={entry.notification_id} type="button" className={`notification-item${entry.read ? "" : " unread"}`} onClick={() => markNotificationRead(entry.notification_id)}>
            <b>{entry.title}</b>
            <p>{entry.message}</p>
            <small>{new Date(entry.created_at).toLocaleString()}</small>
          </button>
        ))}
        {!notifications.length && <p className="mission-copy">No notifications yet.</p>}
      </div>
    </div>}</div><button className="avatar" onClick={onSignOut} title="Sign out">{profile?.name?.[0] || "P"}</button></nav>
    {notice && <div className="toast" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">&times;</button></div>}
    <div className={`view-frame view-${view.toLowerCase()}`} key={view}>
    {view === "Command" && <Command
    profile={profile}
    alarms={alarms}
    analytics={analytics}
    nextAlarm={nextAlarm}
    ringingAlarm={ringingAlarm}
    onSolveAlarm={startAlarmChallenge}
    challengeLoading={challengeLoading}
    preferences={preferences}
    missions={missions}
    history={challengeHistory}
    onStartChallenge={activateChallenge}
    goAlarms={() => setView("Alarms")}
    assistantMessages={assistantMessages}
    typingMessageId={typingMessageId}
    assistantInput={assistantInput}
    setAssistantInput={setAssistantInput}
    askAssistant={askAssistant}
    assistantLoading={assistantLoading}
    clearAssistantConversation={clearAssistantConversation}
  />}
    {view === "Alarms" && <Alarms alarms={alarms} alarmIntents={alarmIntents} createAlarm={createAlarm} updateAlarm={updateAlarm} removeAlarm={removeAlarm} toggleAlarm={toggleAlarm} preferences={preferences} challengePerformance={challengePerformance} />}
    {view === "Challenges" && <Challenges activeChallenge={activeChallenge} loading={challengeLoading} history={challengeHistory} missions={missions} performance={challengePerformance} defaultDifficulty={preferences.difficulty} onStartChallenge={activateChallenge} onSubmitChallenge={submitChallenge} onCloseChallenge={() => setActiveChallenge(null)} onAlarmDismiss={dismissVerifiedAlarm} onAlarmSnooze={snoozeVerifiedAlarm} />}
    {view === "Analytics" && <Analytics data={analytics} history={challengeHistory} missions={missions} />}
    {view === "Settings" && <Settings key={profile?.id ?? "loading"} profile={profile} preferences={preferences} saveSettings={saveSettings} />}
    {view === "Workspace" && privileged && <Workspace role={role} />}
    </div>
  </main>;
}


function Alarms({
  alarms,
  alarmIntents,
  createAlarm,
  updateAlarm,
  removeAlarm,
  toggleAlarm,
  preferences,
  challengePerformance,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState(null);
  const recommendation = performanceRecommendation(challengePerformance);

  useEffect(() => {
    if (!showCreate) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [showCreate]);

  const defaultChallengePool = [
    "MATH",
    "LOGIC",
    "MEMORY",
    "WORD",
    "PATTERN",
    "RIDDLE",
    "QUIZ",
    "REACTION",
  ];

  const defaultForm = () => ({
    title: "",
    alarm_type: "WEEKDAY",
    repeat_days: "Mon,Tue,Wed,Thu,Fri",
    hour: "07",
    minute: "00",
    meridiem: "AM",
    challengeMode: "AUTO",
    challengeTypes: [...defaultChallengePool],
    difficulty: "ADAPTIVE",
    wakeStrategy: "FOCUS",
    snooze_minutes: 5,
    snoozePolicy: "NEW_CHALLENGE",
    sound: "Neural Dawn",
    vibration: true,
  });

  const [form, setForm] = useState(defaultForm);

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateTime = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const alarmTimeValue = (() => {
    const hour = Number(form.hour);
    const hour24 =
      form.meridiem === "PM"
        ? hour === 12
          ? 12
          : hour + 12
        : hour === 12
          ? 0
          : hour;
    const minute = String(form.minute || "0").replace(/\D/g, "").slice(0, 2);
const safeMinute = String(
  Math.min(59, Math.max(0, Number(minute) || 0))
).padStart(2, "0");

return `${String(hour24).padStart(2, "0")}:${safeMinute}`;
  })();

  const challengeLabels = {
    MATH: "Math",
    LOGIC: "Logic",
    MEMORY: "Memory",
    WORD: "Word",
    PATTERN: "Pattern",
    RIDDLE: "Riddle",
    QUIZ: "Quick Quiz",
    REACTION: "Reaction",
  };

  const toggleChallengeType = (type) => {
    setForm((current) => {
      const exists = current.challengeTypes.includes(type);
      const next = exists
        ? current.challengeTypes.filter((item) => item !== type)
        : [...current.challengeTypes, type];

      return {
        ...current,
        challengeTypes: next,
      };
    });
  };

  const openCreate = () => {
    setEditingAlarm(null);
    setForm(defaultForm());
    setShowCreate(true);
  };

  const openEdit = (alarm) => {
    const intent = alarmIntents?.[alarm.alarm_id] || {};
    const match = String(alarm.alarm_time || "07:00").match(/(\d{1,2}):(\d{2})/);
    const hour24 = match ? Number(match[1]) : 7;
    const minute = match ? match[2] : "00";

    setEditingAlarm(alarm);
    setForm({
      title: alarm.title || "",
      alarm_type: alarm.alarm_type || "DAILY",
      repeat_days:
        alarm.repeat_days ||
        defaultRepeatDays(alarm.alarm_type || "DAILY"),
      hour: String(hour24 % 12 || 12).padStart(2, "0"),
      minute,
      meridiem: hour24 >= 12 ? "PM" : "AM",
      challengeMode: intent.challengeMode || "AUTO",
      challengeTypes:
        Array.isArray(intent.challengeTypes) && intent.challengeTypes.length
          ? intent.challengeTypes
          : [...defaultChallengePool],
      difficulty:
        intent.difficulty ||
        alarm.difficulty ||
        preferences.difficulty ||
        "MEDIUM",
      wakeStrategy: intent.wakeStrategy || "FOCUS",
      snooze_minutes: Number(alarm.snooze_minutes ?? 5),
      snoozePolicy: intent.snoozePolicy || "NEW_CHALLENGE",
      sound: alarm.sound || "Neural Dawn",
      vibration: alarm.vibration !== false,
    });
    setShowCreate(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      form.challengeMode === "CUSTOM" &&
      form.challengeTypes.length === 0
    ) {
      return;
    }

    const selectedDifficulty =
      form.difficulty === "ADAPTIVE"
        ? preferences.difficulty || "MEDIUM"
        : form.difficulty;

    const intent = {
      challengeMode: form.challengeMode,
      challengeTypes: form.challengeTypes,
      difficulty: form.difficulty,
      wakeStrategy: form.wakeStrategy,
      snoozePolicy: form.snoozePolicy,
    };

    const payload = {
      title: form.title.trim() || defaultAlarmTitle(alarmTimeValue),
      alarm_time: alarmTimeValue,
      alarm_type: form.alarm_type,
      repeat_days:
        form.alarm_type === "ONE_TIME" ? "" : form.repeat_days,
      difficulty: selectedDifficulty,
      sound: form.sound,
      vibration: form.vibration,
      snooze_minutes: Number(form.snooze_minutes),
      status: "ACTIVE",
    };

    const success = editingAlarm
      ? await updateAlarm(editingAlarm.alarm_id, payload, intent)
      : await createAlarm({ ...payload, intent });

    if (success !== false) {
      setShowCreate(false);
      setEditingAlarm(null);
      setForm(defaultForm());
    }
  };

  const activeAlarms = alarms.filter(
    (alarm) =>
      alarm.status !== "DISABLED" &&
      alarm.status !== "COMPLETED"
  );

  const previousAlarms = alarms.filter(
    (alarm) =>
      alarm.status === "DISABLED" ||
      alarm.status === "COMPLETED"
  );

  const nextAlarm = activeAlarms
    .slice()
    .sort((a, b) => {
      const dueA = getAlarmDueAt(a);
      const dueB = getAlarmDueAt(b);
      if (Number.isFinite(dueA) && Number.isFinite(dueB)) return dueA - dueB;
      if (Number.isFinite(dueA)) return -1;
      if (Number.isFinite(dueB)) return 1;
      return String(a.alarm_time).localeCompare(String(b.alarm_time));
    })[0];

  const recentAccuracy = Number(challengePerformance?.accuracy_percent);

  return (
    <section className="module-shell alarm-center-shell">
      <header className="alarm-center-header">
        <div>
          <p className="eyebrow">WAKE INTELLIGENCE</p>
          <h1>
            Your signals,
            <br />
            <em>scheduled.</em>
          </h1>
          <p>
            Design when your attention should be challenged,
            not just when a sound should play.
          </p>
        </div>

        <button
          type="button"
          className="alarm-create-button"
          onClick={openCreate}
        >
          <span>+</span>
          CREATE WAKE PROTOCOL
        </button>
      </header>

      <section className="alarm-overview">
        <article>
          <span>ACTIVE SIGNALS</span>
          <b>{activeAlarms.length}</b>
        </article>

        <article>
          <span>NEXT WAKE</span>
          <b>{nextAlarm ? formatTime(nextAlarm.alarm_time) : "NOT SET"}</b>
        </article>

        <article>
          <span>RECENT ACCURACY</span>
          <b>{Number.isFinite(recentAccuracy) ? `${Math.round(recentAccuracy)}%` : "—"}</b>
        </article>
      </section>

      <div className="alarm-section-heading">
        <div>
          <p className="eyebrow">ACTIVE WAKE PROTOCOLS</p>
          <h2>Signals in your route</h2>
        </div>
        <span>{activeAlarms.length} active</span>
      </div>

      {activeAlarms.length === 0 ? (
        <article className="alarm-empty-state">
          <div className="alarm-empty-orbit">
            <span>+</span>
          </div>

          <div>
            <p className="eyebrow">NO ACTIVE SIGNAL</p>
            <h3>Your morning has no checkpoint yet.</h3>
            <p>
              Create a wake protocol and let BrainOS turn
              your first minutes into a cognitive checkpoint.
            </p>
          </div>

          <button
            type="button"
            className="quiet-button"
            onClick={openCreate}
          >
            Create your first signal
            <span>→</span>
          </button>
        </article>
      ) : (
        <div className="alarm-card-grid">
          {activeAlarms.map((alarm) => {
            const intent = alarmIntents?.[alarm.alarm_id] || {};
            const difficulty =
              intent.difficulty ||
              alarm.difficulty ||
              preferences.difficulty ||
              "MEDIUM";
            const challengeMode = intent.challengeMode || "AUTO";
            const selectedTypes = Array.isArray(intent.challengeTypes)
              ? intent.challengeTypes
              : [];

            return (
              <article className="alarm-protocol-card" key={alarm.alarm_id}>
                <div className="alarm-card-top">
                  <div>
                    <span className="alarm-index">
                      {String(alarm.alarm_id).padStart(2, "0")}
                    </span>
                    <h3>{alarm.title || defaultAlarmTitle(alarm.alarm_time)}</h3>
                  </div>

                  <span className="alarm-status active">
                    ● ACTIVE
                  </span>
                </div>

                <div className="alarm-card-time">
                  {formatTime(alarm.alarm_time)}
                </div>

                <div className="alarm-card-repeat">
                  <span>{labelForAlarmType(alarm.alarm_type)}</span>
                  {alarm.repeat_days ? ` · ${alarm.repeat_days}` : ""}
                </div>

                <div className="alarm-days" aria-label="Repeat days">
                  {(() => {
                    const dayState = repeatDayLetters(alarm);
                    return dayState.letters.map((letter, index) => (
                      <span
                        key={`${letter}-${index}`}
                        className={dayState.active[index] ? "active" : ""}
                      >
                        {letter}
                      </span>
                    ));
                  })()}
                </div>

                <div className="alarm-card-divider" />

                <div className="alarm-card-intelligence">
                  <div>
                    <span>COGNITIVE WAKE</span>
                    <b>{challengeMode === "AUTO" ? "Intelligent Mix" : "Custom Pool"}</b>
                  </div>
                  <div>
                    <span>DIFFICULTY</span>
                    <b>{difficulty}</b>
                  </div>
                  <div>
                    <span>SNOOZE</span>
                    <b>{Number(alarm.snooze_minutes ?? 5)} min</b>
                  </div>
                </div>

                {selectedTypes.length > 0 && (
                  <div className="alarm-card-tags">
                    {selectedTypes.slice(0, 4).map((type) => (
                      <span key={type}>
                        {challengeLabels[type] || type}
                      </span>
                    ))}
                  </div>
                )}

                <div className="alarm-card-footer">
                  <button
                    type="button"
                    className="alarm-secondary-action"
                    onClick={() => openEdit(alarm)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="alarm-secondary-action"
                    onClick={() => toggleAlarm(alarm)}
                  >
                    Disable
                  </button>
                  <button
                    type="button"
                    className="alarm-danger-action"
                    onClick={() => removeAlarm(alarm.alarm_id)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {previousAlarms.length > 0 && (
        <>
          <div className="alarm-section-heading secondary">
            <div>
              <p className="eyebrow">PREVIOUS SIGNALS</p>
              <h2>Paused & completed</h2>
            </div>
            <span>{previousAlarms.length}</span>
          </div>

          <div className="alarm-list">
            {previousAlarms.map((alarm) => (
              <article className="alarm-list-row" key={alarm.alarm_id}>
                <div>
                  <strong>{formatTime(alarm.alarm_time)}</strong>
                  <div>
                    <b>{alarm.title || "Wake protocol"}</b>
                    <small>{labelForAlarmType(alarm.alarm_type)}</small>
                  </div>
                </div>

                <span className="alarm-status paused">
                  {alarm.status === "COMPLETED" ? "COMPLETED" : "PAUSED"}
                </span>

                {alarm.status !== "COMPLETED" && (
                  <button
                    type="button"
                    className="alarm-secondary-action"
                    onClick={() => toggleAlarm(alarm)}
                  >
                    Enable
                  </button>
                )}

                <button
                  type="button"
                  className="alarm-danger-action"
                  onClick={() => removeAlarm(alarm.alarm_id)}
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        </>
      )}

      {showCreate && createPortal(
        <div className="alarm-create-backdrop" role="presentation">
          <section
            className="alarm-create-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wake-protocol-title"
          >
            <div className="alarm-create-header">
              <div>
                <p className="eyebrow">
                  {editingAlarm ? "EDIT WAKE PROTOCOL" : "WAKE PROTOCOL DESIGNER"}
                </p>
                <h2 id="wake-protocol-title">
                  {editingAlarm ? "Refine your wake." : "Design your wake."}
                </h2>
                <p>Configure the signal. BrainOS handles the cognition.</p>
              </div>

              <button
                type="button"
                className="alarm-panel-close"
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form className="alarm-create-form" onSubmit={handleSubmit}>
              <div className="alarm-create-scroll">
              <div className="protocol-preview">
                <div>
                  <span>NEXT WAKE</span>
                  <strong>{formatTime(alarmTimeValue)}</strong>
                </div>
                <div>
                  <span>ROUTE</span>
                  <strong>
                    {form.alarm_type === "ONE_TIME"
                      ? "One time"
                      : form.alarm_type === "WEEKDAY"
                        ? "Weekdays"
                        : form.alarm_type === "WEEKEND"
                          ? "Weekends"
                          : form.alarm_type === "DAILY"
                            ? "Every day"
                            : "Smart adaptive"}
                  </strong>
                </div>
                <div>
                  <span>MODE</span>
                  <strong>
                    {form.challengeMode === "AUTO" ? "Intelligent" : "Custom"}
                  </strong>
                </div>
              </div>

              <label>
                PROTOCOL NAME
                <input
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="Morning Focus"
                />
              </label>

              <section className="protocol-block">
                <h3 className="protocol-block-title"><span>TIME / WAKE WINDOW</span></h3>

                <div className="alarm-form-grid">
                  <label>
                    HOUR
                    <select
                      value={form.hour}
                      onChange={(event) => updateTime("hour", event.target.value)}
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                        <option key={hour} value={String(hour).padStart(2, "0")}>
                          {String(hour).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    MINUTE
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={form.minute}
                      placeholder="00"
                      onChange={(event) => {
                        const digits = event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 2);

                        updateTime("minute", digits);
                      }}
                      onBlur={() => {
                        const numeric = Math.min(
                          59,
                          Math.max(0, Number(form.minute) || 0)
                        );

                        updateTime(
                          "minute",
                          String(numeric).padStart(2, "0")
                        );
                      }}
                      aria-label="Alarm minute"
                    />
                  </label>

                  <label>
                    PERIOD
                    <select
                      value={form.meridiem}
                      onChange={(event) => updateTime("meridiem", event.target.value)}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </label>
                </div>

                <label>
                  REPEAT
                  <select
                    value={form.alarm_type}
                    onChange={(event) => {
                      const nextType = event.target.value;
                      update("alarm_type", nextType);
                      if (nextType !== "ONE_TIME") {
                        update("repeat_days", defaultRepeatDays(nextType));
                      } else {
                        update("repeat_days", "");
                      }
                    }}
                  >
                    {alarmTypes.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                {form.alarm_type !== "ONE_TIME" && (
                  <label>
                    REPEAT DAYS
                    <input
                      value={form.repeat_days}
                      onChange={(event) => update("repeat_days", event.target.value)}
                      placeholder="Mon,Tue,Wed,Thu,Fri"
                    />
                  </label>
                )}
              </section>

              <section className="protocol-block">
                <h3 className="protocol-block-title"><span>COGNITIVE WAKE</span></h3>

                <div className="protocol-mode-grid">
                  <button
                    type="button"
                    className={`protocol-mode ${form.challengeMode === "AUTO" ? "selected" : ""}`}
                    onClick={() => update("challengeMode", "AUTO")}
                  >
                    <span>✦</span>
                    <b>Intelligent Mix</b>
                    <small>BrainOS chooses from your challenge pool and performance.</small>
                  </button>

                  <button
                    type="button"
                    className={`protocol-mode ${form.challengeMode === "CUSTOM" ? "selected" : ""}`}
                    onClick={() => update("challengeMode", "CUSTOM")}
                  >
                    <span>◈</span>
                    <b>Custom Pool</b>
                    <small>You decide which challenge types can appear.</small>
                  </button>
                </div>

                <div className="challenge-pool">
                  <div className="challenge-pool-header">
                    <span>CHALLENGE POOL</span>
                    <small>{form.challengeTypes.length} selected</small>
                  </div>

                  <div className="challenge-pool-grid">
                    {Object.entries(challengeLabels).map(([type, label]) => (
                      <button
                        key={type}
                        type="button"
                        className={form.challengeTypes.includes(type) ? "selected" : ""}
                        onClick={() => toggleChallengeType(type)}
                        aria-pressed={form.challengeTypes.includes(type)}
                      >
                        {label}
                        {form.challengeTypes.includes(type) && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="recommendation-card">
                  <div className="recommendation-mark">✦</div>
                  <div>
                    <span>BRAINOS RECOMMENDS</span>
                    <strong>
                      {recommendation?.type
                        ? challengeTitle(recommendation.type)
                        : "Intelligent Mix"}{" "}
                      ·{" "}
                      {recommendation?.difficulty || preferences.difficulty || "MEDIUM"}
                    </strong>
                    <small>
                      {Number.isFinite(recentAccuracy)
                        ? `Based on ${Math.round(recentAccuracy)}% recent challenge accuracy.`
                        : "Your current profile preference will guide the first checkpoint."}
                    </small>
                  </div>
                </div>

                <div className="alarm-form-grid two">
                  <label>
                    DIFFICULTY
                    <select
                      value={form.difficulty}
                      onChange={(event) => update("difficulty", event.target.value)}
                    >
                      <option value="ADAPTIVE">Adaptive</option>
                      <option value="BEGINNER">Beginner</option>
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HARD">Hard</option>
                      <option value="EXPERT">Expert</option>
                    </select>
                  </label>

                  <label>
                    WAKE STRATEGY
                    <select
                      value={form.wakeStrategy}
                      onChange={(event) => update("wakeStrategy", event.target.value)}
                    >
                      <option value="GENTLE">Gentle</option>
                      <option value="FOCUS">Focus</option>
                      <option value="DEEP">Deep Wake</option>
                    </select>
                  </label>
                </div>
              </section>

              <section className="protocol-block">
                <h3 className="protocol-block-title"><span>SNOOZE POLICY</span></h3>

                <div className="snooze-policy-row">
                  {[5, 10, 15].map((minutes) => (
                    <button
                      type="button"
                      key={minutes}
                      className={form.snooze_minutes === minutes ? "selected" : ""}
                      onClick={() => update("snooze_minutes", minutes)}
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>

                <div className="snooze-after-row">
                  <span>AFTER SNOOZE</span>
                  <div>
                    <label>
                      <input
                        type="radio"
                        checked={form.snoozePolicy === "NEW_CHALLENGE"}
                        onChange={() => update("snoozePolicy", "NEW_CHALLENGE")}
                      />
                      New challenge
                    </label>
                    <label>
                      <input
                        type="radio"
                        checked={form.snoozePolicy === "SAME_CHALLENGE"}
                        onChange={() => update("snoozePolicy", "SAME_CHALLENGE")}
                      />
                      Same challenge
                    </label>
                  </div>
                </div>
              </section>

              <section className="protocol-block">
                <h3 className="protocol-block-title"><span>WAKE SIGNAL</span></h3>

                <label>
                  SOUND
                  <select
                    value={form.sound}
                    onChange={(event) => update("sound", event.target.value)}
                  >
                    <option value="Neural Dawn">Neural Dawn</option>
                    <option value="Sunrise Pulse">Sunrise Pulse</option>
                    <option value="Forest Signal">Forest Signal</option>
                  </select>
                </label>

                <div className="alarm-inline-control">
                  <div>
                    <span>VIBRATION</span>
                    <small>Add a physical wake cue when supported.</small>
                  </div>

                  <button
                    type="button"
                    className={`toggle-switch ${form.vibration ? "on" : ""}`}
                    onClick={() => update("vibration", !form.vibration)}
                    aria-label="Toggle vibration"
                  >
                    <span />
                  </button>
                </div>
              </section>

              <div className="protocol-timeline">
                <span>WAKE PROTOCOL PREVIEW</span>

                <div>
                  <b>01</b>
                  <p>{formatTime(alarmTimeValue)}</p>
                  <small>Signal begins</small>
                </div>
                <div>
                  <b>02</b>
                  <p>Challenge</p>
                  <small>Cognition unlocked</small>
                </div>
                <div>
                  <b>03</b>
                  <p>Validate</p>
                  <small>Answer verified</small>
                </div>
                <div>
                  <b>04</b>
                  <p>Record</p>
                  <small>Performance saved</small>
                </div>
              </div>
              </div>

              <div className="alarm-create-actions">
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>

                <button type="submit" className="primary-button" {...magnetic()}>
                  {editingAlarm ? "SAVE WAKE CHANGES" : "INITIALIZE WAKE PROTOCOL"}
                  <span>→</span>
                </button>
              </div>
            </form>
          </section>
        </div>,
        document.body
      )}
    </section>
  );
}


function Command({ profile, alarms, analytics, nextAlarm, ringingAlarm, onSolveAlarm, challengeLoading, preferences, missions, history, onStartChallenge, goAlarms, assistantMessages, typingMessageId, assistantInput, setAssistantInput, askAssistant, assistantLoading, clearAssistantConversation }) {
  const [focusMode, setFocusMode] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const score = Number.isFinite(Number(analytics?.focus_score)) ? Math.round(Number(analytics.focus_score)) : null;
  const next = nextAlarm || alarms.find((alarm) => alarm.status !== "DISABLED");
  const completed = missions.filter((mission) => mission.completed).length + history.filter((entry) => entry.correct).length;
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const nextDueAt = getAlarmDueAt(next);
  const minutesToWake = Number.isFinite(nextDueAt) ? Math.round((nextDueAt - now) / 60000) : null;
  const wakeState = ringingAlarm
    ? { label: "CHECKPOINT ACTIVE", tone: "active", detail: "Complete the cognitive check to finish waking." }
    : minutesToWake !== null && minutesToWake >= 0 && minutesToWake <= 30
      ? { label: "WAKE WINDOW OPEN", tone: "window", detail: `${minutesToWake} minutes until your protected alarm.` }
      : { label: "EVENING PREP", tone: "prepare", detail: "Shape one clear first win before you sleep." };
  const route = [
    ["01", "Wind-down cue", bedtimeFrom(preferences.preferredWakeTime, preferences.sleepDuration), "Dim the feed and prepare tomorrow's first choice."],
    ["02", "Sleep arc", `${preferences.sleepDuration} hours`, "Let the route recover your attention reserve."],
    ["03", "Wake checkpoint", next ? formatTime(next.alarm_time) : formatTime(preferences.preferredWakeTime), next?.title || "Set your first wake signal"],
    ["04", "First win", "+ 90 min", preferences.productivityGoal || "Protect a single focus block"],
  ];
  return (
    <div className={`command-view ${focusMode ? "focus-mode" : ""}`} data-state={wakeState.tone}>
      <div className="daybreak-horizon" aria-hidden="true" />
      <section className="command-hero">
        <div className="hero-copy">
          <p className="eyebrow">DAYBREAK ROUTE / {preferences.timezone}</p>
          <h1>Good morning,<br /><em>{profile?.name || "Explorer"}.</em></h1>
          <p>Not another alarm dashboard - this is your route from rest to one deliberate first win.</p>
          <div className="hero-actions">
            <button className="quiet-button" type="button" {...magnetic()} onClick={goAlarms}>Shape today&apos;s route <span>&rarr;</span></button>
            <button className="focus-toggle" type="button" onClick={() => setFocusMode((value) => !value)} aria-pressed={focusMode}>{focusMode ? "Exit focus atmosphere" : "Enter focus atmosphere"} <span>◌</span></button>
          </div>
        </div>
        <div className="hero-core">
          <NeuralCore />
          <div className="core-caption"><b>{score ?? "—"}</b><span>ROUTE<br />READINESS</span></div>
        </div>
        <div className="hero-metrics">
          <span>NEXT SIGNAL <b>{next ? formatTime(next.alarm_time) : "NOT SET"}</b></span>
          <span>COMPLETED CHECKPOINTS <b>{completed}</b></span>
        </div>
      </section>
      <section className="daybreak-ritual" aria-label="Daybreak ritual">
        <div className="ritual-heading">
          <div>
            <p className="eyebrow">THE DAYBREAK RITUAL</p>
            <h2>Wake with a little more <em>intention.</em></h2>
          </div>
          <span className={`ritual-state ${wakeState.tone}`}><i /> {wakeState.label}</span>
        </div>
        <div className="ritual-grid">
          <article className="ritual-card ritual-window">
            <div className="ritual-card-label"><span>01</span><b>{wakeState.label}</b></div>
            <div className="wake-window-visual" style={{ "--wake-progress": `${score ?? 78}%` }}>
              <div className="wake-window-ring"><span>{next ? formatTime(next.alarm_time) : formatTime(preferences.preferredWakeTime)}</span></div>
            </div>
            <p>{ringingAlarm ? "Your morning checkpoint is ready." : next ? `${next.title || "Your wake signal"} is next.` : "Set a first wake signal to begin."}</p>
            <div className="confidence-meter"><i style={{ width: `${score ?? 78}%` }} /></div>
            <small>{wakeState.detail} · {score ?? 78}% route confidence</small>
          </article>
          <article className="ritual-card ritual-why">
            <div className="ritual-card-label"><span>02</span><b>WHY THIS ROUTE</b></div>
            <h3>A gentler first minute beats a louder one.</h3>
            <p>BrainOS uses your preferred wake time, recent checkpoints, and tomorrow&apos;s focus intention to keep the morning clear.</p>
            <button type="button" className="ritual-link" onClick={goAlarms}>Review wake protocol <span>→</span></button>
          </article>
          <article className="ritual-card ritual-focus">
            <div className="ritual-card-label"><span>03</span><b>FIRST WIN</b></div>
            <strong>+ 90 min</strong>
            <p>{preferences.productivityGoal || "Protect one clear focus block."}</p>
            <button type="button" className="ritual-action" onClick={() => ringingAlarm ? onSolveAlarm(ringingAlarm) : onStartChallenge("QUIZ")}>{ringingAlarm ? "Start cognitive checkpoint" : "Begin a 2-minute reset"} <span>→</span></button>
          </article>
        </div>
      </section>
      {ringingAlarm && (
        <div className="wake-alarm-backdrop" role="dialog" aria-modal="true" aria-live="assertive">
          <section className="wake-alarm-popup is-ringing">
            <div className="wake-alarm-icon"><span>◈</span></div>
            <div className="wake-alarm-status">WAKE PROTOCOL / CHECKPOINT REQUIRED</div>
            <div className="wake-alarm-time">{formatTime(ringingAlarm.alarm_time)}</div>
            <h2>{ringingAlarm.title || defaultAlarmTitle(ringingAlarm.alarm_time)}</h2>
            <p className="wake-alarm-title">{labelForAlarmType(ringingAlarm.alarm_type)} · {ringingAlarm.sound || "Neural Dawn"}</p>
            <div className="wake-alarm-meta">
              <span>COGNITIVE WAKE</span>
              <span>{ringingAlarm.wake_verification_mode || "SINGLE"}</span>
              <span>DIFFICULTY {ringingAlarm.difficulty || "MEDIUM"}</span>
            </div>
            <p className="wake-alarm-copy">
              {challengeLoading
                ? "Loading your cognitive checkpoint..."
                : "Your alarm is active. The checkpoint opens automatically."}
              {" "}Dismiss or snooze becomes available after verification.
            </p>
            <div className="wake-alarm-actions">
              <button
                className="wake-alarm-primary"
                type="button"
                disabled={challengeLoading}
                onClick={() => onSolveAlarm(ringingAlarm)}
              >
                {challengeLoading ? "OPENING CHECKPOINT..." : "OPEN COGNITIVE CHECKPOINT"}
                <span>→</span>
              </button>
            </div>
          </section>
        </div>
      )}
      <section className="dashboard-grid">
        <article className="mission-card glow-border">
          <div>
            <p className="eyebrow">TODAY&apos;S WAKE CHECKPOINT</p>
            <h2>Earn your<br />first clear thought.</h2>
            <p className="mission-copy">A short pattern challenge helps make your wake-up a choice, not a negotiation.</p>
          </div>
          <div className="mission-bottom">
            <span><b>+ 180</b> route points</span>
            <button type="button" {...magnetic()} onClick={() => onStartChallenge("PATTERN")}>Start checkpoint <b>&rarr;</b></button>
          </div>
        </article>

        <article className="assistant-card assistant-chat gemini-chat glow-border">
          <div className="assistant-chat-heading">
            <div><div className="assistant-mark">&#10022;</div><p className="eyebrow">GEMINI COACH</p></div>
            <button type="button" className="quiet-button assistant-reset" onClick={clearAssistantConversation}>New conversation</button>
          </div>
          <h3>Morning help, without the noise.</h3>
          <div className="assistant-thread">
            {assistantMessages.map((entry) => {
              const bubbleClass = `assistant-bubble ${entry.role === "USER" ? "assistant-bubble-user" : "assistant-bubble-coach"}`;
              return entry.id === typingMessageId
                ? <TypewriterBubble key={entry.id} text={entry.content} className={bubbleClass} />
                : <p key={entry.id} className={bubbleClass}>{entry.content}</p>;
            })}
            {assistantLoading && <p className="assistant-bubble assistant-bubble-coach assistant-bubble-pending">Thinking...</p>}
          </div>
          <textarea
            value={assistantInput}
            onChange={(event) => setAssistantInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void askAssistant(); } }}
            rows={2}
            placeholder="Ask for wake-up help..."
          />
          <button type="button" className="quiet-button" {...magnetic()} disabled={assistantLoading || !assistantInput.trim()} onClick={askAssistant}>{assistantLoading ? "Thinking..." : "Ask Gemini"} <span>&rarr;</span></button>
        </article>

        <CoachHelpWidget />

        <Stats analytics={analytics} />
        <SignalFlow />

        <article className="rhythm-card daybreak-route">
          <div>
            <p className="eyebrow">THE DAYBREAK ROUTE</p>
            <h3>A morning with four clear stops.</h3>
            <p className="mission-copy">Designed around your preferred wake time, sleep arc, and focus intention.</p>
            <button className="quiet-button" type="button" onClick={() => onStartChallenge("QUIZ")}>Test the first step <span>&rarr;</span></button>
          </div>
          <div className="route-timeline" aria-label="Your four-step Daybreak Route">{route.map(([number, title, time, detail]) => <div className="route-stop" key={number}><span>{number}</span><div><b>{title} <em>{time}</em></b><small>{detail}</small></div></div>)}</div>
        </article>
      </section>
    </div>
  );
}

function CoachHelpWidget() {
  const [thread, setThread] = useState({ coach_assigned: false, coach_name: null, messages: [] });
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetch(`${API}/coach/help/messages`, { headers: headers() }).then(readJson);
      if (data) setThread(data);
    } catch {
      // Keep the last known thread; a background refresh failure isn't worth surfacing here.
    }
  }, []);

  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);

  const send = async () => {
    const message = draft.trim();
    if (!message) return;
    setSending(true);
    setStatus("");
    try {
      const response = await fetch(`${API}/coach/help/messages`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ message }),
      });
      const data = await readJson(response);
      if (response.ok) {
        setDraft("");
        await load();
      } else {
        setStatus(data?.detail || "Unable to send your message.");
      }
    } catch {
      setStatus("Neural gateway is offline.");
    } finally {
      setSending(false);
    }
  };

  return (
    <article className="assistant-card assistant-chat glow-border">
      <div className="assistant-chat-heading">
        <div><div className="assistant-mark">&#9993;</div><p className="eyebrow">ASK MY COACH</p></div>
        <button type="button" className="quiet-button assistant-reset" onClick={load}>Refresh</button>
      </div>
      <h3>{thread.coach_assigned ? `A direct line to ${thread.coach_name}.` : "No coach assigned yet."}</h3>
      {thread.coach_assigned ? (
        <>
          <div className="assistant-thread">
            {thread.messages.map((entry) => (
              <p key={entry.message_id} className={`assistant-bubble ${entry.sender === "USER" ? "assistant-bubble-user" : "assistant-bubble-coach"}`}>{entry.content}</p>
            ))}
            {!thread.messages.length && <p className="mission-copy">Ask your coach anything about your routine, sleep, or a rough morning.</p>}
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }}
            rows={2}
            placeholder="Tell your coach what you need help with..."
            maxLength={1000}
          />
          <button type="button" className="quiet-button" disabled={sending || !draft.trim()} onClick={send}>{sending ? "Sending..." : "Send to coach"} <span>&rarr;</span></button>
          {status && <p className="mission-copy">{status}</p>}
        </>
      ) : (
        <p className="mission-copy">Once an admin assigns you a wellness coach, you'll be able to message them directly here.</p>
      )}
    </article>
  );
}

function GaugeStat({ label, value, color }) {
  const clamped = Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : null;
  const shown = useAnimatedNumber(clamped ?? 0);
  return <article className={`stat-card gauge-stat ${color}`}>
    <p>{label}</p>
    <div className="gauge-ring" style={{ "--gauge-value": `${clamped === null ? 0 : shown}%` }}>
      <div>
        <b>{clamped === null ? "—" : Math.round(shown)}</b>
        {clamped !== null && <span>%</span>}
      </div>
    </div>
    <small>{clamped === null ? "Not enough observations yet" : "Measured from your recent rhythm"}</small>
  </article>;
}

function Stats({ analytics }) {
  const stats = [{ label: "Brain energy", value: analytics?.focus_score, color: "cyan" }, { label: "Sleep battery", value: analytics?.sleep_score, color: "violet" }, { label: "Habit orbit", value: analytics?.habit_score?.score ?? analytics?.habit_score, color: "lime" }];
  return <section className="stats-row">{stats.map((stat) => <GaugeStat key={stat.label} {...stat} />)}</section>;
}

function SignalFlow() {
  return <article className="signal-flow-card">
    <div>
      <p className="eyebrow">BEHAVIORAL SIGNAL FLOW</p>
      <h3>Small inputs, clearer mornings.</h3>
      <p className="mission-copy">BrainOS follows the hand-off from sleep to signal to first action.</p>
    </div>
    <svg className="signal-flow-diagram" viewBox="0 0 520 110" role="img" aria-label="Signal flow from sleep to focus">
      <defs><linearGradient id="signal-line" x1="0" x2="1"><stop stopColor="#8b5cf6" /><stop offset="1" stopColor="#00f5ff" /></linearGradient></defs>
      <path d="M55 55 C130 12 165 98 245 55 S365 12 465 55" className="signal-path" />
      {[[55,55,"SLEEP"],[245,55,"WAKE"],[465,55,"FOCUS"]].map(([x,y,label]) => <g key={label} className="signal-node" transform={`translate(${x} ${y})`}><circle r="14" /><circle r="5" /><text y="32" textAnchor="middle">{label}</text></g>)}
    </svg>
  </article>;
}


function Challenges({ activeChallenge, loading, history, missions, performance, defaultDifficulty, onStartChallenge, onSubmitChallenge, onCloseChallenge, onAlarmDismiss, onAlarmSnooze }) {
  const successful = history.filter((entry) => entry.correct).length + missions.filter((mission) => mission.completed).length;
  const recommendation = performanceRecommendation(performance);
  const accuracy = Number(performance?.accuracy_percent);
  const hasAccuracy = Number.isFinite(accuracy);
  return <section className="module-shell">
    <div className="module-heading"><p className="eyebrow">COGNITIVE CHECKPOINTS</p><h1>Earn your <em>morning.</em></h1><p>Choose a small puzzle that makes your attention arrive before your notifications do.</p></div>
    {activeChallenge ? <ChallengeConsole key={activeChallenge.id} challenge={activeChallenge} onSubmit={onSubmitChallenge} onNew={() => onStartChallenge(activeChallenge.type)} onClose={onCloseChallenge} onAlarmDismiss={onAlarmDismiss} onAlarmSnooze={onAlarmSnooze} /> : <article className="module-card challenge-status-card"><p className="eyebrow">ROUTE STATUS</p><h2>{successful} completed checkpoints</h2><p className="mission-copy">Each solved challenge becomes a small signal that you can begin on purpose.</p>{(recommendation.difficulty || recommendation.reason || hasAccuracy) && <div className="challenge-personalization" role="status"><span>ADAPTIVE PICK</span><b>{recommendation.difficulty || normalizeDifficulty(defaultDifficulty)}</b>{hasAccuracy && <small>{accuracy.toFixed(0)}% recent accuracy</small>}{recommendation.reason && <p>{recommendation.reason}</p>}</div>}</article>}
    <div className="challenge-grid">{challengeTypes.map(([type, title, copy], index) => <article className="challenge-card" key={type}><span>0{index + 1}</span><h2>{title}</h2><p>{copy}</p><button type="button" disabled={loading} onClick={() => onStartChallenge(type)}>{loading ? "Building route..." : "Activate"} <b>&rarr;</b></button></article>)}</div>
  </section>;
}

function ChallengeConsole({ challenge, onSubmit, onNew, onClose, onAlarmDismiss, onAlarmSnooze }) {
  const maxAttempts = Math.max(1, numericValue(challenge.maxAttempts, 3));
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(Math.max(0, numericValue(challenge.attemptsRemaining, maxAttempts)));
  const [timeRemaining, setTimeRemaining] = useState(() => getChallengeRemainingSeconds(challenge));
  const timeoutRequested = useRef(false);
  const terminal = Boolean(result?.terminal || result?.correct);

  const applyResult = (outcome) => {
    if (!outcome) return;
    setResult(outcome);
    if (Number.isFinite(Number(outcome.attemptsRemaining))) setAttemptsRemaining(Math.max(0, Number(outcome.attemptsRemaining)));
    if (Number.isFinite(Number(outcome.timeRemainingSeconds))) setTimeRemaining(Math.max(0, Number(outcome.timeRemainingSeconds)));
  };

  useEffect(() => {
    if (terminal || submitting) return undefined;
    const updateTimer = () => setTimeRemaining(getChallengeRemainingSeconds(challenge));
    updateTimer();
    const interval = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(interval);
  }, [challenge, submitting, terminal]);

  useEffect(() => {
    if (timeRemaining > 0 || terminal || submitting || timeoutRequested.current) return;
    timeoutRequested.current = true;
    setSubmitting(true);
    void onSubmit(challenge, "", { timedOut: true, attemptsRemaining }).then((outcome) => {
      applyResult(outcome);
    }).finally(() => setSubmitting(false));
  }, [attemptsRemaining, challenge, onSubmit, submitting, terminal, timeRemaining]);

  const submit = async (event) => {
    event.preventDefault();
    if (terminal || submitting || timeRemaining <= 0) return;
    if (!answer.trim()) return setResult({ correct: false, terminal: false, message: "Choose or type an answer to continue." });
    setSubmitting(true);
    const outcome = await onSubmit(challenge, answer, { attemptsRemaining });
    applyResult(outcome);
    if (!outcome?.correct && !outcome?.terminal) setAnswer("");
    setSubmitting(false);
  };

  const updateAnswer = (value) => {
    setAnswer(value);
    if (!terminal && result && !result.correct) setResult(null);
  };
  const buttonLabel = result?.correct ? "CHECKPOINT COMPLETE" : terminal ? "CHECKPOINT CLOSED" : submitting ? "VERIFYING..." : "VERIFY ANSWER";
  const sourceLabel = challenge.isOffline ? "OFFLINE CHECKPOINT" : challenge.source?.toUpperCase() || "ADAPTIVE ENGINE";

  const progress = Math.max(0, Math.min(100, (timeRemaining / Math.max(1, numericValue(challenge.timeLimitSeconds, timeRemaining || 1))) * 100));
  return <article className={`module-card challenge-console ${result?.correct ? "is-verified" : ""}`}>
    <div className="panel-cap"><span>{sourceLabel} / {challenge.difficulty}</span><button type="button" onClick={onClose}>Close</button></div>
    <div className="challenge-progress-rail" style={{ "--progress": `${progress}%` }}><i /><span>NEURAL CHECKPOINT</span><b>{Math.round(progress)}%</b></div>
    <div className="challenge-status-row" aria-live="polite"><span className={timeRemaining <= 10 ? "urgent" : ""}>TIME <b>{formatCountdown(timeRemaining)}</b></span><span>ATTEMPTS <b>{attemptsRemaining} / {maxAttempts}</b></span></div>
    <h2>{challenge.type} checkpoint</h2>
    <p className="mission-copy">{challenge.prompt}</p>
    {challenge.selectionReason && <p className="challenge-selection-reason"><b>Adaptive selection</b>{challenge.selectionReason}</p>}
    <form onSubmit={submit}>
      {challenge.options?.length ? <div className="challenge-options">{challenge.options.map((option) => <button className={normalizeAnswer(answer) === normalizeAnswer(option) ? "active" : ""} type="button" key={option} disabled={terminal || submitting} onClick={() => updateAnswer(String(option))}>{option}</button>)}</div> : <label>YOUR ANSWER<input value={answer} disabled={terminal || submitting} onChange={(event) => updateAnswer(event.target.value)} autoComplete="off" placeholder="Type your answer" /></label>}
      {challenge.instructions && <p className="challenge-instructions">{challenge.instructions}</p>}
      {challenge.hint && <p className="settings-form">Hint: {challenge.hint}</p>}
      {result && <p role={result.correct ? "status" : "alert"} className={result.correct ? "signal-row" : "form-notice"}>{result.message}</p>}
      <button className="primary-button" {...magnetic()} disabled={submitting || terminal || timeRemaining <= 0}>{buttonLabel}<span>&rarr;</span></button>
    </form>
    {terminal && result?.correct && challenge.alarmTriggered && challenge.alarmId && (
      <div className="verified-wake-actions" role="status">
        <div>
          <p className="eyebrow">CHECKPOINT VERIFIED</p>
          <h3>You are awake. What happens next?</h3>
          <small>Dismiss the wake signal or defer it for the configured snooze interval.</small>
        </div>
        <div className="verified-wake-buttons">
          <button className="wake-dismiss-button" type="button" onClick={() => onAlarmDismiss(challenge)}>
            DISMISS ALARM <span>✓</span>
          </button>
          <button className="wake-snooze-button" type="button" onClick={() => onAlarmSnooze(challenge)}>
            SNOOZE {Number(challenge.snoozeMinutes ?? 5) || 5} MIN
          </button>
        </div>
      </div>
    )}
    {terminal && (!result?.correct || !challenge.alarmTriggered) && <button className="quiet-button" type="button" onClick={onNew}>{result?.correct ? "Build another checkpoint" : "Try a new checkpoint"} <span>&rarr;</span></button>}
  </article>;
}

function HabitScore({ value, components }) {
  const score = Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : null;
  const shown = useAnimatedNumber(score ?? 0);
  return <div className="habit-score-visual">
    <div className="habit-score-ring" style={{ "--score": `${score === null ? 0 : shown}%` }}>
      <div><strong>{score === null ? "—" : Math.round(shown)}</strong><span>HABIT SCORE</span></div>
    </div>
    <div className="habit-score-legend">{Object.entries(components || {}).slice(0, 3).map(([name, item]) => <span key={name}><i />{name.replaceAll("_", " ")} <b>{item ?? "—"}%</b></span>)}</div>
  </div>;
}

function Analytics({ data, history, missions }) {
  const [reportNotice, setReportNotice] = useState("");
  const behavioral = data || {};
  const snooze = behavioral.snooze_patterns || {};
  const wake = behavioral.wake_behavior || {};
  const productivity = behavioral.productivity_correlation || {};
  const habit = behavioral.habit_consistency || {};
  const sleep = behavioral.sleep_patterns || {};
  const habitScore = data?.habit_score || {};
  const recommendations = data?.recommendations || {};

  const clamp = (value, fallback = 0) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.max(0, Math.min(100, numeric));
  };

  const readinessInputs = [data?.focus_score, data?.sleep_score, wake?.wake_consistency_percent, habit?.consistency_percent]
    .map((value) => Number(value))
    .filter(Number.isFinite);
  const readiness = readinessInputs.length === 4
    ? Math.round(readinessInputs.reduce((total, value) => total + clamp(value), 0) / 4)
    : null;

  const passed = history.filter((entry) => entry.correct).length +
    missions.filter((mission) => mission.completed).length;
  const attempts = history.length + missions.length;

  const radarValues = [
    clamp(wake?.wake_consistency_percent),
    clamp(data?.challenge_performance?.accuracy_percent),
    clamp(habit?.consistency_percent),
    clamp(data?.focus_score),
    clamp(sleep?.duration_consistency_percent),
  ];

  const radarPoints = radarValues.map((value, index) => {
    const angle = (-90 + index * 72) * (Math.PI / 180);
    const radius = 74 * (value / 100);
    return `${150 + Math.cos(angle) * radius},${115 + Math.sin(angle) * radius}`;
  }).join(" ");

  const learned =
    Number(wake?.wake_success_rate_percent) >= 80
      ? "Your wake verification is becoming reliable."
      : Number(snooze?.total_snoozes) > 3
        ? "Snooze friction is your strongest current signal."
        : "BrainOS is still learning your morning rhythm.";

  return (
    <section className="module-shell analytics-shell">
      <div className="module-heading analytics-heading">
        <div>
          <p className="eyebrow">BEHAVIORAL INTELLIGENCE / 07</p>
          <h1>Your rhythm,<br /><em>decoded.</em></h1>
          <p>BrainOS turns wake events, challenge behavior, sleep and routine activity into an evolving morning profile.</p>
        </div>
        <div className="analytics-live-mark">
          <span />
          LIVE PROFILE
          <b>30D</b>
        </div>
      </div>

      <section className="neural-readiness-card">
        <div className="readiness-copy">
          <p className="eyebrow">NEURAL READINESS</p>
          <strong>{readiness ?? "—"}</strong><span>{readiness === null ? "observations pending" : "/100"}</span>
          <h2>{readiness === null ? "MORNING STATE: LEARNING" : readiness >= 80 ? "MORNING STATE: STRONG" : readiness >= 60 ? "MORNING STATE: STABLE" : "MORNING STATE: RECOVERING"}</h2>
          <p>Your composite signal blends focus, sleep, successful wake sessions and habit consistency.</p>
        </div>
        <div className="readiness-orbit" aria-hidden="true">
          <div className="readiness-ring ring-one" />
          <div className="readiness-ring ring-two" />
          <div className="readiness-core">{readiness ?? "—"}</div>
        </div>
        <div className="readiness-mini-grid">
          <div><span>FOCUS</span><b>{Number.isFinite(Number(data?.focus_score)) ? `${Math.round(clamp(data.focus_score))}%` : "—"}</b></div>
          <div><span>SLEEP</span><b>{Number.isFinite(Number(data?.sleep_score)) ? `${Math.round(clamp(data.sleep_score))}%` : "—"}</b></div>
          <div><span>WAKE</span><b>{Number.isFinite(Number(wake?.wake_success_rate_percent)) ? `${Math.round(clamp(wake.wake_success_rate_percent))}%` : "—"}</b></div>
          <div><span>HABIT</span><b>{Number.isFinite(Number(habit?.consistency_percent)) ? `${Math.round(clamp(habit.consistency_percent))}%` : "—"}</b></div>
        </div>
      </section>

      <section className="analytics-bottom-grid analytics-summary-grid">
        <article className="analytics-panel learned-panel">
          <p className="eyebrow">HABIT SCORING ENGINE / 08</p>
          <h2>{habitScore.score ?? "—"}<small>/100 observed score</small></h2>
          <HabitScore value={habitScore.score} components={habitScore.components} />
          <div className="analytics-metrics-row">
            {Object.entries(habitScore.components || {}).map(([name, value]) => (
              <div key={name}><span>{name.replaceAll("_", " ")}</span><b>{value ?? "—"}%</b></div>
            ))}
          </div>
        </article>
        <article className="analytics-panel productivity-panel">
          <div className="analytics-panel-head"><div><p className="eyebrow">RECOMMENDATION ENGINE / 09</p><h2>Next best actions</h2></div><span className="analytics-badge">EVIDENCE LINKED</span></div>
          {Object.entries(recommendations).flatMap(([category, items]) => (items || []).map((item) => (
            <p className="analytics-footnote" key={`${category}-${item.message}`}><b>{category.replaceAll("_", " ")}</b>: {item.message} {item.action}</p>
          )))}
          {!Object.values(recommendations).some((items) => items?.length) && <p className="analytics-footnote">More observed activity is needed before personalized guidance is generated.</p>}
        </article>
      </section>

      <section className="analytics-bottom-grid">
        <article className="analytics-panel consistency-panel">
          <div className="analytics-panel-head"><div><p className="eyebrow">REPORTS / 12</p><h2>Download your data</h2></div></div>
          <div className="snooze-policy-row">
            {["habit", "wake", "challenge", "productivity", "sleep"].flatMap((type) => ["xlsx", "pdf"].map((format) => (
              <button key={`${type}-${format}`} type="button" onClick={() => {
                fetch(`${API}/reports/${type}?format=${format}`, { headers: headers() }).then(async (response) => {
                  if (!response.ok) throw new Error("Report unavailable");
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `brainos-${type}-report.${format}`;
                  link.click();
                  URL.revokeObjectURL(url);
                }).catch(() => {
                  setReportNotice("This report is unavailable right now.");
                });
              }}>{type} {format.toUpperCase()}</button>
            )))}
          </div>
        </article>
      </section>

      <section className="analytics-grid-main">
        <article className="analytics-panel snooze-visual">
          <div className="analytics-panel-head">
            <div><p className="eyebrow">SNOOZE RHYTHM</p><h2>Your delay pattern</h2></div>
            <b>{Number(snooze?.total_snoozes ?? 0)} events</b>
          </div>
          <div className="snooze-wave" aria-label="Snooze rhythm observations">
            {Array.isArray(snooze?.recent_7_day_snoozes_by_day)
              ? snooze.recent_7_day_snoozes_by_day.map((value, index) => <i key={index} style={{ height: `${Math.max(8, Math.min(100, Number(value) * 18))}%` }} className={Number(value) > 2 ? "peak" : ""} />)
              : <p className="analytics-footnote">Daily snooze observations are not available yet.</p>}
          </div>
          <div className="snooze-days">
            {"MTWTFSS".split("").map((letter, index) => (
              <span key={`${letter}-${index}`} className={index < Math.min(7, Number(snooze?.recent_7_day_snoozes ?? 0)) ? "active" : ""}>{letter}</span>
            ))}
          </div>
          <div className="analytics-metrics-row">
            <div><span>AVG DELAY</span><b>{snooze?.average_snooze_minutes ?? "—"}m</b></div>
            <div><span>COMMON</span><b>{snooze?.most_common_snooze_minutes ?? "—"}m</b></div>
            <div><span>RECENT</span><b>{snooze?.recent_7_day_snoozes ?? "—"}</b></div>
            <div><span>PER WAKE</span><b>{snooze?.snoozes_per_wake ?? "—"}</b></div>
            <div><span>SNOOZE RATE</span><b>{snooze?.recent_7_day_snooze_rate != null ? `${snooze.recent_7_day_snooze_rate}%` : "—"}</b></div>
          </div>
          {reportNotice && <p className="form-notice" role="alert">{reportNotice}</p>}
        </article>

        <article className="analytics-panel wake-radar-panel">
          <div className="analytics-panel-head">
            <div><p className="eyebrow">HABIT MOMENTUM</p><h2>Six-signal profile</h2></div>
            <b>{Math.round(clamp(habit?.consistency_percent))}%</b>
          </div>
          <svg className="analytics-radar" viewBox="0 0 300 230" role="img" aria-label="Behavioral habit radar">
            <polygon points="150,41 221,93 194,178 106,178 79,93" className="radar-grid" />
            <polygon points="150,63 202,101 182,164 118,164 98,101" className="radar-grid" />
            <polygon points={radarPoints} className="radar-data" />
            {[[150,41,"WAKE"],[221,93,"ACCURACY"],[194,178,"HABIT"],[106,178,"FOCUS"],[79,93,"SLEEP"]].map(([x,y,label]) => (
              <text key={label} x={x} y={y} className="radar-label">{label}</text>
            ))}
          </svg>
          <div className="radar-foot"><span>{habit?.missions_completed ?? 0} completed habits</span><span>{wake?.successful_wakes ?? 0} successful wakes</span></div>
        </article>

        <article className="analytics-panel sleep-visual-panel">
          <div className="analytics-panel-head">
            <div><p className="eyebrow">SLEEP RHYTHM</p><h2>Recovery window</h2></div>
            <b>{sleep?.average_sleep_hours ?? "—"}h</b>
          </div>
          <div className="sleep-dial">
            <div className="sleep-dial-inner">
              <span>AVG</span>
              <strong>{sleep?.average_sleep_hours ?? "—"}</strong>
              <small>hours</small>
            </div>
          </div>
          <div className="sleep-stats">
            <div><span>TARGET</span><b>{sleep?.target_sleep_hours ?? "—"}h</b></div>
            <div><span>QUALITY</span><b>{sleep?.average_sleep_quality ?? "—"}%</b></div>
            <div><span>REGULARITY</span><b>{sleep?.duration_consistency_percent ?? 0}%</b></div>
          </div>
        </article>

        <article className="analytics-panel productivity-panel">
          <div className="analytics-panel-head">
            <div><p className="eyebrow">BEHAVIOR → PRODUCTIVITY</p><h2>Observed association</h2></div>
            <span className="analytics-badge">NOT CAUSATION</span>
          </div>
          <div className="correlation-board">
            <div className="correlation-bar"><span>Sleep quality</span><i style={{ width: `${Math.max(8, clamp((Number(productivity?.sleep_quality_vs_productivity ?? 0) + 1) * 50))}%` }} /><b>{productivity?.sleep_quality_vs_productivity ?? "—"}</b></div>
            <div className="correlation-bar"><span>Snooze count</span><i style={{ width: `${Math.max(8, clamp((1 - Number(productivity?.snooze_count_vs_productivity ?? 0) * 0.5) * 100))}%` }} /><b>{productivity?.snooze_count_vs_productivity ?? "—"}</b></div>
            <div className="correlation-scale"><span>−1</span><span>0</span><span>+1</span></div>
          </div>
          <p className="analytics-footnote">{productivity?.interpretation || "Observed relationship from available daily records."}</p>
        </article>
      </section>

      <section className="analytics-bottom-grid">
        <article className="analytics-panel learned-panel">
          <div className="learned-icon">✦</div>
          <p className="eyebrow">BRAINOS LEARNED</p>
          <h2>{learned}</h2>
          <p>Based on {attempts || 0} recorded activities and {passed || 0} successful checkpoints.</p>
          <div className="learned-next"><span>NEXT ADAPTATION</span><b>{readiness >= 80 ? "Keep current difficulty" : "Favor recovery-aware challenges"}</b></div>
        </article>



        <article className="analytics-panel wake-score-panel">
          <div className="analytics-panel-head">
            <div><p className="eyebrow">WAKE BEHAVIOR</p><h2>Verification health</h2></div>
            <b>{wake?.wake_success_rate_percent ?? 0}%</b>
          </div>
          <div className="wake-segment-track">
            <i style={{ width: `${clamp(wake?.wake_success_rate_percent)}%` }} />
          </div>
          <div className="analytics-metrics-row">
            <div><span>SUCCESSFUL</span><b>{wake?.successful_wakes ?? 0}</b></div>
            <div><span>FAILED</span><b>{wake?.wake_challenge_failures ?? 0}</b></div>
            <div><span>AVG VERIFY</span><b>{wake?.average_verification_seconds ?? "—"}s</b></div>
          </div>
        </article>

        <article className="analytics-panel consistency-panel">
          <div className="analytics-panel-head">
            <div><p className="eyebrow">HABIT CONSISTENCY</p><h2>Routine signal</h2></div>
            <b>{habit?.consistency_percent ?? 0}%</b>
          </div>
          <div className="consistency-dots">
            {Array.from({ length: 14 }, (_, index) => <span key={index} className={index < Math.round(clamp(habit?.completion_rate_percent) / 100 * 14) ? "active" : ""} />)}
          </div>
          <p className="analytics-footnote">{habit?.missions_completed ?? 0} missions completed across {habit?.tracked_days ?? 0} tracked days.</p>
        </article>
      </section>
    </section>
  );
}

function Settings({ profile, preferences, saveSettings }) {
  const [form, setForm] = useState({ name: profile?.name || "", ...preferences });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return <section className="module-shell"><div className="module-heading"><p className="eyebrow">PROFILE + HABIT SETTINGS</p><h1>Make the route <em>yours.</em></h1><p>These preferences shape the language and timing of your Daybreak Route. They remain on this device when an older API has no preference endpoint yet.</p></div><form className="module-card alarm-form settings-form" onSubmit={(event) => { event.preventDefault(); void saveSettings(form.name, { preferredWakeTime: form.preferredWakeTime, sleepDuration: form.sleepDuration, timezone: form.timezone, productivityGoal: form.productivityGoal, difficulty: form.difficulty, habits: form.habits }); }}><h2>Your daybreak profile</h2><label>DISPLAY NAME<input value={form.name} onChange={(event) => update("name", event.target.value)} minLength="2" required /></label><label>ACCOUNT EMAIL<input value={profile?.email || ""} disabled /></label><label>PREFERRED WAKE-UP TIME<input type="time" value={form.preferredWakeTime} onChange={(event) => update("preferredWakeTime", event.target.value)} /></label><label>SLEEP DURATION<select value={form.sleepDuration} onChange={(event) => update("sleepDuration", event.target.value)}><option value="6">6 hours</option><option value="7">7 hours</option><option value="8">8 hours</option><option value="9">9 hours</option></select></label><label>TIME ZONE<select value={form.timezone} onChange={(event) => update("timezone", event.target.value)}><option value="Asia/Kolkata">Asia/Kolkata</option><option value="Asia/Dubai">Asia/Dubai</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New York</option><option value="America/Los_Angeles">America/Los Angeles</option></select></label><label>PRODUCTIVITY GOAL<input value={form.productivityGoal} onChange={(event) => update("productivityGoal", event.target.value)} placeholder="Protect a 90-minute focus block" /></label><label>DEFAULT CHALLENGE DIFFICULTY<select value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)}><option value="BEGINNER">Beginner</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option><option value="EXPERT">Expert</option></select></label><label>HABIT PREFERENCES<input value={form.habits} onChange={(event) => update("habits", event.target.value)} placeholder="Hydrate, sunlight, stretch" /></label><p>Signed in as {profile?.role === "WELLNESS_COACH" ? "Wellness Coach" : profile?.role === "ADMIN" ? "Administrator" : "User"} via {profile?.provider || "LOCAL"}.</p><button className="primary-button" {...magnetic()}>SAVE DAYBREAK PROFILE <span>&rarr;</span></button></form></section>;
}

function Workspace({ role }) {
  const coach = role === "WELLNESS_COACH" || role === "COACH";
  const isAdmin = role === "ADMIN";
  const [panelData, setPanelData] = useState(null);
  const [panelError, setPanelError] = useState("");
  const [roleUpdating, setRoleUpdating] = useState(null);
  const [expandedMember, setExpandedMember] = useState(null);
  const [notesByMember, setNotesByMember] = useState({});
  const [noteDraft, setNoteDraft] = useState("");
  const [noteStatus, setNoteStatus] = useState("");
  const [messageDraft, setMessageDraft] = useState({ title: "", message: "" });
  const [messageStatus, setMessageStatus] = useState("");
  const [helpThreadsByMember, setHelpThreadsByMember] = useState({});
  const [replyDraft, setReplyDraft] = useState("");
  const [replyStatus, setReplyStatus] = useState("");
  const [selectedCoachId, setSelectedCoachId] = useState("");
  const [coachRoster, setCoachRoster] = useState([]);
  const [rosterStatus, setRosterStatus] = useState("");

  const loadPanel = useCallback(async () => {
    if (!coach && !isAdmin) return;
    setPanelError("");
    try {
      if (isAdmin) {
        const [platform, users, recommendations] = await Promise.all([
          fetch(`${API}/admin/analytics`, { headers: headers() }).then(readJson),
          fetch(`${API}/admin/users`, { headers: headers() }).then(readJson),
          fetch(`${API}/admin/recommendations`, { headers: headers() }).then(readJson),
        ]);
        setPanelData({ platform, users: users?.users || [], recommendations: recommendations?.recommendations || [] });
      } else {
        const insights = await fetch(`${API}/coach/insights`, { headers: headers() }).then(readJson);
        setPanelData(insights);
      }
    } catch {
      setPanelError("Unable to load workspace data. The API may be offline.");
    }
  }, [coach, isAdmin]);

  useEffect(() => { const timer = setTimeout(() => { void loadPanel(); }, 0); return () => clearTimeout(timer); }, [loadPanel]);

  const changeRole = async (userId, nextRole) => {
    setRoleUpdating(userId);
    try {
      const response = await fetch(`${API}/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({ role: nextRole }),
      });
      if (response.ok) await loadPanel();
    } finally {
      setRoleUpdating(null);
    }
  };

  const loadCoachRoster = useCallback(async (coachId) => {
    if (!coachId) { setCoachRoster([]); return; }
    try {
      const data = await fetch(`${API}/admin/coaches/${coachId}/members`, { headers: headers() }).then(readJson);
      setCoachRoster(data?.members || []);
    } catch {
      setRosterStatus("Unable to load roster.");
    }
  }, []);

  const chooseCoach = async (coachId) => {
    setSelectedCoachId(coachId);
    setRosterStatus("");
    await loadCoachRoster(coachId);
  };

  const assignToCoach = async (memberId) => {
    if (!selectedCoachId) return;
    setRosterStatus("Assigning...");
    try {
      const response = await fetch(`${API}/admin/coaches/${selectedCoachId}/members`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ member_id: memberId }),
      });
      if (response.ok) {
        setRosterStatus("");
        await loadCoachRoster(selectedCoachId);
      } else {
        setRosterStatus("Unable to assign member.");
      }
    } catch {
      setRosterStatus("Neural gateway is offline.");
    }
  };

  const unassignFromCoach = async (memberId) => {
    if (!selectedCoachId) return;
    setRosterStatus("Removing...");
    try {
      const response = await fetch(`${API}/admin/coaches/${selectedCoachId}/members/${memberId}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (response.ok || response.status === 204) {
        setRosterStatus("");
        await loadCoachRoster(selectedCoachId);
      } else {
        setRosterStatus("Unable to remove member.");
      }
    } catch {
      setRosterStatus("Neural gateway is offline.");
    }
  };

  const loadNotes = async (memberId) => {
    const notes = await fetch(`${API}/coach/members/${memberId}/notes`, { headers: headers() }).then(readJson);
    setNotesByMember((current) => ({ ...current, [memberId]: notes || [] }));
  };

  const loadHelpThread = async (memberId) => {
    const messages = await fetch(`${API}/coach/members/${memberId}/help-messages`, { headers: headers() }).then(readJson);
    setHelpThreadsByMember((current) => ({ ...current, [memberId]: messages || [] }));
    await loadPanel();
  };

  const toggleMember = async (memberId) => {
    if (expandedMember === memberId) {
      setExpandedMember(null);
      return;
    }
    setExpandedMember(memberId);
    setNoteDraft("");
    setNoteStatus("");
    setMessageDraft({ title: "", message: "" });
    setMessageStatus("");
    setReplyDraft("");
    setReplyStatus("");
    if (!notesByMember[memberId]) await loadNotes(memberId);
    await loadHelpThread(memberId);
  };

  const submitNote = async (memberId) => {
    if (!noteDraft.trim()) return;
    setNoteStatus("Saving...");
    try {
      const response = await fetch(`${API}/coach/members/${memberId}/notes`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ note: noteDraft.trim() }),
      });
      if (response.ok) {
        setNoteDraft("");
        setNoteStatus("");
        await loadNotes(memberId);
        await loadPanel();
      } else {
        setNoteStatus("Unable to save note.");
      }
    } catch {
      setNoteStatus("Neural gateway is offline.");
    }
  };

  const submitMessage = async (memberId) => {
    if (!messageDraft.title.trim() || !messageDraft.message.trim()) return;
    setMessageStatus("Sending...");
    try {
      const response = await fetch(`${API}/coach/members/${memberId}/message`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(messageDraft),
      });
      const data = await readJson(response);
      if (response.ok) {
        setMessageStatus(`Sent to ${data.delivered_to}.`);
        setMessageDraft({ title: "", message: "" });
      } else {
        setMessageStatus(data?.detail || "Unable to send message.");
      }
    } catch {
      setMessageStatus("Neural gateway is offline.");
    }
  };

  const submitReply = async (memberId) => {
    if (!replyDraft.trim()) return;
    setReplyStatus("Sending...");
    try {
      const response = await fetch(`${API}/coach/members/${memberId}/help-messages`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ message: replyDraft.trim() }),
      });
      if (response.ok) {
        setReplyDraft("");
        setReplyStatus("");
        await loadHelpThread(memberId);
      } else {
        setReplyStatus("Unable to send reply.");
      }
    } catch {
      setReplyStatus("Neural gateway is offline.");
    }
  };

  const openRecommendations = (panelData?.recommendations || [])
    .map((entry) => ({ ...entry, count: Object.values(entry.recommendations || {}).reduce((sum, list) => sum + list.length, 0) }))
    .filter((entry) => entry.count > 0);

  const average = (values) => values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null;
  const allCoaches = isAdmin ? (panelData?.users || []).filter((member) => member.role === "WELLNESS_COACH") : [];
  const rosterIds = new Set(coachRoster.map((member) => member.user_id));
  const unassignedUsers = isAdmin ? (panelData?.users || []).filter((member) => member.role === "USER" && !rosterIds.has(member.id)) : [];
  const coachMembers = panelData?.users || [];
  const habitAdherence = coachMembers
    .map((entry) => ({ user_id: entry.user_id, name: entry.name, rate: entry.analytics?.habit_consistency?.completion_rate_percent, tracked: entry.analytics?.habit_consistency?.missions_tracked }))
    .filter((entry) => entry.tracked > 0);
  const sleepTrends = coachMembers
    .map((entry) => ({ user_id: entry.user_id, name: entry.name, avgHours: entry.analytics?.sleep_patterns?.average_sleep_hours, consistency: entry.analytics?.sleep_patterns?.duration_consistency_percent, records: entry.analytics?.sleep_patterns?.records }))
    .filter((entry) => entry.records > 0);
  const avgAdherence = average(habitAdherence.map((entry) => entry.rate));
  const avgSleepConsistency = average(sleepTrends.map((entry) => entry.consistency));

  const downloadSystemReport = (reportType, format) => {
    fetch(`${API}/admin/reports/${reportType}?format=${format}`, { headers: headers() }).then(async (response) => {
      if (!response.ok) throw new Error("Report unavailable");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `brainos-system-${reportType}-report.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    }).catch(() => setPanelError("Unable to download that report right now."));
  };

  return <section className="module-shell">
    <div className="module-heading">
      <p className="eyebrow">{coach ? "WELLNESS COACH WORKSPACE" : "ADMINISTRATOR WORKSPACE"}</p>
      <h1>{coach ? <>Guide the <em>next step.</em></> : <>Keep the route <em>trusted.</em></>}</h1>
      <p>{coach ? "Translate steady routines into compassionate, actionable coaching prompts." : "Manage members, monitor the platform, and broadcast updates."}</p>
    </div>
    <section className="stats-row">
      <article className="stat-card cyan"><p>{coach ? "MEMBERS TRACKED" : "TOTAL USERS"}</p><div><b><AnimatedNumber value={coach ? panelData?.users_tracked : panelData?.platform?.users} /></b></div><small>{coach ? "Users with role USER" : "Registered accounts"}</small></article>
      <article className="stat-card violet"><p>{coach ? "AVG HABIT SCORE" : "ACTIVE ALARMS"}</p><div><b><AnimatedNumber value={coach ? panelData?.average_habit_score : panelData?.platform?.active_alarms} /></b></div><small>{coach ? "Across tracked members" : "Currently scheduled"}</small></article>
      {isAdmin && <article className="stat-card lime"><p>CHALLENGES COMPLETED</p><div><b><AnimatedNumber value={panelData?.platform?.completed_challenges} /></b></div><small>Verified checkpoints</small></article>}
    </section>

    {panelError && <p className="form-notice" role="alert">{panelError}</p>}

    {isAdmin && <article className="module-card">
      <p className="eyebrow">USER MANAGEMENT</p><h2>Roles &amp; access</h2>
      <div className="user-rows">
        {(panelData?.users || []).map((member) => (
          <div key={member.id} className="user-row">
            <div><b>{member.name}</b><small>{member.email}</small></div>
            <select value={member.role} disabled={roleUpdating === member.id} onChange={(event) => changeRole(member.id, event.target.value)}>
              <option value="USER">User</option>
              <option value="WELLNESS_COACH">Wellness Coach</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        ))}
        {!panelData?.users?.length && <p className="mission-copy">No members yet.</p>}
      </div>
    </article>}

    {isAdmin && <article className="module-card">
      <p className="eyebrow">COACH ROSTERS</p><h2>Assign members to a coach</h2>
      <p className="mission-copy">Only assigned members show up in a coach's workspace, insights, notes, and messages.</p>
      <label>COACH<select value={selectedCoachId} onChange={(event) => void chooseCoach(event.target.value)}>
        <option value="">Select a coach...</option>
        {allCoaches.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
      </select></label>
      {rosterStatus && <p className="form-notice" role="alert">{rosterStatus}</p>}
      {selectedCoachId && <div className="user-rows">
        <p className="eyebrow">ASSIGNED</p>
        {coachRoster.map((member) => (
          <div key={member.user_id} className="user-row">
            <div><b>{member.name}</b><small>{member.email}</small></div>
            <button type="button" onClick={() => void unassignFromCoach(member.user_id)}>Remove</button>
          </div>
        ))}
        {!coachRoster.length && <p className="mission-copy">No members assigned yet.</p>}
        <p className="eyebrow">AVAILABLE</p>
        {unassignedUsers.map((member) => (
          <div key={member.id} className="user-row">
            <div><b>{member.name}</b><small>{member.email}</small></div>
            <button type="button" onClick={() => void assignToCoach(member.id)}>Assign</button>
          </div>
        ))}
        {!unassignedUsers.length && <p className="mission-copy">Every member is already assigned to this coach.</p>}
      </div>}
    </article>}

    {isAdmin && <article className="module-card">
      <p className="eyebrow">RECOMMENDATION MONITORING</p><h2>Members needing attention</h2>
      <div className="user-rows">
        {openRecommendations.map((entry) => (
          <div key={entry.user_id} className="user-row"><span>User #{entry.user_id}</span><b>{entry.count} open recommendation{entry.count === 1 ? "" : "s"}</b></div>
        ))}
        {!openRecommendations.length && <p className="mission-copy">No open recommendations right now.</p>}
      </div>
    </article>}

    {isAdmin && <article className="module-card">
      <p className="eyebrow">SYSTEM REPORTS</p><h2>Export platform data</h2>
      <div className="snooze-policy-row">
        {["users", "platform_summary"].flatMap((type) => ["xlsx", "pdf"].map((format) => (
          <button key={`${type}-${format}`} type="button" onClick={() => downloadSystemReport(type, format)}>
            {type === "users" ? "Users" : "Platform Summary"} {format.toUpperCase()}
          </button>
        )))}
      </div>
    </article>}

    {coach && <article className="module-card">
      <p className="eyebrow">HABIT ADHERENCE ANALYTICS</p><h2>Who's keeping pace</h2>
      <div className="stats-row">
        <article className="stat-card cyan"><p>AVG COMPLETION RATE</p><div><b>{avgAdherence ?? "—"}</b><span>%</span></div><small>Across members with tracked missions</small></article>
      </div>
      <div className="user-rows">
        {habitAdherence.map((entry) => (
          <div key={entry.user_id} className="user-row"><span>{entry.name}</span><b>{entry.rate}% completion</b></div>
        ))}
        {!habitAdherence.length && <p className="mission-copy">No mission data recorded by tracked members yet.</p>}
      </div>
    </article>}

    {coach && <article className="module-card">
      <p className="eyebrow">SLEEP TREND REPORTS</p><h2>Recovery across your members</h2>
      <div className="stats-row">
        <article className="stat-card violet"><p>AVG SLEEP CONSISTENCY</p><div><b>{avgSleepConsistency ?? "—"}</b><span>%</span></div><small>Across members with logged sleep</small></article>
      </div>
      <div className="user-rows">
        {sleepTrends.map((entry) => (
          <div key={entry.user_id} className="user-row"><span>{entry.name}</span><b>{entry.avgHours ?? "—"}h avg · {entry.consistency}% consistent</b></div>
        ))}
        {!sleepTrends.length && <p className="mission-copy">No sleep logs recorded by tracked members yet.</p>}
      </div>
    </article>}

    {coach && <article className="module-card">
      <p className="eyebrow">PROGRESS MONITORING</p><h2>Tracked days this window</h2>
      <div className="user-rows">
        {coachMembers.map((entry) => {
          const consistency = entry.analytics?.habit_consistency;
          return (
            <div key={entry.user_id} className="user-row">
              <span>{entry.name}</span>
              <b>{consistency?.consistent_days ?? 0} / {consistency?.tracked_days ?? 0} consistent days · habit score {entry.habit_score ?? "—"}</b>
            </div>
          );
        })}
        {!coachMembers.length && <p className="mission-copy">No members assigned yet.</p>}
      </div>
    </article>}

    {coach && <article className="module-card">
      <p className="eyebrow">MEMBER INSIGHTS</p><h2>Behavioral signals</h2>
      <p className="mission-copy">Click a member to leave a private coaching note or send them an encouragement message.</p>
      <div className="user-rows">
        {(panelData?.users || []).map((entry) => {
          const analytics = entry.analytics || {};
          const expanded = expandedMember === entry.user_id;
          return (
            <div key={entry.user_id} className={`member-card${expanded ? " expanded" : ""}`}>
              <button type="button" className="user-row member-row-toggle" onClick={() => toggleMember(entry.user_id)}>
                <span>{entry.name}{entry.note_count > 0 && <em className="note-badge">{entry.note_count} note{entry.note_count === 1 ? "" : "s"}</em>}{entry.open_help_requests > 0 && <em className="note-badge">{entry.open_help_requests} help request{entry.open_help_requests === 1 ? "" : "s"}</em>}</span>
                <small>
                  Habit {entry.habit_score ?? "—"} · {analytics.wake_behavior?.wake_success_rate_percent ?? "—"}% wake ·{" "}
                  {analytics.habit_consistency?.completion_rate_percent ?? "—"}% habits ·{" "}
                  {analytics.sleep_patterns?.duration_consistency_percent ?? "—"}% sleep ·{" "}
                  {analytics.snooze_patterns?.total_snoozes ?? 0} snoozes
                </small>
              </button>
              {expanded && <div className="member-detail">
                <div className="member-notes">
                  <p className="eyebrow">COACHING NOTES</p>
                  {(notesByMember[entry.user_id] || []).map((note) => (
                    <div key={note.note_id} className="coach-note">
                      <p>{note.note}</p>
                      <small>{note.coach_name} · {new Date(note.created_at).toLocaleDateString()}</small>
                    </div>
                  ))}
                  {notesByMember[entry.user_id] && !notesByMember[entry.user_id].length && <p className="mission-copy">No notes yet.</p>}
                  <div className="alarm-row">
                    <textarea rows="2" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Add a private coaching note..." maxLength="2000" />
                    <div><button type="button" className="quiet-button" onClick={() => submitNote(entry.user_id)}>Save note</button></div>
                  </div>
                  {noteStatus && <p className="mission-copy">{noteStatus}</p>}
                </div>
                <div className="member-message">
                  <p className="eyebrow">SEND ENCOURAGEMENT</p>
                  <label>TITLE<input value={messageDraft.title} onChange={(event) => setMessageDraft((current) => ({ ...current, title: event.target.value }))} maxLength="160" /></label>
                  <label>MESSAGE<input value={messageDraft.message} onChange={(event) => setMessageDraft((current) => ({ ...current, message: event.target.value }))} maxLength="1000" /></label>
                  <button type="button" className="quiet-button" onClick={() => submitMessage(entry.user_id)}>Send message</button>
                  {messageStatus && <p className="mission-copy">{messageStatus}</p>}
                </div>
                <div className="member-message">
                  <p className="eyebrow">HELP REQUESTS</p>
                  <div className="assistant-thread">
                    {(helpThreadsByMember[entry.user_id] || []).map((entry2) => (
                      <p key={entry2.message_id} className={`assistant-bubble ${entry2.sender === "USER" ? "assistant-bubble-user" : "assistant-bubble-coach"}`}>{entry2.content}</p>
                    ))}
                    {helpThreadsByMember[entry.user_id] && !helpThreadsByMember[entry.user_id].length && <p className="mission-copy">No help requests from this member yet.</p>}
                  </div>
                  <textarea rows="2" value={replyDraft} onChange={(event) => setReplyDraft(event.target.value)} placeholder="Reply to their help request..." maxLength="1000" />
                  <button type="button" className="quiet-button" onClick={() => submitReply(entry.user_id)}>Send reply</button>
                  {replyStatus && <p className="mission-copy">{replyStatus}</p>}
                </div>
              </div>}
            </div>
          );
        })}
        {!panelData?.users?.length && <p className="mission-copy">No members assigned yet.</p>}
      </div>
    </article>}
  </section>;
}