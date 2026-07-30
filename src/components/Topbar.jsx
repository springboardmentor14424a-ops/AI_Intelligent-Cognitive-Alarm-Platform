import { FiMenu, FiSun, FiMoon } from "react-icons/fi";
import Breadcrumb from "./Breadcrumb";
import SearchBar from "./SearchBar";
import NotificationBell from "./NotificationBell";
import ProfileDropdown from "./ProfileDropdown";
import { useTheme } from "../context/ThemeContext";

export default function Topbar({ breadcrumb, profileName, profileRole, onMenuClick }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 sticky top-0 z-30 flex items-center gap-4 px-4 md:px-6 border-b border-ink-100 dark:border-white/5 bg-white/70 dark:bg-ink-950/70 backdrop-blur-xl">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-ink-100 dark:hover:bg-white/10"
        aria-label="Open menu"
      >
        <FiMenu className="w-5 h-5" />
      </button>

      <div className="hidden lg:block">
        <Breadcrumb items={breadcrumb} />
      </div>

      <div className="flex-1 flex justify-end lg:justify-center">
        <SearchBar />
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl hover:bg-ink-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? <FiSun className="w-5 h-5" /> : <FiMoon className="w-5 h-5" />}
        </button>
        <NotificationBell />
        <div className="hidden sm:block h-6 w-px bg-ink-100 dark:bg-white/10 mx-1" />
        <ProfileDropdown name={profileName} role={profileRole} />
      </div>
    </header>
  );
}
