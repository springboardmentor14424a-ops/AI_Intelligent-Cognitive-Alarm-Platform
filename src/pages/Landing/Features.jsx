import { FiActivity, FiTarget, FiMoon, FiTrendingUp, FiShield, FiUsers } from "react-icons/fi";

const FEATURES = [
  {
    icon: FiTarget,
    title: "Adaptive challenges",
    desc: "Math sprints, memory grids, riddles and logic puzzles that get harder as your streak grows.",
  },
  {
    icon: FiMoon,
    title: "Sleep analytics",
    desc: "See how bedtime, duration and consistency actually connect to how well you wake up.",
  },
  {
    icon: FiTrendingUp,
    title: "Habit scoring",
    desc: "A single score that blends wake accuracy, challenge performance and consistency over time.",
  },
  {
    icon: FiUsers,
    title: "Wellness coaching",
    desc: "Opt in to a coach who can see your trends and nudge you before a habit slips.",
  },
  {
    icon: FiActivity,
    title: "Live dashboards",
    desc: "Role-based dashboards for individuals, coaches and admins, each tuned to what they need.",
  },
  {
    icon: FiShield,
    title: "Private by design",
    desc: "Your sleep and performance data stays under your account, visible only to who you choose.",
  },
];

export default function Features() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-4 md:px-6 py-24">
      <div className="max-w-2xl mb-14">
        <span className="pill bg-sky-50 text-sky-600 dark:bg-sky-500/10 mb-4">Features</span>
        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
          Everything a wake-up needs to actually work
        </h2>
        <p className="mt-4 text-ink-900/60 dark:text-white/50">
          Built around one idea: the alarm shouldn't just make noise, it should make sure you're awake.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map(({ icon: Icon, title, desc }, i) => (
          <div key={title} className="card p-6 hover:-translate-y-1 hover:shadow-glow transition-all duration-300" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="w-11 h-11 rounded-xl bg-brand-gradient flex items-center justify-center text-white mb-4 shadow-glow">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-display font-semibold mb-1.5">{title}</h3>
            <p className="text-sm text-ink-900/60 dark:text-white/50 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
