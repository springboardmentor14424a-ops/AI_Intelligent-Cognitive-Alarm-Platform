import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'

const DASHBOARD_ROUTE = {
  USER: '/dashboard/user',
  WELLNESS_COACH: '/dashboard/wellness-coach',
  ADMIN: '/dashboard/admin',
}

// Backend redirects here as /oauth-callback?token=<jwt> after Google login succeeds.
export default function OAuthCallback() {
  const navigate = useNavigate()
  const { login } = useAuth()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (!token) {
      navigate('/login')
      return
    }
    localStorage.setItem('token', token)
    api.get('/api/users/me').then(({ data }) => {
      login(token, data)
      navigate(DASHBOARD_ROUTE[data.role] || '/')
    }).catch(() => navigate('/login'))
  }, [])

  return <p style={{ padding: 24 }}>Signing you in...</p>
}
