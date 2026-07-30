const TESTIMONIALS = [
  {
    quote: "I used to hit snooze for an hour. The riddle actually makes me think before I can go back to sleep.",
    name: "Ananya Sharma",
    role: "Product designer",
  },
  {
    quote: "As a coach I can spot a slipping habit score days before the person notices it themselves.",
    name: "Divya Krishnan",
    role: "Wellness Coach",
  },
  {
    quote: "The sleep analytics finally showed me the real reason my Mondays felt so rough.",
    name: "Karthik Rao",
    role: "Software engineer",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="max-w-7xl mx-auto px-4 md:px-6 py-24">
      <div className="max-w-2xl mb-14">
        <span className="pill bg-violet-50 text-violet-600 dark:bg-violet-500/10 mb-4">Stories</span>
        <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">People wake up differently now</h2>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="card p-6 flex flex-col justify-between">
            <p className="text-ink-900/80 dark:text-white/70 leading-relaxed">"{t.quote}"</p>
            <div className="mt-6 flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-brand-gradient text-white text-xs font-semibold flex items-center justify-center">
                {t.name.split(" ").map((n) => n[0]).join("")}
              </span>
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-ink-900/50 dark:text-white/40">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
