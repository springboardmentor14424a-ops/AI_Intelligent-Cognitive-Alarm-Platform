import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from "recharts";
import ChartCard from "../../components/ChartCard";
import CircularProgress from "../../components/CircularProgress";
import ProgressBar from "../../components/ProgressBar";

const HABIT_DIMENSIONS = [
  { subject: "Wake time", score: 88 },
  { subject: "Consistency", score: 74 },
  { subject: "Challenge speed", score: 65 },
  { subject: "Accuracy", score: 82 },
  { subject: "Sleep hygiene", score: 70 },
  { subject: "Recovery", score: 79 },
];

const MILESTONES = [
  { label: "7-day streak", value: 100 },
  { label: "14-day streak", value: 100 },
  { label: "30-day streak", value: 47 },
  { label: "Perfect week (5/5)", value: 80 },
];

export default function HabitTracker() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Habit tracker</h1>
        <p className="text-ink-900/60 dark:text-white/50 mt-1">A breakdown of what's driving your overall habit score.</p>
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <ChartCard title="Habit score composition" subtitle="Six factors, scored 0–100" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={HABIT_DIMENSIONS}>
              <PolarGrid stroke="#EFEFFA" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fill: "#8b87a8" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="score" stroke="#8324F0" fill="#9B4DFF" fillOpacity={0.35} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EFEFFA", fontSize: 13 }} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Overall score">
          <div className="flex flex-col items-center justify-center h-full py-4">
            <CircularProgress value={82} size={140} strokeWidth={10} label="Habit score" />
            <p className="text-sm text-ink-900/50 dark:text-white/40 mt-4 text-center">
              Up 4 points from last week — your best month yet.
            </p>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Milestones">
        <div className="space-y-5">
          {MILESTONES.map((m) => (
            <ProgressBar key={m.label} value={m.value} label={m.label} />
          ))}
        </div>
      </ChartCard>
    </div>
  );
}
