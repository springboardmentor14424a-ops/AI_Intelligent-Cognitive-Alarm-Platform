import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AlarmProvider } from './context/AlarmContext';
import LandingPage from './pages/LandingPage';
import UserDashboard from './pages/UserDashboard';
import HabitScorePage from './pages/HabitScorePage';
import ChallengePerformancePage from './pages/ChallengePerformancePage';
import ProductivityInsightsPage from './pages/ProductivityInsightsPage';
import CoachDashboard from './pages/CoachDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <AlarmProvider>
        <Router>
          <Routes>
            {/* Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Dashboard-Wise Dedicated Login Routes */}
            <Route path="/user/login" element={<LoginPage targetRole="user" />} />
            <Route path="/coach/login" element={<LoginPage targetRole="coach" />} />
            <Route path="/admin/login" element={<LoginPage targetRole="admin" />} />
            <Route path="/login" element={<LoginPage targetRole="user" />} />
            <Route path="/login/:role" element={<LoginPage />} />

            {/* Dashboards */}
            <Route path="/user" element={<UserDashboard />} />
            <Route path="/user/habit-score" element={<HabitScorePage />} />
            <Route path="/user/challenge-performance" element={<ChallengePerformancePage />} />
            <Route path="/user/productivity-insights" element={<ProductivityInsightsPage />} />
            <Route path="/coach" element={<CoachDashboard />} />
            <Route path="/coach/:section" element={<CoachDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/:section" element={<AdminDashboard />} />

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AlarmProvider>
    </AuthProvider>
  );
}

export default App;
