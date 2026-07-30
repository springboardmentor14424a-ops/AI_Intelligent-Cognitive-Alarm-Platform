import { FiHash, FiGrid, FiHelpCircle, FiCpu } from "react-icons/fi";
import ChartCard from "../../components/ChartCard";
import DataTable, { StatusPill } from "../../components/DataTable";
import { challengeHistory } from "../../data/alarms";

const CHALLENGE_TYPES = [
  { icon: FiHash, name: "Math Sprint", desc: "Quick arithmetic under time pressure.", mastery: 88 },
  { icon: FiGrid, name: "Memory Grid", desc: "Recall a flashed pattern of tiles.", mastery: 71 },
  { icon: FiHelpCircle, name: "Riddle", desc: "A short logic riddle with one answer.", mastery: 94 },
  { icon: FiCpu, name: "Logic Puzzle", desc: "Multi-step reasoning, no shortcuts.", mastery: 63 },
];

export default function CognitiveChallenges() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Cognitive challenges</h1>
        <p className="text-ink-900/60 dark:text-white/50 mt-1">The exercises standing between you and snoozing.</p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {CHALLENGE_TYPES.map(({ icon: Icon, name, desc, mastery }) => (
          <div key={name} className="card p-5">
            <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center text-white mb-4 shadow-glow">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-display font-semibold text-sm">{name}</h3>
            <p className="text-xs text-ink-900/50 dark:text-white/40 mt-1 mb-3">{desc}</p>
            <div className="flex items-center justify-between text-xs mb-1.5 text-ink-900/60 dark:text-white/50">
              <span>Mastery</span>
              <span className="font-mono">{mastery}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-ink-100 dark:bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${mastery}%` }} />
            </div>
          </div>
        ))}
      </div>

      <ChartCard title="Challenge history" subtitle="Every challenge you've completed recently">
        <DataTable
          columns={[
            { key: "date", header: "Date" },
            { key: "type", header: "Type" },
            { key: "difficulty", header: "Difficulty", render: (r) => <StatusPill status={r.difficulty} /> },
            { key: "accuracy", header: "Accuracy", render: (r) => `${r.accuracy}%` },
            { key: "timeTaken", header: "Time" },
            { key: "result", header: "Result", render: (r) => <StatusPill status={r.result} /> },
          ]}
          rows={challengeHistory}
        />
      </ChartCard>
    </div>
  );
}
