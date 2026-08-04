import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * Wraps a page and enforces:
 *  1. The user must be logged in.
 *  2. If `allowedRoles` is given, the user's role must be in that list.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) return <p style={{ padding: 24 }}>Loading...</p>
  if (!user) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
