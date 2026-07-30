import { FiSunrise, FiWind, FiDroplet } from "react-icons/fi";

export default function WeatherWidget() {
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-sky-400/20 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-ink-900/50 dark:text-white/40">Wake-up weather</p>
          <p className="font-mono text-3xl font-semibold mt-1">24°C</p>
          <p className="text-sm text-ink-900/60 dark:text-white/50 mt-0.5">Clear skies · Bengaluru</p>
        </div>
        <FiSunrise className="w-9 h-9 text-amber-400 animate-floatSlow" />
      </div>
      <div className="relative grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-ink-100 dark:border-white/10 text-sm">
        <div className="flex items-center gap-2 text-ink-900/60 dark:text-white/50">
          <FiWind className="w-4 h-4" /> 9 km/h
        </div>
        <div className="flex items-center gap-2 text-ink-900/60 dark:text-white/50">
          <FiDroplet className="w-4 h-4" /> 54%
        </div>
      </div>
    </div>
  );
}
