import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'

const DASHBOARD_ROUTE = {
  USER: '/dashboard/user',
  WELLNESS_COACH: '/dashboard/wellness-coach',
  ADMIN: '/dashboard/admin',
}

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'USER' })
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post('/api/auth/register', form)
      login(data.access_token, data.user)
      navigate(DASHBOARD_ROUTE[data.user.role] || '/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Create Account</h2>
        {error && <p className="error-text">{error}</p>}
        <input name="name" placeholder="Full name" value={form.name}
               onChange={handleChange} required />
        <input name="email" type="email" placeholder="Email" value={form.email}
               onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password (min 8 chars)"
               value={form.password} onChange={handleChange} required minLength={8} />
        <select name="role" value={form.role} onChange={handleChange}>
          <option value="USER">User</option>
          <option value="WELLNESS_COACH">Wellness Coach</option>
          <option value="ADMIN">Admin</option>
        </select>
        <button type="submit">Register</button>
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </form>
    </div>
  )
}
