export const upcomingAlarms = [
  { id: 1, label: "Weekday Wake-up", time: "06:15 AM", days: "Mon–Fri", challenge: "Math Sprint", difficulty: "Medium", status: "Active" },
  { id: 2, label: "Gym Session", time: "05:30 AM", days: "Mon, Wed, Fri", challenge: "Memory Grid", difficulty: "Hard", status: "Active" },
  { id: 3, label: "Weekend Rise", time: "08:00 AM", days: "Sat–Sun", challenge: "Riddle", difficulty: "Easy", status: "Paused" },
  { id: 4, label: "Study Block", time: "07:00 AM", days: "Tue, Thu", challenge: "Logic Puzzle", difficulty: "Medium", status: "Active" },
];

export const challengeHistory = [
  { id: "C-901", date: "2026-07-25", type: "Math Sprint", difficulty: "Medium", accuracy: 92, timeTaken: "38s", result: "Passed" },
  { id: "C-902", date: "2026-07-24", type: "Memory Grid", difficulty: "Hard", accuracy: 76, timeTaken: "1m 12s", result: "Passed" },
  { id: "C-903", date: "2026-07-23", type: "Riddle", difficulty: "Easy", accuracy: 100, timeTaken: "21s", result: "Passed" },
  { id: "C-904", date: "2026-07-22", type: "Logic Puzzle", difficulty: "Medium", accuracy: 64, timeTaken: "1m 40s", result: "Retry" },
  { id: "C-905", date: "2026-07-21", type: "Math Sprint", difficulty: "Medium", accuracy: 88, timeTaken: "44s", result: "Passed" },
];

export const weeklyWakePerformance = [
  { day: "Mon", onTime: 92, target: 90 },
  { day: "Tue", onTime: 85, target: 90 },
  { day: "Wed", onTime: 96, target: 90 },
  { day: "Thu", onTime: 78, target: 90 },
  { day: "Fri", onTime: 90, target: 90 },
  { day: "Sat", onTime: 60, target: 90 },
  { day: "Sun", onTime: 70, target: 90 },
];

export const sleepDuration = [
  { day: "Mon", hours: 6.8 },
  { day: "Tue", hours: 7.2 },
  { day: "Wed", hours: 6.4 },
  { day: "Thu", hours: 7.6 },
  { day: "Fri", hours: 7.0 },
  { day: "Sat", hours: 8.1 },
  { day: "Sun", hours: 7.8 },
];

export const challengeAccuracy = [
  { day: "Mon", accuracy: 88 },
  { day: "Tue", accuracy: 74 },
  { day: "Wed", accuracy: 91 },
  { day: "Thu", accuracy: 82 },
  { day: "Fri", accuracy: 95 },
  { day: "Sat", accuracy: 70 },
  { day: "Sun", accuracy: 85 },
];

export const todaysPuzzle = {
  type: "Logic Puzzle",
  prompt: "Three friends split a bag of 24 marbles so each has a different amount, and each amount is even. What is the largest possible number one friend could have?",
  difficulty: "Medium",
  reward: "+15 Habit Points",
};

export const dailyRecommendation = {
  title: "Shift lights-out 20 minutes earlier",
  detail: "Your deep-sleep window has been starting late this week. An earlier wind-down should lift tomorrow's wake accuracy.",
};
