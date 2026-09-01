
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NeuralCore from "../components/NeuralCore";

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

const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("brainos_token")}` });
const readJson = async (response) => { try { return await response.json(); } catch { return null; } };
const safeRead = (key, fallback) => {
  try { const saved = window.localStorage.getItem(key); return saved ? JSON.parse(saved) : fallback; } catch { return fallback; }
};
const safeWrite = (key, value) => { try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Device storage is optional. */ } };
const preferenceKey = (userId) => `brainos_daybreak_preferences_${userId || "guest"}`;
const intentKey = (userId) => `brainos_alarm_intents_${userId || "guest"}`;
const historyKey = (userId) => `brainos_challenge_history_${userId || "guest"}`;
const defaultRepeatDays = (type) => ({ DAILY: "Mon,Tue,Wed,Thu,Fri,Sat,Sun", WEEKDAY: "Mon,Tue,Wed,Thu,Fri", WEEKEND: "Sat,Sun", ONE_TIME: "", SMART_ADAPTIVE: "Mon,Tue,Wed,Thu,Fri" })[type] ?? "";
const labelForAlarmType = (type) => alarmTypes.find(([value]) => value === String(type).toUpperCase())?.[1] || "Wake alarm";
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
const DIFFICULTY_LEVELS = ["BEGINNER", "EASY", "MEDIUM", "HARD", "EXPERT"];
const normalizeDifficulty = (value, fallback = "MEDIUM") => {
  const normalized = String(value || "").toUpperCase();
  return DIFFICULTY_LEVELS.includes(normalized) ? normalized : fallback;
};
const fallbackTimeLimit = (difficulty) => ({ BEGINNER: 105, EASY: 90, MEDIUM: 75, HARD: 60, EXPERT: 45 })[normalizeDifficulty(difficulty)] || 75;
const fallbackMaxAttempts = (difficulty) => ({ BEGINNER: 4, EASY: 3, MEDIUM: 2, HARD: 2, EXPERT: 1 })[normalizeDifficulty(difficulty)] || 2;
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
const countdownLabel = (iso, nowMs = Date.now()) => {
  const target = Date.parse(iso || "");
  if (!Number.isFinite(target)) return "NOT SET";
  const diff = target - nowMs;
  if (diff <= 0) return "DUE NOW";
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${Math.max(1, minutes)}m`;
};

const performanceRating = (performance) => {
  const score = Number(performance?.user_rating);
  if (!Number.isInteger(score) || score < 1 || score > 5) return { score: 0, label: "No data", stars: "☆☆☆☆☆" };
  const labels = { 1: "Beginner", 2: "Needs practice", 3: "Developing", 4: "Strong", 5: "Expert" };
  return { score, label: performance?.user_rating_label || labels[score], stars: performance?.user_rating_stars || "★".repeat(score) + "☆".repeat(5 - score) };
};
const alarmPresentationStatus = (alarm, nowMs) => {
  const status = String(alarm?.status || "ACTIVE").toUpperCase();
  const snoozedUntil = Date.parse(alarm?.snoozed_until || "");
  if (["DISABLED", "COMPLETED", "RINGING"].includes(status)) return status;
  if (status === "SNOOZED" && (!Number.isFinite(snoozedUntil) || snoozedUntil > nowMs)) return "SNOOZED";
  if (Number.isFinite(snoozedUntil) && snoozedUntil > nowMs) return "SNOOZED";

  return "ACTIVE";
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
    difficulty: DIFFICULTY_LEVELS.includes(String(difficulty || "").toUpperCase()) ? String(difficulty).toUpperCase() : null,
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
  const [challengeHistory, setChallengeHistory] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengePerformance, setChallengePerformance] = useState(null);
  const [assistantReply, setAssistantReply] = useState("Start with one small win: drink water, then protect one focus block.");
  const [assistantInput, setAssistantInput] = useState("I am tired and need help waking up");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [snoozeSubmitting, setSnoozeSubmitting] = useState(false);
  const [clockNow, setClockNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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
    if (alarm?.notification_enabled === false) return;
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
    setNotice(`${alarm.title || "Wake mission"} is ringing. Snooze or dismiss it.`);
    triggerAlarmNotification(alarm);
    playAlarmTone();
    if (alarmTimerRef.current) window.clearInterval(alarmTimerRef.current);
    alarmTimerRef.current = window.setInterval(playAlarmTone, 1800);
  }, [playAlarmTone, ringingAlarm, triggerAlarmNotification]);

  const snoozeActiveAlarm = useCallback(async (alarm) => {
  if (!alarm || snoozeSubmitting) return;

  const minutes = Number(alarm.snooze_minutes ?? 5) || 5;
  setSnoozeSubmitting(true);

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
    setActiveChallenge((current) => current?.alarmTriggered && current.alarmId === alarmId
      ? { ...current, alarmVerificationComplete: true }
      : current);

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
  } finally {
    setSnoozeSubmitting(false);
  }
}, [onSignOut, snoozeSubmitting, stopAlarmTone]);

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
      setNextAlarm(null);
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
      Notification.requestPermission().catch(() => { /* Browser permission prompts are optional. */ });
    }
  }, []);
  
useEffect(() => {
  if (!nextAlarm || ringingAlarm) return undefined;

  const dueAt = getAlarmDueAt(nextAlarm);

  if (!Number.isFinite(dueAt)) return undefined;

  const MAX_LATE_RING_MS = 15 * 60 * 1000;

  const checkAlarm = () => {
    const lateness = Date.now() - dueAt;

    // Never resurrect an alarm that became due hours ago. The backend also
    // expires stale RINGING states after the same 15-minute window.
    if (lateness >= 0 && lateness <= MAX_LATE_RING_MS) {
      ringAlarm(nextAlarm);
    }
  };

  checkAlarm();
  const timer = window.setInterval(checkAlarm, 1000);
  return () => window.clearInterval(timer);
}, [nextAlarm, ringingAlarm, ringAlarm]);

  useEffect(() => {
    const pollNextAlarm = async () => {
      try {
        const response = await fetch(`${API}/alarms/check-next`, {
          method: "POST",
          headers: headers(),
        });

        if (response.status === 401) {
          onSignOut();
          return;
        }

        if (!response.ok) return;

        const payload = await readJson(response);
        const next = payload?.next_alarm
          ? { ...payload.next_alarm, next_at: payload.next_at }
          : null;

        setNextAlarm(next);
      } catch {
        // Keep current UI state when the scheduler check is temporarily unavailable.
      }
    };

    const timer = window.setInterval(pollNextAlarm, 30000);
    return () => window.clearInterval(timer);
  }, [onSignOut]);

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
    const payload = {
      title: form.title?.trim() || "Morning Focus",
      alarm_time: String(form.alarm_time || "").slice(0, 5),
      alarm_type: form.alarm_type || "DAILY",
      repeat_days: form.alarm_type === "ONE_TIME" ? "" : form.repeat_days || null,
      difficulty: normalizeDifficulty(form.difficulty, preferences.difficulty || "MEDIUM"),
      sound: form.sound || "Neural Dawn",
      vibration: form.vibration !== false,
      snooze_minutes: Number(form.snooze_minutes ?? 5),
      challenge_type: form.challenge_type || "AUTO",
      wake_verification_mode: form.wake_verification_mode || "SINGLE",
      notification_enabled: form.notification_enabled !== false,
      daybreak_route_enabled: form.daybreak_route_enabled !== false,
      wake_window_minutes: Number(form.wake_window_minutes ?? 30),
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

  const activateChallenge = async (type, difficulty, context = {}) => {
    setChallengeLoading(true);
    try {
      const recommendedDifficulty = performanceRecommendation(challengePerformance).difficulty;
      const fallbackDifficulty = normalizeDifficulty(difficulty || recommendedDifficulty || preferences.difficulty);
      let challenge = fallbackChallenge(type, fallbackDifficulty);
      try {
        const request = {
          challenge_type: type,
          intent: context.alarmId ? "WAKE_UP" : "ROUTE",
        };
        if (context.alarmId) request.alarm_id = Number(context.alarmId);
        if (difficulty) request.difficulty = normalizeDifficulty(difficulty);
        const generated = await fetch(`${API}/challenges/generate`, { method: "POST", headers: headers(), body: JSON.stringify(request) });
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
        wakeVerificationMode: context.wakeVerificationMode || "SINGLE",
      });

      setView("Challenges");
    } finally {
      setChallengeLoading(false);
    }
  };
  
 const startAlarmChallenge = useCallback(async (alarm) => {
  if (!alarm) return;

  stopAlarmTone();
  setRingingAlarm(null);

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
    wakeVerificationMode: alarm.wake_verification_mode || "SINGLE",
  });
}, [
  activateChallenge,
  alarmIntents,
  challengePerformance,
  preferences.difficulty,
  stopAlarmTone,
]);

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
      const verificationPending = response.status === 409 && /required wake verification/i.test(String(payload?.detail || ""));
      if (verificationPending) {
        return { ok: false, pending: true, detail: payload?.detail || "Additional wake verification is required." };
      }
      setNotice(payload?.detail || "Challenge cleared, but the alarm could not be finalized.");
      return { ok: false, pending: false };
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

    return { ok: true, pending: false };
  } catch {
    setNotice("Challenge cleared, but alarm finalization is unavailable.");
    return { ok: false, pending: false };
  }
}, [onSignOut, stopAlarmTone]);

const rearmAlarmForVerification = (challenge, message) => {
  if (!challenge?.alarmTriggered || !challenge?.alarmId) return false;
  const alarm = alarms.find((item) => String(item.alarm_id) === String(challenge.alarmId))
    || (String(nextAlarm?.alarm_id) === String(challenge.alarmId) ? nextAlarm : null);
  if (!alarm) {
    setNotice("Wake verification is still required, but the alarm could not be re-armed yet. Keep this checkpoint open and try again when the route reconnects.");
    return false;
  }
  setActiveChallenge(null);
  setRingingAlarm(null);
  setView("Command");
  setNotice(message || "Wake verification is incomplete. Solve another checkpoint to stop the alarm.");
  ringAlarm(alarm);
  return true;
};

const closeActiveChallenge = () => {
  if (!activeChallenge) return;
  if (activeChallenge.alarmTriggered && activeChallenge.alarmId && !activeChallenge.alarmVerificationComplete) {
    rearmAlarmForVerification(activeChallenge, "Wake verification is still required. Solve a fresh checkpoint to stop the alarm.");
    return;
  }
  setActiveChallenge(null);
};

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
            const completion = await completeAlarmWake(challenge.alarmId);
            if (completion?.pending) {
              const alarmForNextStep = alarms.find((item) => item.alarm_id === challenge.alarmId);
              if (alarmForNextStep) {
                setNotice("Wake verification continues. Another verified checkpoint is required.");
                await startAlarmChallenge(alarmForNextStep);
              }
            }
          } else {
            setNotice(
              `Route checkpoint complete - ${challenge.type.toLowerCase()} clarity unlocked.`
            );
          }
        }

        if (terminal) {
          void refreshChallengePerformance();
          if (challenge.alarmTriggered && challenge.alarmId && !correct) {
            rearmAlarmForVerification(
              challenge,
              "Wake verification failed. The alarm remains active; solve a fresh checkpoint to continue."
            );
          }
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
      if (terminal && challenge.alarmTriggered && challenge.alarmId) {
        rearmAlarmForVerification(
          challenge,
          "Wake verification could not be completed. The alarm remains active."
        );
      }
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

  if (terminal && challenge.alarmTriggered && challenge.alarmId && !correct) {
    rearmAlarmForVerification(
      challenge,
      "Wake verification failed. The alarm remains active; solve a fresh checkpoint to continue."
    );
  }

  if (correct) {
    await completeChallengeMission(challenge);

    if (challenge.alarmTriggered && challenge.alarmId) {
      const completion = await completeAlarmWake(challenge.alarmId);
      if (completion?.pending) {
        const alarmForNextStep = alarms.find((item) => item.alarm_id === challenge.alarmId);
        if (alarmForNextStep) {
          setNotice("Wake verification continues. Another verified checkpoint is required.");
          await startAlarmChallenge(alarmForNextStep);
        }
      }
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

  const askAssistant = async () => {
    const message = assistantInput.trim();
    if (!message) return;
    setAssistantLoading(true);
    try {
      const response = await fetch(`${API}/assistant/help`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ message }),
      });
      if (response.status === 401) return onSignOut();
      const payload = await readJson(response);
      setAssistantReply(payload?.reply || "Keep it small. One clear action is enough to start the day well.");
      setAssistantInput("");
    } catch {
      setAssistantReply("The AI guide is unavailable right now, but a simple morning plan still helps: water, light, one priority task.");
    } finally {
      setAssistantLoading(false);
    }
  };

  const role = String(profile?.role || "USER").toUpperCase();
  const privileged = ["ADMIN", "WELLNESS_COACH", "COACH"].includes(role);
  const navigation = useMemo(() => privileged ? [...baseNav, "Workspace"] : baseNav, [privileged]);

  return <main className="dashboard-shell"><div className="star-field" />
    <nav className="dash-nav"><div className="wordmark"><i /> BRAIN<span>OS</span></div><div className="nav-links">{navigation.map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item}</button>)}</div><div className="nav-status"><b /> DAYBREAK LINK</div><button className="avatar" onClick={onSignOut} title="Sign out">{profile?.name?.[0] || "P"}</button></nav>
    {notice && <div className="toast" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">&times;</button></div>}
    {ringingAlarm && !activeChallenge && <WakeAlarmPopup alarm={ringingAlarm} onSnooze={snoozeActiveAlarm} onSolve={startAlarmChallenge} snoozeSubmitting={snoozeSubmitting} />}
    {view === "Command" && <Command
    profile={profile}
    alarms={alarms}
    analytics={analytics}
    nextAlarm={nextAlarm}
    preferences={preferences}
    missions={missions}
    history={challengeHistory}
    onStartChallenge={activateChallenge}
    goAlarms={() => setView("Alarms")}
    assistantReply={assistantReply}
    assistantInput={assistantInput}
    setAssistantInput={setAssistantInput}
    askAssistant={askAssistant}
    assistantLoading={assistantLoading}
  />}
    {view === "Alarms" && <Alarms alarms={alarms} alarmIntents={alarmIntents} createAlarm={createAlarm} updateAlarm={updateAlarm} removeAlarm={removeAlarm} toggleAlarm={toggleAlarm} preferences={preferences} challengePerformance={challengePerformance} onTestSound={playAlarmTone} nowMs={clockNow} />}
    {view === "Challenges" && <Challenges activeChallenge={activeChallenge} loading={challengeLoading} history={challengeHistory} missions={missions} performance={challengePerformance} defaultDifficulty={preferences.difficulty} onStartChallenge={activateChallenge} onSubmitChallenge={submitChallenge} onCloseChallenge={closeActiveChallenge} />}
    {view === "Analytics" && <Analytics data={analytics} history={challengeHistory} missions={missions} />}
    {view === "Settings" && <Settings key={profile?.id ?? "loading"} profile={profile} preferences={preferences} saveSettings={saveSettings} />}
    {view === "Workspace" && privileged && <Workspace role={role} profile={profile} alarms={alarms} analytics={analytics} preferences={preferences} missions={missions} />}
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
  onTestSound,
  nowMs,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState(null);
  const recommendation = performanceRecommendation(challengePerformance);

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
    wakeVerificationMode: "SINGLE",
    snooze_minutes: 5,
    snoozePolicy: "NEW_CHALLENGE",
    sound: "Neural Dawn",
    vibration: true,
    notificationEnabled: true,
  });

  const [form, setForm] = useState(defaultForm);
  const [formError, setFormError] = useState("");

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
    setFormError("");
    setForm(defaultForm());
    setShowCreate(true);
  };

  const openEdit = (alarm) => {
    const intent = alarmIntents?.[alarm.alarm_id] || {};
    const match = String(alarm.alarm_time || "07:00").match(/(\d{1,2}):(\d{2})/);
    const hour24 = match ? Number(match[1]) : 7;
    const minute = match ? match[2] : "00";

    setEditingAlarm(alarm);
    setFormError("");
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
      wakeVerificationMode: alarm.wake_verification_mode || "SINGLE",
      sound: alarm.sound || "Neural Dawn",
      vibration: alarm.vibration !== false,
      notificationEnabled: alarm.notification_enabled !== false,
    });
    setShowCreate(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError("");

    if (
      form.challengeMode === "CUSTOM" &&
      form.challengeTypes.length === 0
    ) {
      setFormError("Select at least one challenge type for Custom Pool.");
      return;
    }

    if (form.alarm_type !== "ONE_TIME" && !form.repeat_days.trim()) {
      setFormError("Add at least one repeat day for a recurring alarm.");
      return;
    }

    if (form.notificationEnabled && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // Notification access remains optional.
      }
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
      wakeVerificationMode: form.wakeVerificationMode,
      snoozePolicy: form.snoozePolicy,
    };

    const payload = {
      title: form.title.trim() || "Morning Focus",
      alarm_time: alarmTimeValue,
      alarm_type: form.alarm_type,
      repeat_days:
        form.alarm_type === "ONE_TIME" ? "" : form.repeat_days,
      difficulty: selectedDifficulty,
      sound: form.sound,
      vibration: form.vibration,
      snooze_minutes: Number(form.snooze_minutes),
      challenge_type: form.challengeMode === "AUTO" ? "AUTO" : (form.challengeTypes[0] || "RIDDLE"),
      wake_verification_mode: form.wakeVerificationMode,
      notification_enabled: Boolean(form.notificationEnabled),
      daybreak_route_enabled: true,
      wake_window_minutes: 30,
      status: "ACTIVE",
    };

    const success = editingAlarm
      ? await updateAlarm(editingAlarm.alarm_id, payload, intent)
      : await createAlarm({ ...payload, intent });

    if (success !== false) {
      setShowCreate(false);
      setEditingAlarm(null);
      setFormError("");
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

  const recentAccuracy = Number(challengePerformance?.accuracy_percent);
  const nextAlarm = activeAlarms.slice().sort((a, b) => {
    const aAt = Date.parse(a.next_at || "");
    const bAt = Date.parse(b.next_at || "");
    if (Number.isFinite(aAt) && Number.isFinite(bAt)) return aAt - bAt;
    if (Number.isFinite(aAt)) return -1;
    if (Number.isFinite(bAt)) return 1;
    return String(a.alarm_time).localeCompare(String(b.alarm_time));
  })[0];
  const nextCountdown = nextAlarm ? countdownLabel(nextAlarm.next_at, nowMs) : "NOT SET";

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
          <small className="alarm-overview-sub">{nextCountdown}</small>
        </article>

        <article>
          <span>RECENT ACCURACY</span>
          <b>{Number.isFinite(recentAccuracy) ? `${Math.round(recentAccuracy)}%` : "—"}</b>
          <small className="alarm-overview-sub">{performanceRating(challengePerformance).stars} {performanceRating(challengePerformance).label}</small>
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
                    <h3>{alarm.title || "Morning Focus"}</h3>
                  </div>

                  <span className={`alarm-status ${alarmPresentationStatus(alarm, nowMs).toLowerCase()}`}>
                    ● {alarmPresentationStatus(alarm, nowMs)}
                  </span>
                </div>

                <div className="alarm-card-time">
                  {formatTime(alarm.alarm_time)}
                </div>

                <div className="alarm-card-repeat">
                  {labelForAlarmType(alarm.alarm_type)}
                  {alarm.repeat_days ? ` · ${alarm.repeat_days}` : ""}
                </div>
                <div className="alarm-card-last-signal">
                  LAST SIGNAL · {alarm.last_fired_at ? new Date(alarm.last_fired_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never fired"}
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
                  <div>
                    <span>DIFFICULTY SOURCE</span>
                    <b>{difficulty === "ADAPTIVE" || intent.difficulty === "ADAPTIVE" ? "ADAPTIVE" : "USER"}</b>
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

      {showCreate && (
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

            <form className="alarm-create-form wake-designer-form" onSubmit={handleSubmit}>
              <div className="protocol-preview compact-preview">
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
                  <strong>{form.challengeMode === "AUTO" ? "Intelligent" : "Custom"}</strong>
                </div>
              </div>

              <div className="wake-core-grid">
                <label>
                  PROTOCOL NAME
                  <input
                    value={form.title}
                    onChange={(event) => update("title", event.target.value)}
                    placeholder="Morning Focus"
                  />
                </label>

                <div className="alarm-time-card featured">
                  <span>WAKE TIME</span>
                  <div className="alarm-time-fields">
                    <select
                      aria-label="Alarm hour"
                      value={form.hour}
                      onChange={(event) => updateTime("hour", event.target.value)}
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((hour) => (
                        <option key={hour} value={String(hour).padStart(2, "0")}>
                          {String(hour).padStart(2, "0")}
                        </option>
                      ))}
                    </select>
                    <span className="time-colon">:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={form.minute}
                      placeholder="00"
                      onChange={(event) => updateTime("minute", event.target.value.replace(/\D/g, "").slice(0, 2))}
                      onBlur={() => {
                        const numeric = Math.min(59, Math.max(0, Number(form.minute) || 0));
                        updateTime("minute", String(numeric).padStart(2, "0"));
                      }}
                      aria-label="Alarm minute"
                    />
                    <select
                      aria-label="Alarm period"
                      value={form.meridiem}
                      onChange={(event) => updateTime("meridiem", event.target.value)}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </div>

                <label>
                  REPEAT
                  <select
                    value={form.alarm_type}
                    onChange={(event) => {
                      const nextType = event.target.value;
                      update("alarm_type", nextType);
                      update("repeat_days", nextType === "ONE_TIME" ? "" : defaultRepeatDays(nextType));
                    }}
                  >
                    {alarmTypes.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                {form.alarm_type !== "ONE_TIME" ? (
                  <label>
                    REPEAT DAYS
                    <input
                      value={form.repeat_days}
                      onChange={(event) => update("repeat_days", event.target.value)}
                      placeholder="Mon,Tue,Wed,Thu,Fri"
                    />
                  </label>
                ) : (
                  <div className="wake-core-note">
                    <span>ONE-TIME SIGNAL</span>
                    <small>This wake runs once and completes after verification.</small>
                  </div>
                )}
              </div>

              <div className="alarm-create-divider compact">
                <span>COGNITIVE WAKE</span>
              </div>

              <div className="protocol-mode-grid compact">
                <button
                  type="button"
                  className={`protocol-mode compact ${form.challengeMode === "AUTO" ? "selected" : ""}`}
                  onClick={() => update("challengeMode", "AUTO")}
                >
                  <span>✦</span>
                  <b>Intelligent Mix</b>
                  <small>BrainOS selects from your performance.</small>
                </button>
                <button
                  type="button"
                  className={`protocol-mode compact ${form.challengeMode === "CUSTOM" ? "selected" : ""}`}
                  onClick={() => update("challengeMode", "CUSTOM")}
                >
                  <span>◈</span>
                  <b>Custom Pool</b>
                  <small>You choose the challenge types.</small>
                </button>
              </div>

              <div className="wake-cognition-grid">
                <div className="challenge-pool compact">
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

                <div className="recommendation-card compact">
                  <div className="recommendation-mark">✦</div>
                  <div>
                    <span>BRAINOS RECOMMENDS</span>
                    <strong>
                      {recommendation?.type ? challengeTitle(recommendation.type) : "Intelligent Mix"} · {recommendation?.difficulty || preferences.difficulty || "MEDIUM"}
                    </strong>
                    <small>
                      {Number.isFinite(recentAccuracy)
                        ? `${Math.round(recentAccuracy)}% recent accuracy is guiding this pick.`
                        : "Your profile preference will guide the first checkpoint."}
                    </small>
                  </div>
                </div>
              </div>

              <div className="wake-settings-grid">
                <label>
                  DIFFICULTY
                  <select value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)}>
                    <option value="ADAPTIVE">Adaptive</option>
                    {DIFFICULTY_LEVELS.map((level) => (
                      <option key={level} value={level}>
                        {level.charAt(0) + level.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  WAKE STRATEGY
                  <select value={form.wakeStrategy} onChange={(event) => update("wakeStrategy", event.target.value)}>
                    <option value="GENTLE">Gentle</option>
                    <option value="FOCUS">Focus</option>
                    <option value="DEEP">Deep Wake</option>
                  </select>
                </label>
              </div>

              <div className="alarm-behavior-grid compact-behavior">
                <div className="alarm-behavior-card">
                  <span>SNOOZE</span>
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
                </div>

                <div className="alarm-behavior-card">
                  <span>AFTER SNOOZE</span>
                  <div className="snooze-after-inline">
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
              </div>

              <details className="alarm-advanced-settings">
                <summary>+ Wake signal settings</summary>
                <div className="alarm-advanced-grid">
                  <label>
                    VERIFICATION METHOD
                    <select value={form.wakeVerificationMode} onChange={(event) => update("wakeVerificationMode", event.target.value)}>
                      <option value="SINGLE">Single challenge</option>
                      <option value="MULTI_STEP">Multi-step · 2 challenges</option>
                      <option value="CONSECUTIVE">Consecutive correct · 2</option>
                      <option value="TIMED">Timed challenge</option>
                      <option value="ACCURACY">Cognitive accuracy · 2</option>
                    </select>
                  </label>

                  <label>
                    SOUND
                    <select value={form.sound} onChange={(event) => update("sound", event.target.value)}>
                      <option value="Neural Dawn">Neural Dawn</option>
                      <option value="Sunrise Pulse">Sunrise Pulse</option>
                      <option value="Forest Signal">Forest Signal</option>
                    </select>
                    <button type="button" className="alarm-test-signal" onClick={() => onTestSound?.()}>&#9654; Test signal</button>
                  </label>

                  <div className="alarm-inline-control">
                    <div>
                      <span>VIBRATION</span>
                      <small>Physical cue when supported.</small>
                    </div>
                    <button type="button" className={`toggle-switch ${form.vibration ? "on" : ""}`} onClick={() => update("vibration", !form.vibration)} aria-label="Toggle vibration">
                      <span />
                    </button>
                  </div>

                  <div className="alarm-inline-control">
                    <div>
                      <span>BROWSER NOTIFICATION</span>
                      <small>Show a system notification when due.</small>
                    </div>
                    <button type="button" className={`toggle-switch ${form.notificationEnabled ? "on" : ""}`} onClick={() => update("notificationEnabled", !form.notificationEnabled)} aria-label="Toggle browser notification">
                      <span />
                    </button>
                  </div>
                </div>
              </details>

              {formError && <div className="alarm-form-error" role="alert">{formError}</div>}

              <div className="protocol-summary-card">
                <div>
                  <span>PROTOCOL SUMMARY</span>
                  <strong>{form.title.trim() || "Morning Focus"}</strong>
                </div>
                <div>
                  <small>{formatTime(alarmTimeValue)} · {form.alarm_type === "ONE_TIME" ? "One time" : form.alarm_type === "WEEKDAY" ? "Weekdays" : form.alarm_type === "WEEKEND" ? "Weekends" : form.alarm_type === "DAILY" ? "Daily" : "Smart adaptive"}</small>
                  <small>{form.difficulty === "ADAPTIVE" ? "Adaptive" : form.difficulty} · Snooze {form.snooze_minutes}m</small>
                </div>
              </div>

              <div className="alarm-create-actions sticky-create-actions">
                <div className="alarm-action-summary">
                  <strong>{formatTime(alarmTimeValue)}</strong>
                  <span>· {form.alarm_type === "ONE_TIME" ? "One time" : form.alarm_type === "WEEKDAY" ? "Weekdays" : form.alarm_type === "WEEKEND" ? "Weekends" : form.alarm_type === "DAILY" ? "Daily" : "Smart adaptive"}</span>
                </div>
                <div className="alarm-action-buttons">
                  <button type="button" className="quiet-button" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="primary-button">
                    {editingAlarm ? "SAVE CHANGES" : "INITIALIZE WAKE PROTOCOL"}
                    <span>→</span>
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}


function WakeAlarmPopup({ alarm, onSnooze, onSolve, snoozeSubmitting = false }) {
  if (!alarm) return null;

  return (
    <div className="wake-alarm-backdrop" role="presentation">
      <section
        className="wake-alarm-popup"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="wake-alarm-title"
      >
        <div className="wake-alarm-icon" aria-hidden="true">
          <span>◷</span>
        </div>

        <div className="wake-alarm-status">
          WAKE SIGNAL / ACTIVE
        </div>

        <div className="wake-alarm-time">
          {formatTime(alarm.alarm_time)}
        </div>

        <h2 id="wake-alarm-title">Alarm is ringing.</h2>
        <p className="wake-alarm-title">
          {alarm.title || "Morning Focus"}
        </p>

        <div className="wake-alarm-meta">
          <span>{labelForAlarmType(alarm.alarm_type)}</span>
          <span>{alarm.difficulty || "ADAPTIVE"}</span>
          <span>{alarm.wake_verification_mode || "SINGLE"}</span>
        </div>

        <p className="wake-alarm-copy">
          Solve the cognitive checkpoint below to disarm the alarm.
        </p>

        <div className="wake-alarm-actions">
          <button
            type="button"
            className="wake-alarm-primary"
            onClick={() => onSolve(alarm)}
          >
            SOLVE TO STOP
            <span>→</span>
          </button>

          <button
            type="button"
            className="wake-alarm-snooze"
            onClick={() => onSnooze(alarm)}
            disabled={snoozeSubmitting}
          >
            {snoozeSubmitting ? "Snoozing…" : `Snooze ${Number(alarm.snooze_minutes ?? 5) || 5} min`}
          </button>
        </div>
      </section>
    </div>
  );
}

function Command({ profile, alarms, analytics, nextAlarm, ringingAlarm, onSnoozeAlarm, snoozeSubmitting, onSolveAlarm, preferences, missions, history, onStartChallenge, goAlarms, assistantReply, assistantInput, setAssistantInput, askAssistant, assistantLoading }) {
  const score = analytics?.focus_score ?? 74;
  const next = nextAlarm || alarms.find((alarm) => alarm.status !== "DISABLED");
  const completed = missions.filter((mission) => mission.completed).length + history.filter((entry) => entry.correct).length;
  const route = [
    ["01", "Wind-down cue", bedtimeFrom(preferences.preferredWakeTime, preferences.sleepDuration), "Dim the feed and prepare tomorrow's first choice."],
    ["02", "Sleep arc", `${preferences.sleepDuration} hours`, "Let the route recover your attention reserve."],
    ["03", "Wake checkpoint", next ? formatTime(next.alarm_time) : formatTime(preferences.preferredWakeTime), next?.title || "Set your first wake signal"],
    ["04", "First win", "+ 90 min", preferences.productivityGoal || "Protect a single focus block"],
  ];
  return (
    <>
      <section className="command-hero">
        <div className="hero-copy">
          <p className="eyebrow">DAYBREAK ROUTE / {preferences.timezone}</p>
          <h1>Good morning,<br /><em>{profile?.name || "Explorer"}.</em></h1>
          <p>Not another alarm dashboard - this is your route from rest to one deliberate first win.</p>
          <button className="quiet-button" type="button" onClick={goAlarms}>Shape today&apos;s route <span>&rarr;</span></button>
        </div>
        <div className="hero-core">
          <NeuralCore />
          <div className="core-caption"><b>{score}</b><span>ROUTE<br />READINESS</span></div>
        </div>
        <div className="hero-metrics">
          <span>NEXT SIGNAL <b>{next ? formatTime(next.alarm_time) : "NOT SET"}</b></span>
          <span>COMPLETED CHECKPOINTS <b>{completed}</b></span>
        </div>
      </section>
      <section className="dashboard-grid">
        <article className="mission-card">
          <div>
            <p className="eyebrow">TODAY&apos;S WAKE CHECKPOINT</p>
            <h2>Earn your<br />first clear thought.</h2>
            <p className="mission-copy">A short pattern challenge helps make your wake-up a choice, not a negotiation.</p>
          </div>
          <div className="mission-bottom">
            <span><b>+ 180</b> route points</span>
            <button type="button" onClick={() => onStartChallenge("PATTERN")}>Start checkpoint <b>&rarr;</b></button>
          </div>
        </article>

        <article className="assistant-card">
          <div className="assistant-mark">&#10022;</div>
          <p className="eyebrow">GEMINI COACH</p>
          <h3>Morning help, without the noise.</h3>
          <textarea value={assistantInput} onChange={(event) => setAssistantInput(event.target.value)} rows={3} placeholder="Ask for wake-up help..." />
          <button type="button" className="quiet-button" disabled={assistantLoading} onClick={askAssistant}>{assistantLoading ? "Thinking..." : "Ask Gemini"} <span>&rarr;</span></button>
          <p className="mission-copy">{assistantReply}</p>
        </article>

        <Stats analytics={analytics} />

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
    </>
  );
}

function Stats({ analytics }) {
  const stats = [{ label: "Brain energy", value: analytics?.focus_score ?? 74, color: "cyan" }, { label: "Sleep battery", value: analytics?.sleep_score ?? 72, color: "violet" }, { label: "Habit orbit", value: analytics?.habit_score ?? 68, color: "lime" }];
  return <section className="stats-row">{stats.map((stat) => <article className={`stat-card ${stat.color}`} key={stat.label}><p>{stat.label}</p><div><b>{stat.value}</b><span>%</span></div><small>Measured from your recent rhythm</small><div className="stat-line"><i style={{ width: `${Math.max(0, Math.min(100, stat.value))}%` }} /></div></article>)}</section>;
}


function Challenges({ activeChallenge, loading, history, missions, performance, defaultDifficulty, onStartChallenge, onSubmitChallenge, onCloseChallenge }) {
  const successful = history.filter((entry) => entry.correct).length + missions.filter((mission) => mission.completed).length;
  const recommendation = performanceRecommendation(performance);
  const accuracy = Number(performance?.accuracy_percent);
  const hasAccuracy = Number.isFinite(accuracy);
  return <section className="module-shell">
    <div className="module-heading"><p className="eyebrow">COGNITIVE CHECKPOINTS</p><h1>Earn your <em>morning.</em></h1><p>Choose a small puzzle that makes your attention arrive before your notifications do.</p></div>
    {activeChallenge ? <ChallengeConsole key={activeChallenge.id} challenge={activeChallenge} onSubmit={onSubmitChallenge} onNew={() => onStartChallenge(activeChallenge.type)} onClose={onCloseChallenge} /> : <article className="module-card challenge-status-card"><p className="eyebrow">ROUTE STATUS</p><h2>{successful} completed checkpoints</h2><p className="mission-copy">Each solved challenge becomes a small signal that you can begin on purpose.</p><div className="performance-rating-inline"><span>USER PERFORMANCE</span><b>{performanceRating(performance).stars}</b><small>{performanceRating(performance).label}{Number.isFinite(Number(performance?.accuracy_percent)) ? ` · ${Math.round(Number(performance.accuracy_percent))}% accuracy` : ""}</small></div>{(recommendation.difficulty || recommendation.reason || hasAccuracy) && <div className="challenge-personalization" role="status"><span>ADAPTIVE PICK</span><b>{recommendation.difficulty || normalizeDifficulty(defaultDifficulty)}</b>{hasAccuracy && <small>{accuracy.toFixed(0)}% recent accuracy</small>}{recommendation.reason && <p>{recommendation.reason}</p>}</div>}</article>}
    <div className="challenge-grid">{challengeTypes.map(([type, title, copy], index) => <article className="challenge-card" key={type}><span>0{index + 1}</span><h2>{title}</h2><p>{copy}</p><button type="button" disabled={loading} onClick={() => onStartChallenge(type)}>{loading ? "Building route..." : "Activate"} <b>&rarr;</b></button></article>)}</div>
  </section>;
}

function ChallengeConsole({ challenge, onSubmit, onNew, onClose }) {
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

  return <article className="module-card challenge-console">
    <div className="panel-cap"><span>{sourceLabel} / {challenge.difficulty}</span><button type="button" onClick={onClose}>Close</button></div>
    <div className="challenge-status-row" aria-live="polite"><span className={timeRemaining <= 10 ? "urgent" : ""}>TIME <b>{formatCountdown(timeRemaining)}</b></span><span>ATTEMPTS <b>{attemptsRemaining} / {maxAttempts}</b></span><span>VERIFY <b>{challenge.wakeVerificationMode || "SINGLE"}</b></span></div>
    <h2>{challenge.type} checkpoint</h2>
    <p className="mission-copy">{challenge.prompt}</p>
    {challenge.selectionReason && <p className="challenge-selection-reason"><b>Adaptive selection</b>{challenge.selectionReason}</p>}
    <form onSubmit={submit}>
      {challenge.options?.length ? <div className="challenge-options">{challenge.options.map((option) => <button className={normalizeAnswer(answer) === normalizeAnswer(option) ? "active" : ""} type="button" key={option} disabled={terminal || submitting} onClick={() => updateAnswer(String(option))}>{option}</button>)}</div> : <label>YOUR ANSWER<input value={answer} disabled={terminal || submitting} onChange={(event) => updateAnswer(event.target.value)} autoComplete="off" placeholder="Type your answer" /></label>}
      {challenge.instructions && <p className="challenge-instructions">{challenge.instructions}</p>}
      {challenge.hint && <p className="settings-form">Hint: {challenge.hint}</p>}
      {result && <p role={result.correct ? "status" : "alert"} className={result.correct ? "signal-row" : "form-notice"}>{result.message}</p>}
      <button className="primary-button" disabled={submitting || terminal || timeRemaining <= 0}>{buttonLabel}<span>&rarr;</span></button>
    </form>
    {terminal && <button className="quiet-button" type="button" onClick={onNew}>{result?.correct ? "Build another checkpoint" : "Try a new checkpoint"} <span>&rarr;</span></button>}
  </article>;
}

function Analytics({ data, history, missions }) {
  const values = data?.history?.length ? data.history : [56, 63, 59, 71, 67, 82, 74];
  const passed = history.filter((entry) => entry.correct).length + missions.filter((mission) => mission.completed).length;
  const attempts = history.length || missions.length;
  return <section className="module-shell"><div className="module-heading"><p className="eyebrow">COGNITIVE INSIGHTS</p><h1>Your rhythm,<br /><em>decoded.</em></h1><p>The route connects sleep quality to the actions that make your first hour feel more yours.</p></div><Stats analytics={data} /><article className="module-card full-chart"><div><p className="eyebrow">SLEEP QUALITY / 7 DAYS</p><h2>Recovery is trending upward.</h2><p className="mission-copy">{passed} checkpoints passed from {attempts || 0} recorded attempts.</p></div><div className="rhythm-chart" aria-label="Seven-day sleep-quality chart">{values.map((value, index) => <span key={`${value}-${index}`} className={index === values.length - 1 ? "active" : ""} style={{ height: `${Math.max(8, Math.min(100, value))}%` }} />)}</div></article></section>;
}

function Settings({ profile, preferences, saveSettings }) {
  const [form, setForm] = useState({ name: profile?.name || "", ...preferences });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  return <section className="module-shell"><div className="module-heading"><p className="eyebrow">PROFILE + HABIT SETTINGS</p><h1>Make the route <em>yours.</em></h1><p>These preferences shape the language and timing of your Daybreak Route. They remain on this device when an older API has no preference endpoint yet.</p></div><form className="module-card alarm-form settings-form" onSubmit={(event) => { event.preventDefault(); void saveSettings(form.name, { preferredWakeTime: form.preferredWakeTime, sleepDuration: form.sleepDuration, timezone: form.timezone, productivityGoal: form.productivityGoal, difficulty: form.difficulty, habits: form.habits }); }}><h2>Your daybreak profile</h2><label>DISPLAY NAME<input value={form.name} onChange={(event) => update("name", event.target.value)} minLength="2" required /></label><label>ACCOUNT EMAIL<input value={profile?.email || ""} disabled /></label><label>PREFERRED WAKE-UP TIME<input type="time" value={form.preferredWakeTime} onChange={(event) => update("preferredWakeTime", event.target.value)} /></label><label>SLEEP DURATION<select value={form.sleepDuration} onChange={(event) => update("sleepDuration", event.target.value)}><option value="6">6 hours</option><option value="7">7 hours</option><option value="8">8 hours</option><option value="9">9 hours</option></select></label><label>TIME ZONE<select value={form.timezone} onChange={(event) => update("timezone", event.target.value)}><option value="Asia/Kolkata">Asia/Kolkata</option><option value="Asia/Dubai">Asia/Dubai</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New York</option><option value="America/Los_Angeles">America/Los Angeles</option></select></label><label>PRODUCTIVITY GOAL<input value={form.productivityGoal} onChange={(event) => update("productivityGoal", event.target.value)} placeholder="Protect a 90-minute focus block" /></label><label>DEFAULT CHALLENGE DIFFICULTY<select value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)}>{DIFFICULTY_LEVELS.map((level) => <option key={level} value={level}>{level.charAt(0) + level.slice(1).toLowerCase()}</option>)}</select></label><label>HABIT PREFERENCES<input value={form.habits} onChange={(event) => update("habits", event.target.value)} placeholder="Hydrate, sunlight, stretch" /></label><p>Signed in as {profile?.role === "WELLNESS_COACH" ? "Wellness Coach" : profile?.role === "ADMIN" ? "Administrator" : "User"} via {profile?.provider || "LOCAL"}.</p><button className="primary-button">SAVE DAYBREAK PROFILE <span>&rarr;</span></button></form></section>;
}

function Workspace({ role, profile, alarms, analytics, preferences, missions }) {
  const coach = role === "WELLNESS_COACH" || role === "COACH";
  const activeAlarms = alarms.filter((alarm) => alarm.status !== "DISABLED").length;
  const completed = missions.filter((mission) => mission.completed).length;
  return <section className="module-shell"><div className="module-heading"><p className="eyebrow">{coach ? "WELLNESS COACH WORKSPACE" : "ADMINISTRATOR WORKSPACE"}</p><h1>{coach ? <>Guide the <em>next step.</em></> : <>Keep the route <em>trusted.</em></>}</h1><p>{coach ? "Translate steady routines into compassionate, actionable coaching prompts." : "Review the operating signal before you change the system around it."}</p></div><section className="stats-row"><article className="stat-card cyan"><p>{coach ? "COACHING LENS" : "PLATFORM PULSE"}</p><div><b>{analytics?.habit_score ?? 68}</b><span>%</span></div><small>{coach ? "Habit momentum to discuss" : "Current habit-health signal"}</small></article><article className="stat-card violet"><p>ACTIVE ROUTES</p><div><b>{activeAlarms}</b><span>live</span></div><small>Wake signals on this account</small></article><article className="stat-card lime"><p>COMPLETED MISSIONS</p><div><b>{completed}</b><span>done</span></div><small>Verified cognitive checkpoints</small></article></section><article className="module-card full-chart"><div><p className="eyebrow">ROLE-AWARE BRIEF</p><h2>{coach ? `Prepare a gentle prompt for ${profile?.name || "this member"}.` : "Safeguard the Daybreak experience."}</h2><p className="mission-copy">{coach ? `Their stated focus is "${preferences.productivityGoal}". Start with the habit they can actually do tomorrow.` : "Use aggregated, permissioned insights only. Alarm titles, preferences, and challenge answers stay personal by default."}</p></div><div className="route-timeline"><div className="route-stop"><span>01</span><div><b>{coach ? "Observe" : "Review"}</b><small>{coach ? "Look for one sustainable behaviour, not a perfect week." : "Check active route health and account roles."}</small></div></div><div className="route-stop"><span>02</span><div><b>{coach ? "Reflect" : "Protect"}</b><small>{coach ? "Offer a question before a recommendation." : "Keep role boundaries and consent visible."}</small></div></div><div className="route-stop"><span>03</span><div><b>{coach ? "Commit" : "Improve"}</b><small>{coach ? "Agree on the smallest next morning action." : "Use feedback to improve the route without adding pressure."}</small></div></div></div></article></section>;
}
