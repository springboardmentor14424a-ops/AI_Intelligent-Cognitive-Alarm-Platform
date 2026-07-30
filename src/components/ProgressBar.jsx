export default function ProgressBar({ value, label, color = "bg-brand-gradient" }) {
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between text-xs mb-1.5 text-ink-900/60 dark:text-white/50">
          <span>{label}</span>
          <span className="font-mono">{value}%</span>
        </div>
      )}
      <div className="w-full h-2 rounded-full bg-ink-100 dark:bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-[width] duration-700 ease-out`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}
