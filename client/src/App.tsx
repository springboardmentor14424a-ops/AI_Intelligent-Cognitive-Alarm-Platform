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
import { SettingsPage } from './pages/Settings';
import { AccessDenied } from './pages/AccessDenied';
import { NotFound } from './pages/NotFound';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/unauthorized" element={<AccessDenied />} />

            {/* Protected Routes: User, Coach, Admin */}
            <Route element={<ProtectedRoute allowedRoles={['user', 'coach', 'admin']} />}>
              <Route path="/user/dashboard" element={<UserDashboard />} />
              <Route path="/user" element={<Navigate to="/user/dashboard" replace />} />
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
  );
};

export default App;
