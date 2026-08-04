import { AlarmClock, Flame, Brain, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from 'recharts'
import DashboardLayout from '../components/DashboardLayout.jsx'
import StatCard from '../components/StatCard.jsx'
import HabitRing from '../components/HabitRing.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  wakeTrend, challengeBreakdown, alarmHistory,
  habitBreakdown, habitScore,
} from '../mock/mockData.js'

export default function UserDashboard() {
  const { user } = useAuth()

  return (
    <DashboardLayout role="USER" userName={user.name}>
      <div className="topbar">
        <div>
          <div className="eyebrow">Good morning</div>
          <h1>{user.name}'s wake-up habits</h1>
        </div>
        <div className="date">Sunday, August 2, 2026 · 6:30 AM alarm set</div>
      </div>

      <div className="dev-note" style={{ marginBottom: 18 }}>
        Signed in as <strong>{user.email}</strong>. Identity and role are live from PostgreSQL via JWT —
        the alarm/challenge/habit numbers below are still placeholder data until the Alarm Scheduling and
        Cognitive Challenge modules are built.
      </div>

      <div className="grid grid-4">
        <StatCard icon={AlarmClock} label="Wake-up consistency" value="82%"
          trend="6% vs last week" trendDirection="up"
          tint={{ bg: '#FCE3CB', fg: '#F2994A' }} />
        <StatCard icon={Flame} label="Current streak" value="9 days"
          trend="Best: 14 days" trendDirection="up"
          tint={{ bg: '#D8F1EE', fg: '#2BB3A3' }} />
        <StatCard icon={Brain} label="Challenges solved" value="52"
          trend="91% accuracy" trendDirection="up"
          tint={{ bg: '#E4F5EC', fg: '#3FAE7B' }} />
        <StatCard icon={TrendingUp} label="Avg. snooze taps" value="0.4"
          trend="Down from 1.2" trendDirection="up"
          tint={{ bg: '#FCF1DA', fg: '#B5811C' }} />
      </div>

      <div className="section-title">This week</div>
      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">
            Sleep duration vs target
            <span className="sub">hours per night</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={wakeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDEEF6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6B7089' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7089' }} axisLine={false} tickLine={false} domain={[5, 9]} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E8F2', fontSize: 12 }} />
              <Line type="monotone" dataKey="target" stroke="#C9CBDD" strokeDasharray="4 4" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="actual" stroke="#F2994A" strokeWidth={2.5} dot={{ r: 3, fill: '#F2994A' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">
            Habit score
            <span className="sub">weighted model</span>
          </div>
          <div className="ring-wrap">
            <HabitRing score={habitScore} />
            <div className="ring-breakdown">
              {habitBreakdown.map((h) => (
                <div className="ring-breakdown-row" key={h.label}>
                  <span className="dot" style={{ background: h.color }} />
                  <span style={{ flexBasis: 130, flexShrink: 0 }}>{h.label}</span>
                  <span className="bar-bg"><span className="bar-fill" style={{ width: `${h.value}%`, background: h.color }} /></span>
                  <span className="pct">{h.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="section-title">Challenge performance & alarm history</div>
      <div className="grid grid-2">
        <div className="card">
          <div className="card-title">
            Challenges solved by type
            <span className="sub">last 30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={challengeBreakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDEEF6" vertical={false} />
              <XAxis dataKey="type" tick={{ fontSize: 12, fill: '#6B7089' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7089' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E7E8F2', fontSize: 12 }} />
              <Bar dataKey="solved" fill="#2BB3A3" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">
            Recent alarms
            <span className="sub">4 most recent</span>
          </div>
          {alarmHistory.map((a) => (
            <div className="list-row" key={a.date}>
              <span>{a.date}</span>
              <span className={`pill ${a.status}`}>{a.outcome}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
