export default function Logo({ size = "md", withLabel = true }) {
  const dims = size === "sm" ? "w-7 h-7" : size === "lg" ? "w-11 h-11" : "w-9 h-9";

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className={`relative ${dims} shrink-0`}>
        <span className="absolute inset-0 rounded-full bg-violet-500/40 animate-pulseRing" />
        <div className="relative w-full h-full rounded-full bg-brand-gradient flex items-center justify-center shadow-glow">
          <svg viewBox="0 0 24 24" className="w-1/2 h-1/2 text-white" fill="none">
            <path
              d="M12 3a1 1 0 0 1 1 1v1.06A7.002 7.002 0 0 1 19 12v3.586l1.707 1.707A1 1 0 0 1 20 19H4a1 1 0 0 1-.707-1.707L5 15.586V12a7.002 7.002 0 0 1 6-6.94V4a1 1 0 0 1 1-1Z"
              fill="currentColor"
            />
            <path d="M9.5 20.5a2.5 2.5 0 0 0 5 0h-5Z" fill="currentColor" />
          </svg>
        </div>
      </div>
      {withLabel && (
        <span className="font-display font-bold tracking-tight text-lg leading-none">
          Cogni<span className="text-violet-500">wake</span>
        </span>
      )}
    </div>
  );
}
