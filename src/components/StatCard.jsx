import { useCountUp } from "../hooks/useCountUp";

/**
 * value: numeric target value to animate to
 * suffix: e.g. "%" appended after the animated number
 * trend: { direction: "up" | "down" | "flat", label: string }
 */
export default function StatCard({ icon: Icon, label, value, suffix = "", trend, accent = "indigo" }) {
  const animated = useCountUp(value);

  const accents = {
    indigo: "from-indigo-500 to-indigo-600",
    violet: "from-violet-500 to-violet-600",
    sky: "from-sky-400 to-sky-500",
  };

  const trendColor =
    trend?.direction === "up"
      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10"
      : trend?.direction === "down"
      ? "text-rose-600 bg-rose-50 dark:bg-rose-500/10"
      : "text-ink-900/50 bg-ink-100 dark:bg-white/5 dark:text-white/50";

  return (
    <div className="card p-5 flex flex-col gap-4 animate-fadeUp">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${accents[accent]} flex items-center justify-center text-white shadow-glow`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        {trend && (
          <span className={`pill ${trendColor}`}>
            {trend.direction === "up" ? "▲" : trend.direction === "down" ? "▼" : "→"} {trend.label}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm text-ink-900/60 dark:text-white/50">{label}</p>
        <p className="font-mono text-3xl font-semibold tracking-tight mt-1">
          {animated}
          <span className="text-lg text-ink-900/40 dark:text-white/40">{suffix}</span>
        </p>
      </div>
    </div>
  );
}
