// Placeholder data so the UI can be reviewed before the backend/DB is wired up.
// Every field here mirrors a real field that will come from the FastAPI endpoints
// in Module 1 step 2/3 (see routers/dashboard.py).

export const currentUserMock = {
  USER: { name: 'Teja', role: 'USER' },
  WELLNESS_COACH: { name: 'Dr. Anika Rao', role: 'WELLNESS_COACH' },
  ADMIN: { name: 'Priya Menon', role: 'ADMIN' },
}

export const wakeTrend = [
  { day: 'Mon', target: 7, actual: 7.2 },
  { day: 'Tue', target: 7, actual: 7.6 },
  { day: 'Wed', target: 7, actual: 6.4 },
  { day: 'Thu', target: 7, actual: 7.1 },
  { day: 'Fri', target: 7, actual: 8.3 },
  { day: 'Sat', target: 7, actual: 7.0 },
  { day: 'Sun', target: 7, actual: 6.9 },
]

export const challengeBreakdown = [
  { type: 'Math', solved: 18 },
  { type: 'Logic', solved: 14 },
  { type: 'Memory', solved: 9 },
  { type: 'Riddles', solved: 11 },
]

export const alarmHistory = [
  { date: 'Today, 6:30 AM', outcome: 'Dismissed on 1st challenge', status: 'success' },
  { date: 'Yesterday, 6:30 AM', outcome: 'Snoozed once, then dismissed', status: 'warning' },
  { date: 'Tue, 6:45 AM', outcome: 'Dismissed on 1st challenge', status: 'success' },
  { date: 'Mon, 7:00 AM', outcome: 'Missed — auto-dismissed', status: 'danger' },
]

export const habitBreakdown = [
  { label: 'Wake-up consistency', weight: 35, value: 82, color: 'var(--amber)' },
  { label: 'Challenge completion', weight: 25, value: 91, color: 'var(--teal)' },
  { label: 'Snooze reduction', weight: 20, value: 68, color: 'var(--success)' },
  { label: 'Sleep schedule adherence', weight: 20, value: 74, color: 'var(--warning)' },
]

export const habitScore = 79

// ---- Wellness Coach mock data ----
export const coachedUsers = [
  { name: 'Rahul S.', habitScore: 88, trend: 'up', lastActive: '6:15 AM today' },
  { name: 'Meera K.', habitScore: 54, trend: 'down', lastActive: '9:40 AM today' },
  { name: 'Arjun P.', habitScore: 71, trend: 'up', lastActive: '6:50 AM today' },
  { name: 'Sana T.', habitScore: 63, trend: 'down', lastActive: '8:05 AM yesterday' },
  { name: 'Kabir D.', habitScore: 92, trend: 'up', lastActive: '6:02 AM today' },
]

export const cohortSleepTrend = [
  { week: 'W1', avgScore: 61 },
  { week: 'W2', avgScore: 64 },
  { week: 'W3', avgScore: 68 },
  { week: 'W4', avgScore: 72 },
  { week: 'W5', avgScore: 70 },
  { week: 'W6', avgScore: 75 },
]

// ---- Admin mock data ----
export const platformGrowth = [
  { month: 'Feb', users: 210 },
  { month: 'Mar', users: 340 },
  { month: 'Apr', users: 480 },
  { month: 'May', users: 610 },
  { month: 'Jun', users: 790 },
  { month: 'Jul', users: 960 },
]

export const usersByRole = [
  { role: 'User', count: 902 },
  { role: 'Wellness Coach', count: 46 },
  { role: 'Admin', count: 12 },
]

export const systemStatus = [
  { name: 'Auth Service', status: 'Operational' },
  { name: 'Challenge Engine', status: 'Operational' },
  { name: 'Notification Service', status: 'Degraded' },
  { name: 'Analytics Pipeline', status: 'Operational' },
]
