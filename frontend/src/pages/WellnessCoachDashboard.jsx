import { useEffect, useState } from 'react'
import { Users, Moon, AlertTriangle, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts'
import DashboardLayout from '../components/DashboardLayout.jsx'
import StatCard from '../components/StatCard.jsx'
import api from '../api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { coachedUsers, cohortSleepTrend } from '../mock/mockData.js'

export default function WellnessCoachDashboard() {
  const { user } = useAuth()
  const atRisk = coachedUsers.filter((u) => u.habitScore < 65)
  const [liveStats, setLiveStats] = useState(null)

  useEffect(() => {
    api.get('/api/dashboard/wellness-coach').then((res) => setLiveStats(res.data)).catch(() => {})
  }, [])

  return (
    <DashboardLayout role="WELLNESS_COACH" userName={user.name}>
      <div className="topbar">
        <div>
          <div className="eyebrow">Wellness coach</div>
          <h1>Cohort overview</h1>
        </div>
        <div className="date">Sunday, August 2, 2026</div>
      </div>

      <div className="dev-note" style={{ marginBottom: 18 }}>
        Signed in as <strong>{user.email}</strong>. "Users monitored" is a live count from PostgreSQL — the
        cohort charts and per-user list below are still placeholder data until habit scoring is built.
      </div>

      <div className="grid grid-4">
        <StatCard icon={Users} label="Users monitored"
          value={liveStats ? liveStats.total_users_monitored : '—'}
          trend="Live from database" trendDirection="up"
          tint={{ bg: '#D8F1EE', fg: '#2BB3A3' }} />
        <StatCard icon={TrendingUp} label="Avg. habit score" value="70"
          trend="4 pts vs last month" trendDirection="up"
          tint={{ bg: '#FCE3CB', fg: '#F2994A' }} />
        <StatCard icon={Moon} label="Sleep adherence" value="76%"
          trend="2% vs last month" trendDirection="up"
          tint={{ bg: '#E4F5EC', fg: '#3FAE7B' }} />
        <StatCard icon={AlertTriangle} label="Users at risk" value={atRisk.length}
          trend="Habit score below 65" trendDirection="down"
          tint={{ bg: '#FBE6E6', fg: '#E15554' }} />
      </div>

      <div className="section-title">Cohort progress</div>
      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">
            Average habit score trend
            <span className="sub">last 6 weeks</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={cohortSleepTrend}>
              <defs>
                <linearGradient id="coachGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2BB3A3" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2BB3A3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDEEF6" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#6B7089' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7089' }} axisLine={false} tickLine={false} domain={[50, 85]} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E8F2', fontSize: 12 }} />
              <Area type="monotone" dataKey="avgScore" stroke="#2BB3A3" strokeWidth={2.5} fill="url(#coachGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">
            Users needing attention
            <span className="sub">habit score &lt; 65</span>
          </div>
          {atRisk.map((u) => (
            <div className="list-row" key={u.name}>
              <span>{u.name}</span>
              <span className="pill warning">Score {u.habitScore}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="section-title">All monitored users</div>
      <div className="card">
        {coachedUsers.map((u) => (
          <div className="list-row" key={u.name}>
            <span>{u.name}</span>
            <span style={{ color: 'var(--muted)' }}>{u.lastActive}</span>
            <span className={`pill ${u.habitScore >= 75 ? 'success' : u.habitScore >= 65 ? 'neutral' : 'warning'}`}>
              Score {u.habitScore} {u.trend === 'up' ? '▲' : '▼'}
            </span>
          </div>
        ))}
      </div>
    </DashboardLayout>
  )
}
