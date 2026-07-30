import { NavLink } from "react-router-dom";
import { FiX } from "react-icons/fi";
import Logo from "./Logo";

export default function MobileSidebar({ items, basePath, open, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-ink-950 border-r border-ink-100 dark:border-white/5 p-4 animate-fadeUp">
        <div className="flex items-center justify-between mb-6">
          <Logo size="sm" />
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-ink-100 dark:hover:bg-white/10" aria-label="Close menu">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <nav className="space-y-1">
          {items.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={`${basePath}${to}`}
              end={to === ""}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-gradient text-white shadow-glow"
                    : "text-ink-900/60 dark:text-white/50 hover:bg-ink-100 dark:hover:bg-white/5"
                }`
              }
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </div>
  );
}
