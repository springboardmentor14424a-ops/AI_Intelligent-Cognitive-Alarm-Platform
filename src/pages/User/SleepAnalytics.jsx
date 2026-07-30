import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { FiMoon, FiSunrise, FiClock } from "react-icons/fi";
import ChartCard from "../../components/ChartCard";
import StatCard from "../../components/StatCard";
import { sleepDuration, weeklyWakePerformance } from "../../data/alarms";

const SLEEP_STAGES = [
  { day: "Mon", deep: 1.4, light: 3.8, rem: 1.6 },
  { day: "Tue", deep: 1.6, light: 4.0, rem: 1.6 },
  { day: "Wed", deep: 1.2, light: 3.6, rem: 1.6 },
  { day: "Thu", deep: 1.8, light: 4.2, rem: 1.6 },
  { day: "Fri", deep: 1.5, light: 3.9, rem: 1.6 },
  { day: "Sat", deep: 2.0, light: 4.5, rem: 1.6 },
  { day: "Sun", deep: 1.9, light: 4.3, rem: 1.6 },
];

export default function SleepAnalytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Sleep analytics</h1>
        <p className="text-ink-900/60 dark:text-white/50 mt-1">How your rest connects to how you wake up.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={FiMoon} label="Avg. sleep duration" value={7} suffix=".1h" accent="indigo" trend={{ direction: "up", label: "+0.3h" }} />
        <StatCard icon={FiSunrise} label="Avg. wake accuracy" value={83} suffix="%" accent="sky" trend={{ direction: "flat", label: "steady" }} />
        <StatCard icon={FiClock} label="Bedtime consistency" value={78} suffix="%" accent="violet" trend={{ direction: "down", label: "-5%" }} />
      </div>

      <div className="grid xl:grid-cols-2 gap-5">
        <ChartCard title="Sleep duration" subtitle="Hours per night, last 7 days">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={sleepDuration}>
              <defs>
                <linearGradient id="sleepFill2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B5CF6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#5B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-ink-100 dark:text-white/5" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <YAxis hide domain={[4, 9]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
              <Area type="monotone" dataKey="hours" stroke="#5B5CF6" strokeWidth={2} fill="url(#sleepFill2)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sleep stage breakdown" subtitle="Deep / light / REM, hours per night">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={SLEEP_STAGES} stackOffset="none">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-ink-100 dark:text-white/5" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
              <Bar dataKey="deep" stackId="s" fill="#3830B8" radius={[0, 0, 0, 0]} name="Deep" />
              <Bar dataKey="light" stackId="s" fill="#7B7FFF" name="Light" />
              <Bar dataKey="rem" stackId="s" fill="#B27BFF" radius={[6, 6, 0, 0]} name="REM" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Wake accuracy vs target" subtitle="On-time wake rate through the week">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={weeklyWakePerformance}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-ink-100 dark:text-white/5" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} domain={[0, 100]} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
            <Line type="monotone" dataKey="onTime" stroke="#5B5CF6" strokeWidth={2.5} dot={{ r: 3 }} name="On-time %" />
            <Line type="monotone" dataKey="target" stroke="#C3C8FF" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Target" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
