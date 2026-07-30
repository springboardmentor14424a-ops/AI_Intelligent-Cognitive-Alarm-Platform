import { FiClock, FiTrendingUp, FiZap, FiBarChart2 } from "react-icons/fi";
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
import StatCard from "../../components/StatCard";
import ChartCard from "../../components/ChartCard";
import DataTable, { StatusPill } from "../../components/DataTable";
import CalendarWidget from "../../components/CalendarWidget";
import WeatherWidget from "../../components/WeatherWidget";
import QuoteOfDay from "../../components/QuoteOfDay";
import { upcomingAlarms, challengeHistory, weeklyWakePerformance, sleepDuration, challengeAccuracy, todaysPuzzle, dailyRecommendation } from "../../data/alarms";

export default function UserOverview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Good morning, Aarav</h1>
        <p className="text-ink-900/60 dark:text-white/50 mt-1">Here's how your week is shaping up.</p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={FiClock} label="Today's alarm" value={615} suffix=" AM" accent="indigo" trend={{ direction: "flat", label: "on schedule" }} />
        <StatCard icon={FiTrendingUp} label="Habit score" value={82} suffix="/100" accent="violet" trend={{ direction: "up", label: "+4 this week" }} />
        <StatCard icon={FiZap} label="Wake-up streak" value={14} suffix=" days" accent="sky" trend={{ direction: "up", label: "personal best" }} />
        <StatCard icon={FiBarChart2} label="Productivity score" value={76} suffix="/100" accent="indigo" trend={{ direction: "down", label: "-3 vs last week" }} />
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <ChartCard title="Weekly wake-up performance" subtitle="On-time wake rate vs 90% target" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyWakePerformance}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-ink-100 dark:text-white/5" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
              <Bar dataKey="onTime" fill="#5B5CF6" radius={[6, 6, 0, 0]} name="On-time %" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sleep duration" subtitle="Hours per night">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={sleepDuration}>
              <defs>
                <linearGradient id="sleepFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22B2F2" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#22B2F2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <YAxis hide domain={[4, 9]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
              <Area type="monotone" dataKey="hours" stroke="#22B2F2" strokeWidth={2} fill="url(#sleepFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <ChartCard title="Challenge accuracy" subtitle="Correctness across daily challenges" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={challengeAccuracy}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-ink-100 dark:text-white/5" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} domain={[0, 100]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
              <Line type="monotone" dataKey="accuracy" stroke="#8324F0" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="space-y-5">
          <QuoteOfDay />
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <ChartCard title="Upcoming alarms" className="xl:col-span-2">
          <DataTable
            columns={[
              { key: "label", header: "Alarm" },
              { key: "time", header: "Time" },
              { key: "days", header: "Repeats" },
              { key: "challenge", header: "Challenge" },
              { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
            ]}
            rows={upcomingAlarms}
          />
        </ChartCard>

        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-display font-semibold text-sm mb-1">Today's puzzle</h3>
            <p className="text-xs text-ink-900/50 dark:text-white/40 mb-3">{todaysPuzzle.type} · {todaysPuzzle.difficulty}</p>
            <p className="text-sm leading-relaxed">{todaysPuzzle.prompt}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="pill bg-violet-50 text-violet-600 dark:bg-violet-500/10">{todaysPuzzle.reward}</span>
              <button className="btn-primary text-sm px-4 py-2">Solve now</button>
            </div>
          </div>
        </div>
      </div>

      <ChartCard title="Recent challenge history">
        <DataTable
          keyField="id"
          columns={[
            { key: "date", header: "Date" },
            { key: "type", header: "Type" },
            { key: "difficulty", header: "Difficulty" },
            { key: "accuracy", header: "Accuracy", render: (r) => `${r.accuracy}%` },
            { key: "timeTaken", header: "Time" },
            { key: "result", header: "Result", render: (r) => <StatusPill status={r.result} /> },
          ]}
          rows={challengeHistory}
        />
      </ChartCard>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        <CalendarWidget />
        <WeatherWidget />
        <div className="card p-5">
          <h3 className="font-display font-semibold text-sm mb-3">Daily recommendation</h3>
          <p className="text-sm font-medium">{dailyRecommendation.title}</p>
          <p className="text-sm text-ink-900/60 dark:text-white/50 mt-2 leading-relaxed">{dailyRecommendation.detail}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            {["Set alarm", "Log sleep", "View trends"].map((label) => (
              <button key={label} className="btn-secondary py-2 px-2 text-xs">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
