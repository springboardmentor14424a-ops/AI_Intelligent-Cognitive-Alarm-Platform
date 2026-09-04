import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api, { API_BASE } from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'

const DASHBOARD_ROUTE = {
  USER: '/dashboard/user',
  WELLNESS_COACH: '/dashboard/wellness-coach',
  ADMIN: '/dashboard/admin',
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      login(data.access_token, data.user)
      navigate(DASHBOARD_ROUTE[data.user.role] || '/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Login</h2>
        {error && <p className="error-text">{error}</p>}
        <input type="email" placeholder="Email" value={email}
               onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password}
               onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Login</button>

        <div className="divider">or</div>

        <a className="google-btn" href={`${API_BASE}/api/auth/google/login`}>
          Continue with Google
        </a>

        <p>Don't have an account? <Link to="/register">Register</Link></p>
      </form>
    </div>
  )
}
