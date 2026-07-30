export default function ChartCard({ title, subtitle, action, children, className = "" }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-ink-900/50 dark:text-white/40 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
