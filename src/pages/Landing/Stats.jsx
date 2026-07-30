import { useCountUp } from "../../hooks/useCountUp";

const STATS = [
  { value: 28400, suffix: "+", label: "Wake-ups solved this month" },
  { value: 91, suffix: "%", label: "Users waking on target time" },
  { value: 54, suffix: "", label: "Coaches actively supporting users" },
  { value: 4, suffix: ".8/5", label: "Average app store rating" },
];

function Stat({ value, suffix, label }) {
  const animated = useCountUp(value);
  return (
    <div className="text-center">
      <p className="font-mono text-4xl md:text-5xl font-bold text-white">
        {animated.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-white/70">{label}</p>
    </div>
  );
}

export default function Stats() {
  return (
    <section id="stats" className="bg-brand-gradient">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 grid grid-cols-2 md:grid-cols-4 gap-8">
        {STATS.map((s) => (
          <Stat key={s.label} {...s} />
        ))}
      </div>
    </section>
  );
}
