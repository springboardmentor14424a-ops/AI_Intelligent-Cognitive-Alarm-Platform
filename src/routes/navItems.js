import {
  FiGrid,
  FiClock,
  FiTrendingUp,
  FiCpu,
  FiMoon,
  FiUser,
  FiUsers,
  FiFileText,
  FiMessageSquare,
  FiBarChart2,
  FiSettings,
} from "react-icons/fi";

export const userNavItems = [
  { label: "Dashboard", icon: FiGrid, to: "" },
  { label: "My Alarms", icon: FiClock, to: "/alarms" },
  { label: "Habit Tracker", icon: FiTrendingUp, to: "/habits" },
  { label: "Cognitive Challenges", icon: FiCpu, to: "/challenges" },
  { label: "Sleep Analytics", icon: FiMoon, to: "/sleep" },
  { label: "Profile", icon: FiUser, to: "/profile" },
];

export const coachNavItems = [
  { label: "Dashboard", icon: FiGrid, to: "" },
  { label: "Users", icon: FiUsers, to: "/users" },
  { label: "Sleep Trends", icon: FiMoon, to: "/sleep-trends" },
  { label: "Reports", icon: FiFileText, to: "/reports" },
  { label: "Recommendations", icon: FiMessageSquare, to: "/recommendations" },
];

export const adminNavItems = [
  { label: "Dashboard", icon: FiGrid, to: "" },
  { label: "Users", icon: FiUsers, to: "/users" },
  { label: "Platform Analytics", icon: FiBarChart2, to: "/analytics" },
  { label: "Reports", icon: FiFileText, to: "/reports" },
  { label: "Settings", icon: FiSettings, to: "/settings" },
];
