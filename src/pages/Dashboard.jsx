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
const normalizeDifficulty = (value, fallback = "MEDIUM") => ["EASY", "MEDIUM", "HARD"].includes(String(value || "").toUpperCase()) ? String(value).toUpperCase() : fallback;
const fallbackTimeLimit = (difficulty) => ({ EASY: 90, MEDIUM: 75, HARD: 60 })[normalizeDifficulty(difficulty)] || 75;
const fallbackMaxAttempts = (difficulty) => ({ EASY: 3, MEDIUM: 2, HARD: 2 })[normalizeDifficulty(difficulty)] || 2;
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
    difficulty: ["EASY", "MEDIUM", "HARD"].includes(String(difficulty || "").toUpperCase()) ? String(difficulty).toUpperCase() : null,
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
  const [notice, setNotice] = useState("");
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [alarmIntents, setAlarmIntents] = useState({});
  const [challengeHistory, setChallengeHistory] = useState([]);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengePerformance, setChallengePerformance] = useState(null);

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
        setPreferences({ ...defaultPreferences, ...safeRead(preferenceKey(nextProfile.id), {}) });
        setAlarmIntents(safeRead(intentKey(nextProfile.id), {}));
        setChallengeHistory(safeRead(historyKey(nextProfile.id), []));
      }

      const [nextResponse, missionsResponse, performanceResponse] = await Promise.all([
        fetch(`${API}/alarms/check-next`, { method: "POST", headers: headers() }).catch(() => null),
        fetch(`${API}/missions`, { headers: headers() }).catch(() => null),
        fetch(`${API}/challenges/performance`, { headers: headers() }).catch(() => null),
      ]);
      if (nextResponse?.status === 401 || missionsResponse?.status === 401 || performanceResponse?.status === 401) return onSignOut();
      if (nextResponse?.ok) { const payload = await readJson(nextResponse); setNextAlarm(payload?.next_alarm || null); }
      if (missionsResponse?.ok) { const payload = await readJson(missionsResponse); setMissions(Array.isArray(payload) ? payload : []); }
      if (performanceResponse?.ok) { const payload = await readJson(performanceResponse); if (payload) setChallengePerformance(payload); }
    } catch {
      setNotice("The Daybreak Route is in offline mode. Your saved preferences still work on this device.");
    }
  }, [onSignOut]);

  useEffect(() => { const timer = setTimeout(() => { void load(); }, 0); return () => clearTimeout(timer); }, [load]);
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

  const removeAlarm = async (alarmId) => {
    try {
      let response = await fetch(`${API}/alarm/${alarmId}`, { method: "DELETE", headers: headers() });
      if (response.status === 404) response = await fetch(`${API}/alarms/${alarmId}`, { method: "DELETE", headers: headers() });
      if (response.status === 401) return onSignOut();
      if (!response.ok) return setNotice("That wake signal could not be removed.");
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
      setAlarms((current) => current.map((item) => item.alarm_id === alarm.alarm_id ? { ...item, status: enabled ? "ACTIVE" : "DISABLED" } : item));
      setNotice(enabled ? "Wake signal is active again." : "Wake signal paused.");
    } catch { setNotice("The alarm service is unavailable right now."); }
  };

  const activateChallenge = async (type, difficulty) => {
    setChallengeLoading(true);
    try {
      const recommendedDifficulty = performanceRecommendation(challengePerformance).difficulty;
      const fallbackDifficulty = normalizeDifficulty(difficulty || recommendedDifficulty || preferences.difficulty);
      let challenge = fallbackChallenge(type, fallbackDifficulty);
      try {
        const request = { challenge_type: type, intent: "WAKE_UP" };
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
      setActiveChallenge(challenge);
      setView("Challenges");
    } finally {
      setChallengeLoading(false);
    }
  };

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

  const submitChallenge = async (challenge, answer, meta = {}) => {
    const timedOut = Boolean(meta.timedOut);
    if (challenge.remoteId) {
      try {
        const response = await fetch(`${API}/challenges/${challenge.remoteId}/validate`, { method: "POST", headers: headers(), body: JSON.stringify({ answer }) });
        if (response.status === 401) { onSignOut(); return { correct: false, terminal: true, message: "Your session has ended." }; }
        if (response.ok) {
          const verdict = await readJson(response);
          const correct = verdict?.correct === true;
          const attemptsRemaining = Math.max(0, numericValue(verdict?.attempts_remaining, challenge.attemptsRemaining));
          const timeRemainingSeconds = Math.max(0, numericValue(verdict?.time_remaining_seconds, getChallengeRemainingSeconds(challenge)));
          const terminal = correct || timedOut || verdict?.completed === true || isTerminalChallengeStatus(verdict?.status) || attemptsRemaining <= 0 || timeRemainingSeconds <= 0;
          const elapsedSeconds = numericValue(verdict?.elapsed_seconds, Math.round((Date.now() - challenge.startedAt) / 1000));
          const insight = typeof verdict?.insight === "string" ? verdict.insight : "";
          const outcome = {
            correct,
            terminal,
            status: verdict?.status || (correct ? "COMPLETED" : terminal ? "FAILED" : "RETRY"),
            attemptsRemaining,
            timeRemainingSeconds,
            elapsedSeconds,
            message: correct
              ? insight || "Checkpoint complete. Your morning momentum is protected."
              : terminal
                ? insight || (timedOut || timeRemainingSeconds <= 0 ? "Time is up for this checkpoint. Build a fresh one when you are ready." : "This checkpoint is complete. Build a fresh one when you are ready.")
                : `${insight || "Not quite. Reset your breath and try again."} ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`,
          };
          recordChallengeOutcome(challenge, outcome);
          if (correct) {
            await completeChallengeMission(challenge);
            setNotice(`Route checkpoint complete - ${challenge.type.toLowerCase()} clarity unlocked.`);
          }
          if (terminal) void refreshChallengePerformance();
          return outcome;
        }
        const error = await readJson(response);
        const terminal = timedOut || response.status === 409;
        const outcome = {
          correct: false,
          terminal,
          attemptsRemaining: Math.max(0, numericValue(challenge.attemptsRemaining, challenge.maxAttempts)),
          timeRemainingSeconds: getChallengeRemainingSeconds(challenge),
          elapsedSeconds: Math.round((Date.now() - challenge.startedAt) / 1000),
          message: typeof error?.detail === "string" ? error.detail : terminal ? "This checkpoint can no longer be verified. Build a fresh one when you are ready." : "We could not verify that answer. Please try again while the connection returns.",
        };
        recordChallengeOutcome(challenge, outcome);
        return outcome;
      } catch {
        const terminal = timedOut;
        const outcome = {
          correct: false,
          terminal,
          attemptsRemaining: Math.max(0, numericValue(challenge.attemptsRemaining, challenge.maxAttempts)),
          timeRemainingSeconds: getChallengeRemainingSeconds(challenge),
          elapsedSeconds: Math.round((Date.now() - challenge.startedAt) / 1000),
          message: terminal ? "Time is up for this checkpoint. Your device saved the terminal result locally." : "The validation service is unreachable. Keep this checkpoint open and try again when the connection returns.",
        };
        recordChallengeOutcome(challenge, outcome);
        return outcome;
      }
    }

    const attemptsRemaining = Math.max(0, numericValue(meta.attemptsRemaining, challenge.attemptsRemaining));
    const correct = !timedOut && normalizeAnswer(answer) === normalizeAnswer(challenge.expectedAnswer);
    const nextAttemptsRemaining = correct ? attemptsRemaining : Math.max(0, attemptsRemaining - 1);
    const terminal = correct || timedOut || nextAttemptsRemaining <= 0;
    const outcome = {
      correct,
      terminal,
      status: correct ? "COMPLETED" : terminal ? timedOut ? "TIMED_OUT" : "MAX_ATTEMPTS" : "RETRY",
      attemptsRemaining: nextAttemptsRemaining,
      timeRemainingSeconds: getChallengeRemainingSeconds(challenge),
      elapsedSeconds: Math.round((Date.now() - challenge.startedAt) / 1000),
      message: correct
        ? "Checkpoint complete. Your morning momentum is protected."
        : terminal
          ? timedOut ? "Time is up. This offline checkpoint has been saved as complete." : "No attempts remain. This offline checkpoint has been saved as complete."
          : `Not quite. Use the hint, reset your breath, and try again. ${nextAttemptsRemaining} attempt${nextAttemptsRemaining === 1 ? "" : "s"} remaining.`,
    };
    recordChallengeOutcome(challenge, outcome);
    if (correct) {
      await completeChallengeMission(challenge);
      setNotice(`Route checkpoint complete - ${challenge.type.toLowerCase()} clarity unlocked.`);
    }
    return outcome;
  };

  const saveSettings = async (name, nextPreferences) => {
    const cleanedName = name.trim();
    safeWrite(preferenceKey(profile?.id), nextPreferences);
    setPreferences(nextPreferences);
    let profileSaved = false;
    try {
      const response = await fetch(`${API}/profile`, { method: "PATCH", headers: headers(), body: JSON.stringify({ name: cleanedName }) });
      if (response.status === 401) return onSignOut();
      if (response.ok) { setProfile((current) => ({ ...current, name: cleanedName })); profileSaved = true; }
    } catch { /* Preferences still persist locally if the account API is offline. */ }
    try {
      await fetch(`${API}/profile/preferences`, { method: "PATCH", headers: headers(), body: JSON.stringify(nextPreferences) });
    } catch { /* Older API versions do not expose preference storage yet. */ }
    setNotice(profileSaved ? "Profile and Daybreak preferences saved." : "Daybreak preferences saved on this device; profile sync will resume when the API is online.");
  };

  const role = String(profile?.role || "USER").toUpperCase();
  const privileged = ["ADMIN", "WELLNESS_COACH", "COACH"].includes(role);
  const navigation = useMemo(() => privileged ? [...baseNav, "Workspace"] : baseNav, [privileged]);

  return <main className="dashboard-shell"><div className="star-field" />
    <nav className="dash-nav"><div className="wordmark"><i /> BRAIN<span>OS</span></div><div className="nav-links">{navigation.map((item) => <button key={item} className={view === item ? "active" : ""} onClick={() => setView(item)}>{item}</button>)}</div><div className="nav-status"><b /> DAYBREAK LINK</div><button className="avatar" onClick={onSignOut} title="Sign out">{profile?.name?.[0] || "P"}</button></nav>
    {notice && <div className="toast" role="status">{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">&times;</button></div>}
    {view === "Command" && <Command profile={profile} alarms={alarms} analytics={analytics} nextAlarm={nextAlarm} preferences={preferences} missions={missions} history={challengeHistory} onStartChallenge={activateChallenge} goAlarms={() => setView("Alarms")} />}
    {view === "Alarms" && <Alarms alarms={alarms} alarmIntents={alarmIntents} createAlarm={createAlarm} removeAlarm={removeAlarm} toggleAlarm={toggleAlarm} preferences={preferences} />}
    {view === "Challenges" && <Challenges activeChallenge={activeChallenge} loading={challengeLoading} history={challengeHistory} missions={missions} performance={challengePerformance} defaultDifficulty={preferences.difficulty} onStartChallenge={activateChallenge} onSubmitChallenge={submitChallenge} onCloseChallenge={() => setActiveChallenge(null)} />}
    {view === "Analytics" && <Analytics data={analytics} history={challengeHistory} missions={missions} />}
    {view === "Settings" && <Settings key={profile?.id ?? "loading"} profile={profile} preferences={preferences} saveSettings={saveSettings} />}
    {view === "Workspace" && privileged && <Workspace role={role} profile={profile} alarms={alarms} analytics={analytics} preferences={preferences} missions={missions} />}
  </main>;
}

function Command({ profile, alarms, analytics, nextAlarm, preferences, missions, history, onStartChallenge, goAlarms }) {
  const score = analytics?.focus_score ?? 74;
  const next = nextAlarm || alarms.find((alarm) => alarm.status !== "DISABLED");
  const completed = missions.filter((mission) => mission.completed).length + history.filter((entry) => entry.correct).length;
  const route = [
    ["01", "Wind-down cue", bedtimeFrom(preferences.preferredWakeTime, preferences.sleepDuration), "Dim the feed and prepare tomorrow's first choice."],
    ["02", "Sleep arc", `${preferences.sleepDuration} hours`, "Let the route recover your attention reserve."],
    ["03", "Wake checkpoint", next ? formatTime(next.alarm_time) : formatTime(preferences.preferredWakeTime), next?.title || "Set your first wake signal"],
    ["04", "First win", "+ 90 min", preferences.productivityGoal || "Protect a single focus block"],
  ];
  return <><section className="command-hero"><div className="hero-copy"><p className="eyebrow">DAYBREAK ROUTE / {preferences.timezone}</p><h1>Good morning,<br /><em>{profile?.name || "Explorer"}.</em></h1><p>Not another alarm dashboard - this is your route from rest to one deliberate first win.</p><button className="quiet-button" type="button" onClick={goAlarms}>Shape today&apos;s route <span>&rarr;</span></button></div><div className="hero-core"><NeuralCore /><div className="core-caption"><b>{score}</b><span>ROUTE<br />READINESS</span></div></div><div className="hero-metrics"><span>NEXT SIGNAL <b>{next ? formatTime(next.alarm_time) : "NOT SET"}</b></span><span>COMPLETED CHECKPOINTS <b>{completed}</b></span></div></section>
    <section className="dashboard-grid"><article className="mission-card"><div><p className="eyebrow">TODAY&apos;S WAKE CHECKPOINT</p><h2>Earn your<br />first clear thought.</h2><p className="mission-copy">A short pattern challenge helps make your wake-up a choice, not a negotiation.</p></div><div className="mission-bottom"><span><b>+ 180</b> route points</span><button type="button" onClick={() => onStartChallenge("PATTERN")}>Start checkpoint <b>&rarr;</b></button></div></article><article className="assistant-card"><div className="assistant-mark">&#10022;</div><p className="eyebrow">ROUTE GUIDE</p><h3>Your best next move is <em>smaller</em> than your plan.</h3><p>Begin with {preferences.habits.split(",")[0] || "one gentle habit"}. Momentum gets easier after the first proof.</p></article><Stats analytics={analytics} />
      <article className="rhythm-card daybreak-route"><div><p className="eyebrow">THE DAYBREAK ROUTE</p><h3>A morning with four clear stops.</h3><p className="mission-copy">Designed around your preferred wake time, sleep arc, and focus intention.</p><button className="quiet-button" type="button" onClick={() => onStartChallenge("QUIZ")}>Test the first step <span>&rarr;</span></button></div><div className="route-timeline" aria-label="Your four-step Daybreak Route">{route.map(([number, title, time, detail]) => <div className="route-stop" key={number}><span>{number}</span><div><b>{title} <em>{time}</em></b><small>{detail}</small></div></div>)}</div></article>
    </section></>;
}

function Stats({ analytics }) {
  const stats = [{ label: "Brain energy", value: analytics?.focus_score ?? 74, color: "cyan" }, { label: "Sleep battery", value: analytics?.sleep_score ?? 72, color: "violet" }, { label: "Habit orbit", value: analytics?.habit_score ?? 68, color: "lime" }];
  return <section className="stats-row">{stats.map((stat) => <article className={`stat-card ${stat.color}`} key={stat.label}><p>{stat.label}</p><div><b>{stat.value}</b><span>%</span></div><small>Measured from your recent rhythm</small><div className="stat-line"><i style={{ width: `${Math.max(0, Math.min(100, stat.value))}%` }} /></div></article>)}</section>;
}

function Alarms({ alarms, alarmIntents, createAlarm, removeAlarm, toggleAlarm, preferences }) {
  const [form, setForm] = useState({ title: "Morning anchor", intent: "Start calm, then protect one priority", alarm_time: preferences.preferredWakeTime || "07:00", alarm_type: "WEEKDAY", repeat_days: "Mon,Tue,Wed,Thu,Fri", difficulty: preferences.difficulty || "MEDIUM", sound: "Neural Dawn", vibration: true, snooze_minutes: 5, status: "ACTIVE" });
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const chooseType = (alarm_type) => setForm((current) => ({ ...current, alarm_type, repeat_days: defaultRepeatDays(alarm_type) }));
  return <section className="module-shell"><div className="module-heading"><p className="eyebrow">WAKE ORCHESTRATION</p><h1>Build a <em>wake route.</em></h1><p>Pair a sound, an intention, and just enough friction to make waking up feel personal.</p></div><div className="alarm-layout"><form className="module-card alarm-form" onSubmit={(event) => { event.preventDefault(); void createAlarm(form); }}><h2>New wake signal</h2><label>ALARM TITLE<input value={form.title} maxLength="120" onChange={(event) => update("title", event.target.value)} placeholder="Morning anchor" required /></label><label>WAKE INTENT<input value={form.intent} onChange={(event) => update("intent", event.target.value)} placeholder="Why this wake-up matters" /></label><label>WAKE TIME<input type="time" value={form.alarm_time} onChange={(event) => update("alarm_time", event.target.value)} required /></label><label>ALARM TYPE<select value={form.alarm_type} onChange={(event) => chooseType(event.target.value)}>{alarmTypes.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><p className="settings-form">{alarmTypes.find(([value]) => value === form.alarm_type)?.[2]}</p><label>REPEAT DAYS<input value={form.repeat_days} onChange={(event) => update("repeat_days", event.target.value)} placeholder="Mon,Tue..." disabled={form.alarm_type === "ONE_TIME"} /></label><label>MISSION DIFFICULTY<select value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)}><option value="EASY">Easy - quick confidence</option><option value="MEDIUM">Medium - balanced friction</option><option value="HARD">Hard - no autopilot</option></select></label><label>SOUND DESIGN<select value={form.sound} onChange={(event) => update("sound", event.target.value)}><option>Neural Dawn</option><option>Sunrise Pulse</option><option>Forest Signal</option><option>Minimal Chime</option></select></label><label>SNOOZE WINDOW<select value={form.snooze_minutes} onChange={(event) => update("snooze_minutes", Number(event.target.value))}><option value="0">No snooze</option><option value="5">5 minutes</option><option value="10">10 minutes</option><option value="15">15 minutes</option></select></label><button className="quiet-button" type="button" onClick={() => update("vibration", !form.vibration)}>Vibration: {form.vibration ? "on" : "off"} <span>&rarr;</span></button><button className="primary-button">ADD TO DAYBREAK ROUTE <span>&rarr;</span></button></form><div className="alarm-list">{alarms.length ? alarms.map((alarm) => <article className="alarm-row" key={alarm.alarm_id}><div><p className="eyebrow">{labelForAlarmType(alarm.alarm_type)} / {alarm.status || "ACTIVE"}</p><b>{formatTime(alarm.alarm_time)}</b><span>{alarm.title || "Wake mission"} - {alarm.difficulty || "MEDIUM"} - {alarm.sound || "Neural Dawn"}</span>{alarmIntents[alarm.alarm_id] && <span>Intent: {alarmIntents[alarm.alarm_id]}</span>}<span>{alarm.snooze_minutes ?? 5} min snooze {alarm.vibration === false ? "- vibration off" : "- vibration on"}</span></div><div><button type="button" onClick={() => toggleAlarm(alarm)}>{alarm.status === "DISABLED" ? "Resume" : "Pause"}</button><button type="button" onClick={() => removeAlarm(alarm.alarm_id)}>Delete</button></div></article>) : <div className="empty-state">No wake signals yet. Add a route that makes your first morning decision easier.</div>}</div></div></section>;
}

function Challenges({ activeChallenge, loading, history, missions, performance, defaultDifficulty, onStartChallenge, onSubmitChallenge, onCloseChallenge }) {
  const successful = history.filter((entry) => entry.correct).length + missions.filter((mission) => mission.completed).length;
  const recommendation = performanceRecommendation(performance);
  const accuracy = Number(performance?.accuracy_percent);
  const hasAccuracy = Number.isFinite(accuracy);
  return <section className="module-shell">
    <div className="module-heading"><p className="eyebrow">COGNITIVE CHECKPOINTS</p><h1>Earn your <em>morning.</em></h1><p>Choose a small puzzle that makes your attention arrive before your notifications do.</p></div>
    {activeChallenge ? <ChallengeConsole key={activeChallenge.id} challenge={activeChallenge} onSubmit={onSubmitChallenge} onNew={() => onStartChallenge(activeChallenge.type)} onClose={onCloseChallenge} /> : <article className="module-card challenge-status-card"><p className="eyebrow">ROUTE STATUS</p><h2>{successful} completed checkpoints</h2><p className="mission-copy">Each solved challenge becomes a small signal that you can begin on purpose.</p>{(recommendation.difficulty || recommendation.reason || hasAccuracy) && <div className="challenge-personalization" role="status"><span>ADAPTIVE PICK</span><b>{recommendation.difficulty || normalizeDifficulty(defaultDifficulty)}</b>{hasAccuracy && <small>{accuracy.toFixed(0)}% recent accuracy</small>}{recommendation.reason && <p>{recommendation.reason}</p>}</div>}</article>}
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
    <div className="challenge-status-row" aria-live="polite"><span className={timeRemaining <= 10 ? "urgent" : ""}>TIME <b>{formatCountdown(timeRemaining)}</b></span><span>ATTEMPTS <b>{attemptsRemaining} / {maxAttempts}</b></span></div>
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
  return <section className="module-shell"><div className="module-heading"><p className="eyebrow">PROFILE + HABIT SETTINGS</p><h1>Make the route <em>yours.</em></h1><p>These preferences shape the language and timing of your Daybreak Route. They remain on this device when an older API has no preference endpoint yet.</p></div><form className="module-card alarm-form settings-form" onSubmit={(event) => { event.preventDefault(); void saveSettings(form.name, { preferredWakeTime: form.preferredWakeTime, sleepDuration: form.sleepDuration, timezone: form.timezone, productivityGoal: form.productivityGoal, difficulty: form.difficulty, habits: form.habits }); }}><h2>Your daybreak profile</h2><label>DISPLAY NAME<input value={form.name} onChange={(event) => update("name", event.target.value)} minLength="2" required /></label><label>ACCOUNT EMAIL<input value={profile?.email || ""} disabled /></label><label>PREFERRED WAKE-UP TIME<input type="time" value={form.preferredWakeTime} onChange={(event) => update("preferredWakeTime", event.target.value)} /></label><label>SLEEP DURATION<select value={form.sleepDuration} onChange={(event) => update("sleepDuration", event.target.value)}><option value="6">6 hours</option><option value="7">7 hours</option><option value="8">8 hours</option><option value="9">9 hours</option></select></label><label>TIME ZONE<select value={form.timezone} onChange={(event) => update("timezone", event.target.value)}><option value="Asia/Kolkata">Asia/Kolkata</option><option value="Asia/Dubai">Asia/Dubai</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New York</option><option value="America/Los_Angeles">America/Los Angeles</option></select></label><label>PRODUCTIVITY GOAL<input value={form.productivityGoal} onChange={(event) => update("productivityGoal", event.target.value)} placeholder="Protect a 90-minute focus block" /></label><label>DEFAULT CHALLENGE DIFFICULTY<select value={form.difficulty} onChange={(event) => update("difficulty", event.target.value)}><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option></select></label><label>HABIT PREFERENCES<input value={form.habits} onChange={(event) => update("habits", event.target.value)} placeholder="Hydrate, sunlight, stretch" /></label><p>Signed in as {profile?.role === "WELLNESS_COACH" ? "Wellness Coach" : profile?.role === "ADMIN" ? "Administrator" : "User"} via {profile?.provider || "LOCAL"}.</p><button className="primary-button">SAVE DAYBREAK PROFILE <span>&rarr;</span></button></form></section>;
}

function Workspace({ role, profile, alarms, analytics, preferences, missions }) {
  const coach = role === "WELLNESS_COACH" || role === "COACH";
  const activeAlarms = alarms.filter((alarm) => alarm.status !== "DISABLED").length;
  const completed = missions.filter((mission) => mission.completed).length;
  return <section className="module-shell"><div className="module-heading"><p className="eyebrow">{coach ? "WELLNESS COACH WORKSPACE" : "ADMINISTRATOR WORKSPACE"}</p><h1>{coach ? <>Guide the <em>next step.</em></> : <>Keep the route <em>trusted.</em></>}</h1><p>{coach ? "Translate steady routines into compassionate, actionable coaching prompts." : "Review the operating signal before you change the system around it."}</p></div><section className="stats-row"><article className="stat-card cyan"><p>{coach ? "COACHING LENS" : "PLATFORM PULSE"}</p><div><b>{analytics?.habit_score ?? 68}</b><span>%</span></div><small>{coach ? "Habit momentum to discuss" : "Current habit-health signal"}</small></article><article className="stat-card violet"><p>ACTIVE ROUTES</p><div><b>{activeAlarms}</b><span>live</span></div><small>Wake signals on this account</small></article><article className="stat-card lime"><p>COMPLETED MISSIONS</p><div><b>{completed}</b><span>done</span></div><small>Verified cognitive checkpoints</small></article></section><article className="module-card full-chart"><div><p className="eyebrow">ROLE-AWARE BRIEF</p><h2>{coach ? `Prepare a gentle prompt for ${profile?.name || "this member"}.` : "Safeguard the Daybreak experience."}</h2><p className="mission-copy">{coach ? `Their stated focus is "${preferences.productivityGoal}". Start with the habit they can actually do tomorrow.` : "Use aggregated, permissioned insights only. Alarm titles, preferences, and challenge answers stay personal by default."}</p></div><div className="route-timeline"><div className="route-stop"><span>01</span><div><b>{coach ? "Observe" : "Review"}</b><small>{coach ? "Look for one sustainable behaviour, not a perfect week." : "Check active route health and account roles."}</small></div></div><div className="route-stop"><span>02</span><div><b>{coach ? "Reflect" : "Protect"}</b><small>{coach ? "Offer a question before a recommendation." : "Keep role boundaries and consent visible."}</small></div></div><div className="route-stop"><span>03</span><div><b>{coach ? "Commit" : "Improve"}</b><small>{coach ? "Agree on the smallest next morning action." : "Use feedback to improve the route without adding pressure."}</small></div></div></div></article></section>;
}
