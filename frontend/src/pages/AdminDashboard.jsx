import { useEffect, useState } from 'react'
import { Users, ShieldCheck, Activity, Server } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import DashboardLayout from '../components/DashboardLayout.jsx'
import StatCard from '../components/StatCard.jsx'
import api from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { platformGrowth, systemStatus } from '../mock/mockData.js'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [liveStats, setLiveStats] = useState(null)

  useEffect(() => {
    api.get('/api/dashboard/admin').then((res) => setLiveStats(res.data)).catch(() => {})
  }, [])

  const totalUsers = liveStats?.total_users ?? 0
  const usersByRole = liveStats
    ? [
        { role: 'User', count: liveStats.users_by_role.USER || 0 },
        { role: 'Wellness Coach', count: liveStats.users_by_role.WELLNESS_COACH || 0 },
        { role: 'Admin', count: liveStats.users_by_role.ADMIN || 0 },
      ]
    : []

  return (
    <DashboardLayout role="ADMIN" userName={user.name}>
      <div className="topbar">
        <div>
          <div className="eyebrow">Administrator</div>
          <h1>Platform overview</h1>
        </div>
        <div className="date">Sunday, August 2, 2026</div>
      </div>

      <div className="dev-note" style={{ marginBottom: 18 }}>
        Signed in as <strong>{user.email}</strong>. "Total accounts" and "Users by role" are live counts
        from PostgreSQL — growth history and system health below are still placeholder data.
      </div>

      <div className="grid grid-4">
        <StatCard icon={Users} label="Total accounts" value={totalUsers.toLocaleString()}
          trend="Live from database" trendDirection="up"
          tint={{ bg: '#FCE3CB', fg: '#F2994A' }} />
        <StatCard icon={ShieldCheck} label="Wellness coaches"
          value={liveStats ? liveStats.users_by_role.WELLNESS_COACH || 0 : '—'}
          trend="Live from database" trendDirection="up"
          tint={{ bg: '#D8F1EE', fg: '#2BB3A3' }} />
        <StatCard icon={Activity} label="Daily active users" value="612"
          trend="4% vs yesterday" trendDirection="up"
          tint={{ bg: '#E4F5EC', fg: '#3FAE7B' }} />
        <StatCard icon={Server} label="Avg. API response" value="118ms"
          trend="Within SLA" trendDirection="up"
          tint={{ bg: '#FCF1DA', fg: '#B5811C' }} />
      </div>

      <div className="section-title">Growth & distribution</div>
      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">
            Registered users
            <span className="sub">last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={platformGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDEEF6" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7089' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7089' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E8F2', fontSize: 12 }} />
              <Bar dataKey="users" fill="#1B1B3A" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Users by role</div>
          {usersByRole.map((r) => (
            <div className="list-row" key={r.role}>
              <span>{r.role}</span>
              <span style={{ fontWeight: 700 }}>{r.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">System health</div>
      <div className="card">
        {systemStatus.map((s) => (
          <div className="list-row" key={s.name}>
            <span>{s.name}</span>
            <span className={`pill ${s.status === 'Operational' ? 'success' : 'warning'}`}>{s.status}</span>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
