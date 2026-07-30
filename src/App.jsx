import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import UserLayout from './layouts/UserLayout';
import CoachLayout from './layouts/CoachLayout';
import AdminLayout from './layouts/AdminLayout';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';

// User Sub-Pages
import UserDashboard from './pages/UserDashboard';
import UserAlarmsPage from './pages/user/UserAlarmsPage';
import UserChallengesPage from './pages/user/UserChallengesPage';
import UserHabitsPage from './pages/user/UserHabitsPage';
import UserSleepPage from './pages/user/UserSleepPage';
import UserProfilePage from './pages/user/UserProfilePage';
import UserSettingsPage from './pages/user/UserSettingsPage';

// Coach Pages & Sub-Pages
import CoachDashboard from './pages/CoachDashboard';
import CoachStudentsPage from './pages/coach/CoachStudentsPage';
import CoachReportsPage from './pages/coach/CoachReportsPage';
import CoachRecommendationsPage from './pages/coach/CoachRecommendationsPage';
import CoachSchedulePage from './pages/coach/CoachSchedulePage';
import CoachSettingsPage from './pages/coach/CoachSettingsPage';
import StudentDetailsPage from './pages/StudentDetailsPage';

// Admin Pages & Sub-Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminUserDetailsPage from './pages/admin/AdminUserDetailsPage';
import AdminChallengeDetailsPage from './pages/admin/AdminChallengeDetailsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminAlarmsPage from './pages/admin/AdminAlarmsPage';
import AdminChallengesPage from './pages/admin/AdminChallengesPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

import { AuthProvider, useAuth } from './context/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { role } = useAuth();

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'student') return <Navigate to="/user" replace />;
    if (role === 'coach') return <Navigate to="/coach" replace />;
    if (role === 'admin') return <Navigate to="/admin" replace />;
  }

  return children;
};

// Main App Router Wrapper
const AppContent = () => {
  const location = useLocation();
  const isUserSection = location.pathname.startsWith('/user');
  const isCoachSection = location.pathname.startsWith('/coach');
  const isAdminSection = location.pathname.startsWith('/admin');
  const isAuthOrLanding = ['/', '/login'].includes(location.pathname);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1F2937] flex flex-col font-sans">
      {/* Show legacy navbar only if on an un-layout page */}
      {!isAuthOrLanding && !isUserSection && !isCoachSection && !isAdminSection && <Navbar />}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage />} />

          {/* User Dashboard Section with UserLayout */}
          <Route
            path="/user"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <UserLayout><UserDashboard /></UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/alarms"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <UserLayout><UserAlarmsPage /></UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/challenges"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <UserLayout><UserChallengesPage /></UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/habits"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <UserLayout><UserHabitsPage /></UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/sleep"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <UserLayout><UserSleepPage /></UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <UserLayout><UserProfilePage /></UserLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/settings"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <UserLayout><UserSettingsPage /></UserLayout>
              </ProtectedRoute>
            }
          />

          {/* Coach Dashboard Section with CoachLayout */}
          <Route 
            path="/coach" 
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <CoachLayout><CoachDashboard /></CoachLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/coach/students" 
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <CoachLayout><CoachStudentsPage /></CoachLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/coach/reports" 
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <CoachLayout><CoachReportsPage /></CoachLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/coach/recommendations" 
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <CoachLayout><CoachRecommendationsPage /></CoachLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/coach/schedule" 
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <CoachLayout><CoachSchedulePage /></CoachLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/coach/settings" 
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <CoachLayout><CoachSettingsPage /></CoachLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/coach/student/:id" 
            element={
              <ProtectedRoute allowedRoles={['coach']}>
                <CoachLayout><StudentDetailsPage /></CoachLayout>
              </ProtectedRoute>
            } 
          />

          {/* Admin Dashboard Section with AdminLayout */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout><AdminDashboard /></AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout><AdminUsersPage /></AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/alarms" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout><AdminAlarmsPage /></AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/challenges" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout><AdminChallengesPage /></AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/reports" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout><AdminReportsPage /></AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/notifications" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout><AdminNotificationsPage /></AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout><AdminSettingsPage /></AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/user/:id" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout><AdminUserDetailsPage /></AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/challenge/:id" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout><AdminChallengeDetailsPage /></AdminLayout>
              </ProtectedRoute>
            } 
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
