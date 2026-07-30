import { useState, useRef, useEffect } from "react";
import { FiBell } from "react-icons/fi";

const NOTIFICATIONS = [
  { id: 1, text: "Your wake-up streak hit 14 days", time: "10m ago" },
  { id: 2, text: "New cognitive challenge unlocked: Pattern Match", time: "1h ago" },
  { id: 3, text: "Coach Divya left feedback on your sleep report", time: "3h ago" },
  { id: 4, text: "Reminder: set tomorrow's alarm before 11 PM", time: "5h ago" },
];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-xl hover:bg-ink-100 dark:hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <FiBell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-violet-500 ring-2 ring-white dark:ring-ink-950" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 card p-2 z-50 animate-fadeUp">
          <div className="px-3 py-2 text-sm font-semibold border-b border-ink-100 dark:border-white/10">Notifications</div>
          <div className="max-h-72 overflow-y-auto">
            {NOTIFICATIONS.map((n) => (
              <div key={n.id} className="px-3 py-2.5 rounded-lg hover:bg-ink-50 dark:hover:bg-white/5 transition-colors">
                <p className="text-sm">{n.text}</p>
                <p className="text-xs text-ink-900/40 dark:text-white/30 mt-0.5">{n.time}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
