import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import DashboardLayout from "./layouts/DashboardLayout";

import Home from "./pages/Landing/Home";
import RoleSelection from "./pages/Login/RoleSelection";
import NotFound from "./pages/NotFound/NotFound";

import UserOverview from "./pages/User/UserOverview";
import MyAlarms from "./pages/User/MyAlarms";
import HabitTracker from "./pages/User/HabitTracker";
import CognitiveChallenges from "./pages/User/CognitiveChallenges";
import SleepAnalytics from "./pages/User/SleepAnalytics";
import Profile from "./pages/User/Profile";

import CoachOverview from "./pages/Coach/CoachOverview";
import CoachUsers from "./pages/Coach/CoachUsers";
import CoachSleepTrends from "./pages/Coach/CoachSleepTrends";
import CoachReports from "./pages/Coach/CoachReports";
import CoachRecommendations from "./pages/Coach/CoachRecommendations";

import AdminOverview from "./pages/Admin/AdminOverview";
import AdminUsers from "./pages/Admin/AdminUsers";
import PlatformAnalytics from "./pages/Admin/PlatformAnalytics";
import AdminReports from "./pages/Admin/AdminReports";
import AdminSettings from "./pages/Admin/AdminSettings";

import { userNavItems, coachNavItems, adminNavItems } from "./routes/navItems";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/select-role" element={<RoleSelection />} />

          <Route
            path="/user"
            element={
              <DashboardLayout
                requiredRole="User"
                navItems={userNavItems}
                basePath="/user"
                breadcrumbRoot="User"
                profileName="Aarav Mehta"
              />
            }
          >
            <Route index element={<UserOverview />} />
            <Route path="alarms" element={<MyAlarms />} />
            <Route path="habits" element={<HabitTracker />} />
            <Route path="challenges" element={<CognitiveChallenges />} />
            <Route path="sleep" element={<SleepAnalytics />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route
            path="/coach"
            element={
              <DashboardLayout
                requiredRole="Coach"
                navItems={coachNavItems}
                basePath="/coach"
                breadcrumbRoot="Coach"
                profileName="Divya Krishnan"
              />
            }
          >
            <Route index element={<CoachOverview />} />
            <Route path="users" element={<CoachUsers />} />
            <Route path="sleep-trends" element={<CoachSleepTrends />} />
            <Route path="reports" element={<CoachReports />} />
            <Route path="recommendations" element={<CoachRecommendations />} />
          </Route>

          <Route
            path="/admin"
            element={
              <DashboardLayout
                requiredRole="Admin"
                navItems={adminNavItems}
                basePath="/admin"
                breadcrumbRoot="Admin"
                profileName="Sanjay Bhatt"
              />
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="analytics" element={<PlatformAnalytics />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
