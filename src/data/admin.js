export const dailyActiveUsers = [
  { day: "Mon", users: 412 },
  { day: "Tue", users: 438 },
  { day: "Wed", users: 401 },
  { day: "Thu", users: 465 },
  { day: "Fri", users: 480 },
  { day: "Sat", users: 356 },
  { day: "Sun", users: 372 },
];

export const alarmUsage = [
  { day: "Mon", alarms: 620 },
  { day: "Tue", alarms: 655 },
  { day: "Wed", alarms: 601 },
  { day: "Thu", alarms: 690 },
  { day: "Fri", alarms: 710 },
  { day: "Sat", alarms: 480 },
  { day: "Sun", alarms: 512 },
];

export const roleDistribution = [
  { name: "Users", value: 1084 },
  { name: "Coaches", value: 46 },
  { name: "Admins", value: 8 },
];

export const platformLogs = [
  { id: "L-501", event: "Backup completed", level: "info", time: "2026-07-26 03:00" },
  { id: "L-502", event: "Elevated API latency on /alarms", level: "warn", time: "2026-07-25 22:14" },
  { id: "L-503", event: "New coach account approved", level: "info", time: "2026-07-25 18:42" },
  { id: "L-504", event: "Failed login threshold reached for U-1044", level: "error", time: "2026-07-25 14:07" },
  { id: "L-505", event: "Scheduled maintenance completed", level: "info", time: "2026-07-24 02:30" },
];

export const systemHealth = {
  uptime: "99.98%",
  apiLatency: "142ms",
  errorRate: "0.06%",
  queueDepth: 12,
};
