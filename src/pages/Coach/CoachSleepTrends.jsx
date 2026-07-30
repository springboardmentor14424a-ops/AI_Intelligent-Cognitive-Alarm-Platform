import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import ChartCard from "../../components/ChartCard";
import { sleepTrends, wakeSuccess } from "../../data/coach";

export default function CoachSleepTrends() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Sleep trends</h1>
        <p className="text-ink-900/60 dark:text-white/50 mt-1">Aggregate sleep patterns across all assigned users.</p>
      </div>

      <ChartCard title="Average sleep hours" subtitle="Across all assigned users, by week">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={sleepTrends}>
            <defs>
              <linearGradient id="trendsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5B5CF6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#5B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-ink-100 dark:text-white/5" />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} domain={[6, 8]} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
            <Area type="monotone" dataKey="avgHours" stroke="#5B5CF6" strokeWidth={2.5} fill="url(#trendsFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Wake-up success rate" subtitle="Share of users waking within target window, by day">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={wakeSuccess}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-ink-100 dark:text-white/5" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} domain={[0, 100]} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
            <Bar dataKey="success" fill="#22B2F2" radius={[6, 6, 0, 0]} name="Success %" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
