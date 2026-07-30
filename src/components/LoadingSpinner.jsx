export default function LoadingSpinner({ label = "Loading" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink-900/50 dark:text-white/40">
      <div className="relative w-10 h-10">
        <span className="absolute inset-0 rounded-full border-2 border-ink-100 dark:border-white/10" />
        <span className="absolute inset-0 rounded-full border-2 border-t-violet-500 border-transparent animate-spin" />
      </div>
      <p className="text-sm">{label}…</p>
    </div>
  );
}
