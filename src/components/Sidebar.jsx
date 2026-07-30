import { NavLink } from "react-router-dom";
import { FiChevronsLeft, FiChevronsRight } from "react-icons/fi";
import Logo from "./Logo";

export default function Sidebar({ items, basePath, collapsed, onToggle }) {
  return (
    <aside
      className={`hidden lg:flex flex-col shrink-0 h-screen sticky top-0 border-r border-ink-100 dark:border-white/5 bg-white/70 dark:bg-ink-950/70 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? "w-[76px]" : "w-64"
      }`}
    >
      <div className="h-16 flex items-center px-4 border-b border-ink-100 dark:border-white/5">
        {collapsed ? <Logo withLabel={false} size="sm" /> : <Logo size="sm" />}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {items.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={`${basePath}${to}`}
            end={to === ""}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group ${
                isActive
                  ? "bg-brand-gradient text-white shadow-glow"
                  : "text-ink-900/60 dark:text-white/50 hover:bg-ink-100 dark:hover:bg-white/5 hover:text-ink-900 dark:hover:text-white"
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={onToggle}
        className="m-3 flex items-center justify-center gap-2 py-2 rounded-xl text-ink-900/50 dark:text-white/40 hover:bg-ink-100 dark:hover:bg-white/5 transition-colors text-sm"
      >
        {collapsed ? <FiChevronsRight className="w-4 h-4" /> : (
          <>
            <FiChevronsLeft className="w-4 h-4" /> Collapse
          </>
        )}
      </button>
    </aside>
  );
}
