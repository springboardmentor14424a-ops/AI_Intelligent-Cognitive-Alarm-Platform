import { Link } from "react-router-dom";
import { FiArrowRight, FiZap } from "react-icons/fi";

export default function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-aurora">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-20 pb-24 md:pt-28 md:pb-32 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="pill bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300 mb-6">
            <FiZap className="w-3.5 h-3.5" /> Wake smarter, not just louder
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">
            An alarm that
            <br />
            <span className="bg-clip-text text-transparent bg-brand-gradient">wakes your brain</span>
            <br />
            before your day does.
          </h1>
          <p className="mt-6 text-lg text-ink-900/60 dark:text-white/50 max-w-lg">
            Cogniwake replaces the snooze button with a short cognitive challenge — a math sprint, a memory grid,
            a riddle — so you're actually awake by the time you silence it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link to="/select-role" className="btn-primary">
              Get started free <FiArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className="btn-secondary">
              See how it works
            </a>
          </div>
          <div className="mt-10 flex items-center gap-6 text-sm text-ink-900/50 dark:text-white/40">
            <div>
              <span className="font-mono text-xl font-semibold text-ink-900 dark:text-white">28k+</span> wake-ups solved
            </div>
            <div className="h-8 w-px bg-ink-100 dark:bg-white/10" />
            <div>
              <span className="font-mono text-xl font-semibold text-ink-900 dark:text-white">4.8/5</span> average rating
            </div>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="relative w-full max-w-sm aspect-square rounded-[2.5rem] card p-6 animate-floatSlow">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-ink-900/40 dark:text-white/30">Weekday Wake-up</p>
                <p className="font-mono text-4xl font-semibold">06:15</p>
              </div>
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full rounded-full bg-violet-500 opacity-60 animate-pulseRing" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500" />
              </span>
            </div>
            <div className="rounded-2xl bg-ink-50 dark:bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-ink-900/40 dark:text-white/30 mb-2">Solve to dismiss</p>
              <p className="font-display font-semibold text-lg leading-snug">
                17 × 3 − 8 = ?
              </p>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {["43", "51", "38"].map((n) => (
                  <button
                    key={n}
                    className="rounded-xl border border-ink-100 dark:border-white/10 py-2 font-mono text-sm hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between text-xs text-ink-900/50 dark:text-white/40">
              <span>Habit streak</span>
              <span className="font-mono font-semibold text-ink-900 dark:text-white">14 days</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
