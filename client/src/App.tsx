import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { UserDashboard } from './pages/UserDashboard';
import { CoachDashboard } from './pages/CoachDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { ProfilePage } from './pages/Profile';
import { HabitsPage } from './pages/Habits';
import { AlarmsPage } from './pages/Alarms';
import { ChallengesPage } from './pages/Challenges';
import { SettingsPage } from './pages/Settings';
import { AuthCallback } from './pages/AuthCallback';
import { AccessDenied } from './pages/AccessDenied';
import { NotFound } from './pages/NotFound';

import { UserAnalytics } from './pages/UserAnalytics';

import { ThemeProvider } from './context/ThemeContext';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Register />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/unauthorized" element={<AccessDenied />} />

              {/* Protected Routes: User, Coach, Admin */}
              <Route element={<ProtectedRoute allowedRoles={['user', 'coach', 'admin']} />}>
                <Route path="/user/dashboard" element={<UserDashboard />} />
                <Route path="/user" element={<Navigate to="/user/dashboard" replace />} />
                <Route path="/analytics" element={<UserAnalytics />} />
                <Route path="/alarms" element={<AlarmsPage />} />
                <Route path="/challenges" element={<ChallengesPage />} />
                <Route path="/habits" element={<HabitsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Protected Routes: Coach & Admin */}
              <Route element={<ProtectedRoute allowedRoles={['coach', 'admin']} />}>
                <Route path="/coach/dashboard" element={<CoachDashboard />} />
                <Route path="/coach" element={<Navigate to="/coach/dashboard" replace />} />
              </Route>

              {/* Protected Routes: Admin Strict */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              </Route>

              {/* Catch-all 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
