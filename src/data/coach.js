export const habitScoreDistribution = [
  { range: "0–20", count: 3 },
  { range: "21–40", count: 7 },
  { range: "41–60", count: 18 },
  { range: "61–80", count: 34 },
  { range: "81–100", count: 22 },
];

export const sleepTrends = [
  { week: "W1", avgHours: 6.9 },
  { week: "W2", avgHours: 7.1 },
  { week: "W3", avgHours: 6.7 },
  { week: "W4", avgHours: 7.4 },
  { week: "W5", avgHours: 7.6 },
  { week: "W6", avgHours: 7.2 },
];

export const wakeSuccess = [
  { day: "Mon", success: 88 },
  { day: "Tue", success: 82 },
  { day: "Wed", success: 90 },
  { day: "Thu", success: 79 },
  { day: "Fri", success: 85 },
  { day: "Sat", success: 68 },
  { day: "Sun", success: 71 },
];

export const assignedUsers = [
  { id: "U-1001", name: "Aarav Mehta", habitScore: 82, sleepAvg: "7.1h", trend: "up", risk: "Low" },
  { id: "U-1003", name: "Rohan Kapoor", habitScore: 54, sleepAvg: "5.9h", trend: "down", risk: "High" },
  { id: "U-1004", name: "Sneha Iyer", habitScore: 76, sleepAvg: "6.8h", trend: "flat", risk: "Low" },
  { id: "U-1005", name: "Karthik Rao", habitScore: 63, sleepAvg: "6.3h", trend: "down", risk: "Medium" },
  { id: "U-1007", name: "Vikram Desai", habitScore: 45, sleepAvg: "5.4h", trend: "down", risk: "High" },
  { id: "U-1008", name: "Meera Pillai", habitScore: 70, sleepAvg: "7.0h", trend: "up", risk: "Low" },
];

export const coachRecentActivity = [
  { id: 1, text: "Rohan Kapoor missed 3 consecutive wake targets", time: "2h ago", tone: "warn" },
  { id: 2, text: "Ananya Sharma reached a 17-day streak", time: "5h ago", tone: "good" },
  { id: 3, text: "New recommendation sent to Vikram Desai", time: "Yesterday", tone: "info" },
  { id: 4, text: "Karthik Rao's sleep average dropped below 6.5h", time: "Yesterday", tone: "warn" },
  { id: 5, text: "Meera Pillai completed all challenges this week", time: "2 days ago", tone: "good" },
];
