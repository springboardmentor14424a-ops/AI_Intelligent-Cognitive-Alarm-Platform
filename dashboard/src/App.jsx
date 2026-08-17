import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import UserDashboard from './pages/UserDashboard';
import CoachDashboard from './pages/CoachDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
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
          <Route path="/coach" element={<CoachDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
