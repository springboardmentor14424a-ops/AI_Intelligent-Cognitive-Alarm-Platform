import { useState } from "react";
import { FiTrendingUp, FiTrendingDown, FiMinus, FiMessageSquare } from "react-icons/fi";
import ChartCard from "../../components/ChartCard";
import DataTable, { StatusPill } from "../../components/DataTable";
import { assignedUsers } from "../../data/coach";

const TREND_ICON = { up: FiTrendingUp, down: FiTrendingDown, flat: FiMinus };
const TREND_COLOR = { up: "text-emerald-500", down: "text-rose-500", flat: "text-ink-900/40 dark:text-white/30" };

export default function CoachUsers() {
  const [filter, setFilter] = useState("All");
  const filtered = filter === "All" ? assignedUsers : assignedUsers.filter((u) => u.risk === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-ink-900/60 dark:text-white/50 mt-1">Everyone currently assigned to your coaching queue.</p>
        </div>
        <div className="flex gap-2">
          {["All", "Low", "Medium", "High"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`pill border ${filter === f ? "bg-brand-gradient text-white border-transparent" : "border-ink-100 dark:border-white/10 text-ink-900/60 dark:text-white/50"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <ChartCard title="Assigned users" subtitle={`${filtered.length} shown`}>
        <DataTable
          columns={[
            { key: "name", header: "Name" },
            { key: "habitScore", header: "Habit score" },
            { key: "sleepAvg", header: "Sleep avg." },
            {
              key: "trend",
              header: "Trend",
              render: (r) => {
                const Icon = TREND_ICON[r.trend];
                return <Icon className={`w-4 h-4 ${TREND_COLOR[r.trend]}`} />;
              },
            },
            { key: "risk", header: "Risk", render: (r) => <StatusPill status={r.risk} /> },
            {
              key: "actions",
              header: "",
              render: () => (
                <button className="flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline">
                  <FiMessageSquare className="w-3.5 h-3.5" /> Message
                </button>
              ),
            },
          ]}
          rows={filtered}
        />
      </ChartCard>
    </div>
  );
}
