import { useNavigate } from 'react-router-dom'
import {
  AlarmClock, LayoutDashboard, Brain, Target, FileBarChart,
  Users, Moon, TrendingUp, ShieldCheck, ServerCog, LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const NAV_BY_ROLE = {
  USER: [
    { label: 'Overview', icon: LayoutDashboard, active: true },
    { label: 'Alarms', icon: AlarmClock },
    { label: 'Challenges', icon: Brain },
    { label: 'Habit Score', icon: Target },
    { label: 'Reports', icon: FileBarChart },
  ],
  WELLNESS_COACH: [
    { label: 'Overview', icon: LayoutDashboard, active: true },
    { label: 'My Users', icon: Users },
    { label: 'Sleep Trends', icon: Moon },
    { label: 'Progress', icon: TrendingUp },
    { label: 'Reports', icon: FileBarChart },
  ],
  ADMIN: [
    { label: 'Overview', icon: LayoutDashboard, active: true },
    { label: 'User Management', icon: Users },
    { label: 'Platform Analytics', icon: TrendingUp },
    { label: 'System Health', icon: ServerCog },
    { label: 'Access & Roles', icon: ShieldCheck },
  ],
}

const ROLE_LABEL = {
  USER: 'User',
  WELLNESS_COACH: 'Wellness Coach',
  ADMIN: 'Administrator',
}

export default function DashboardLayout({ role, userName, children }) {
  const navItems = NAV_BY_ROLE[role] || []
  const initials = userName.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="mark">
            <AlarmClock size={18} color="white" />
          </div>
          <div className="name">
            Cognitive Alarm
            <span>Platform</span>
          </div>
        </div>

        <div className="sidebar-role">{ROLE_LABEL[role]} workspace</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div key={item.label} className={`nav-item ${item.active ? 'active' : ''}`}>
              <item.icon size={16} />
              {item.label}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <div className="avatar">{initials}</div>
            <div className="who">
              <div>{userName}</div>
              <div className="role">{ROLE_LABEL[role]}</div>
            </div>
          </div>
          <div className="nav-item logout" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </div>
        </div>
      </aside>

      <main className="main">{children}</main>
    </div>
  )
}
