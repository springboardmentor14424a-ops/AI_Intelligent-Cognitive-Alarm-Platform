import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import ChartCard from "../../components/ChartCard";
import CircularProgress from "../../components/CircularProgress";
import { dailyActiveUsers, alarmUsage } from "../../data/admin";

export default function PlatformAnalytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Platform analytics</h1>
        <p className="text-ink-900/60 dark:text-white/50 mt-1">Engagement and load across the whole platform.</p>
      </div>

      <ChartCard title="Active users vs alarms triggered" subtitle="Correlating engagement with alarm volume">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-ink-100 dark:text-white/5" />
            <XAxis dataKey="day" allowDuplicatedCategory={false} data={dailyActiveUsers} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line data={dailyActiveUsers} type="monotone" dataKey="users" name="Active users" stroke="#5B5CF6" strokeWidth={2.5} dot={{ r: 3 }} />
            <Line data={alarmUsage} type="monotone" dataKey="alarms" name="Alarms triggered" stroke="#8324F0" strokeWidth={2.5} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid xl:grid-cols-3 gap-5">
        <ChartCard title="Weekly alarm volume" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={alarmUsage}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-ink-100 dark:text-white/5" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
              <Bar dataKey="alarms" fill="#22B2F2" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Retention snapshot">
          <div className="flex flex-col items-center justify-center h-full gap-4 py-2">
            <CircularProgress value={87} size={120} strokeWidth={9} label="30-day retention" color="#8324F0" />
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
