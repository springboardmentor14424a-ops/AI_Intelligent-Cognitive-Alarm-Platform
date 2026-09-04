import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import OAuthCallback from './pages/OAuthCallback.jsx'
import UserDashboard from './pages/UserDashboard.jsx'
import WellnessCoachDashboard from './pages/WellnessCoachDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import Unauthorized from './pages/Unauthorized.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/oauth-callback" element={<OAuthCallback />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route
        path="/dashboard/user"
        element={
          <ProtectedRoute allowedRoles={['USER']}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/wellness-coach"
        element={
          <ProtectedRoute allowedRoles={['WELLNESS_COACH']}>
            <WellnessCoachDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
