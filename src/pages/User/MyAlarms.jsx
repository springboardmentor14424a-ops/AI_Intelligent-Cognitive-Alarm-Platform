import { useState } from "react";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import ChartCard from "../../components/ChartCard";
import DataTable, { StatusPill } from "../../components/DataTable";
import { upcomingAlarms } from "../../data/alarms";

export default function MyAlarms() {
  const [alarms, setAlarms] = useState(upcomingAlarms);

  function toggleStatus(id) {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: a.status === "Active" ? "Paused" : "Active" } : a))
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">My alarms</h1>
          <p className="text-ink-900/60 dark:text-white/50 mt-1">Manage when Cogniwake wakes you, and with which challenge.</p>
        </div>
        <button className="btn-primary text-sm">
          <FiPlus className="w-4 h-4" /> New alarm
        </button>
      </div>

      <ChartCard title="All alarms" subtitle={`${alarms.length} configured`}>
        <DataTable
          columns={[
            { key: "label", header: "Label" },
            { key: "time", header: "Time" },
            { key: "days", header: "Repeats" },
            { key: "challenge", header: "Challenge" },
            { key: "difficulty", header: "Difficulty" },
            {
              key: "status",
              header: "Status",
              render: (r) => (
                <button onClick={() => toggleStatus(r.id)}>
                  <StatusPill status={r.status} />
                </button>
              ),
            },
            {
              key: "actions",
              header: "",
              render: () => (
                <div className="flex gap-2 text-ink-900/40 dark:text-white/30">
                  <button className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-white/10 hover:text-violet-500" aria-label="Edit alarm">
                    <FiEdit2 className="w-4 h-4" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-white/10 hover:text-rose-500" aria-label="Delete alarm">
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              ),
            },
          ]}
          rows={alarms}
        />
      </ChartCard>
    </div>
  );
}
