import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <span className="navbar-title">Intelligent Cognitive Alarm Platform</span>
      {user && (
        <div className="navbar-user">
          <span>{user.name} · {user.role}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}
    </nav>
  )
}
