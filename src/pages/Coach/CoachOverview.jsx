import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { FiUsers, FiTrendingUp, FiArrowUpRight, FiAlertTriangle } from "react-icons/fi";
import StatCard from "../../components/StatCard";
import ChartCard from "../../components/ChartCard";
import DataTable, { StatusPill } from "../../components/DataTable";
import { habitScoreDistribution, sleepTrends, wakeSuccess, assignedUsers, coachRecentActivity } from "../../data/coach";

export default function CoachOverview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Good morning, Divya</h1>
        <p className="text-ink-900/60 dark:text-white/50 mt-1">Here's how your assigned users are trending.</p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={FiUsers} label="Total users" value={32} accent="indigo" trend={{ direction: "up", label: "+3 this month" }} />
        <StatCard icon={FiTrendingUp} label="Average habit score" value={71} suffix="/100" accent="violet" trend={{ direction: "up", label: "+2" }} />
        <StatCard icon={FiArrowUpRight} label="Users improving" value={21} accent="sky" trend={{ direction: "up", label: "66%" }} />
        <StatCard icon={FiAlertTriangle} label="At-risk users" value={4} accent="indigo" trend={{ direction: "down", label: "needs attention" }} />
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <ChartCard title="Habit score distribution" subtitle="Number of users per score band" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={habitScoreDistribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-ink-100 dark:text-white/5" />
              <XAxis dataKey="range" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
              <Bar dataKey="count" fill="#8324F0" radius={[6, 6, 0, 0]} name="Users" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sleep trends" subtitle="Average hours, by week">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={sleepTrends}>
              <defs>
                <linearGradient id="coachSleepFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22B2F2" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22B2F2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <YAxis hide domain={[6, 8]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
              <Area type="monotone" dataKey="avgHours" stroke="#22B2F2" strokeWidth={2} fill="url(#coachSleepFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Wake-up success rate" subtitle="Percentage of assigned users waking on target, by day">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={wakeSuccess}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-ink-100 dark:text-white/5" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} domain={[0, 100]} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
            <Line type="monotone" dataKey="success" stroke="#5B5CF6" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid xl:grid-cols-3 gap-5">
        <ChartCard title="Assigned users" className="xl:col-span-2">
          <DataTable
            columns={[
              { key: "name", header: "Name" },
              { key: "habitScore", header: "Habit score" },
              { key: "sleepAvg", header: "Sleep avg." },
              { key: "risk", header: "Risk", render: (r) => <StatusPill status={r.risk} /> },
            ]}
            rows={assignedUsers}
          />
        </ChartCard>

        <ChartCard title="Recent activity">
          <div className="space-y-3">
            {coachRecentActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${a.tone === "warn" ? "bg-amber-500" : a.tone === "good" ? "bg-emerald-500" : "bg-sky-500"}`} />
                <div>
                  <p className="text-ink-900/80 dark:text-white/70 leading-snug">{a.text}</p>
                  <p className="text-xs text-ink-900/40 dark:text-white/30 mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
