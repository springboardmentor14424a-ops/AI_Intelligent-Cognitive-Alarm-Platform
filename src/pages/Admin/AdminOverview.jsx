import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { FiUsers, FiActivity, FiClock, FiHeart } from "react-icons/fi";
import StatCard from "../../components/StatCard";
import ChartCard from "../../components/ChartCard";
import DataTable, { StatusPill } from "../../components/DataTable";
import { dailyActiveUsers, alarmUsage, roleDistribution, platformLogs, systemHealth } from "../../data/admin";
import { recentRegistrations } from "../../data/users";

const PIE_COLORS = ["#5B5CF6", "#8324F0", "#22B2F2"];

export default function AdminOverview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Platform overview</h1>
        <p className="text-ink-900/60 dark:text-white/50 mt-1">System-wide health and activity for Cogniwake.</p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={FiUsers} label="Total users" value={1138} accent="indigo" trend={{ direction: "up", label: "+42 this month" }} />
        <StatCard icon={FiActivity} label="Active users today" value={480} accent="violet" trend={{ direction: "up", label: "+6%" }} />
        <StatCard icon={FiClock} label="Today's alarms" value={710} accent="sky" trend={{ direction: "flat", label: "on pace" }} />
        <StatCard icon={FiHeart} label="System health" value={99} suffix=".98%" accent="indigo" trend={{ direction: "up", label: "uptime" }} />
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <ChartCard title="Daily active users" subtitle="Last 7 days" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyActiveUsers}>
              <defs>
                <linearGradient id="dauFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5B5CF6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#5B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-ink-100 dark:text-white/5" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
              <Area type="monotone" dataKey="users" stroke="#5B5CF6" strokeWidth={2.5} fill="url(#dauFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Role distribution" subtitle="All registered accounts">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={roleDistribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                {roleDistribution.map((entry, i) => (
                  <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Alarm usage" subtitle="Total alarms triggered per day">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={alarmUsage}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-ink-100 dark:text-white/5" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#8b87a8" }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
            <Bar dataKey="alarms" fill="#8324F0" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid xl:grid-cols-3 gap-5">
        <ChartCard title="Recent registrations" className="xl:col-span-2">
          <DataTable
            columns={[
              { key: "name", header: "Name" },
              { key: "role", header: "Role" },
              { key: "joined", header: "Joined" },
            ]}
            rows={recentRegistrations}
          />
        </ChartCard>

        <ChartCard title="Platform logs">
          <DataTable
            columns={[
              { key: "event", header: "Event" },
              { key: "level", header: "Level", render: (r) => <StatusPill status={r.level} /> },
            ]}
            rows={platformLogs.slice(0, 5)}
          />
        </ChartCard>
      </div>
    </div>
  );
}
