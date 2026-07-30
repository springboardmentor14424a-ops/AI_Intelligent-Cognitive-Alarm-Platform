import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const TODAY = 26; // fixed for demo purposes (July 26, 2026)
const MARKED = [3, 9, 14, 22, 26, 30];

export default function CalendarWidget() {
  const firstWeekday = 3; // Wednesday July 1, 2026 for demo grid
  const daysInMonth = 31;
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-sm">July 2026</h3>
        <div className="flex gap-1">
          <button className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-white/10 transition-colors" aria-label="Previous month">
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-white/10 transition-colors" aria-label="Next month">
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-900/40 dark:text-white/30 mb-2">
        {DAYS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`relative aspect-square flex items-center justify-center rounded-lg
              ${day === TODAY ? "bg-brand-gradient text-white font-semibold" : "hover:bg-ink-100 dark:hover:bg-white/10"}
              ${day === null ? "invisible" : ""}
            `}
          >
            {day}
            {day && MARKED.includes(day) && day !== TODAY && (
              <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-violet-500" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
