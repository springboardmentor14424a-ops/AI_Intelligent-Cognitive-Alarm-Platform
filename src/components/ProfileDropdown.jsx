import { useState, useRef, useEffect } from "react";
import { FiUser, FiSettings, FiLogOut, FiChevronDown } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProfileDropdown({ name = "Aarav Mehta", role = "User" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogout() {
    logout();
    navigate("/select-role");
  }

  const initials = name.split(" ").map((n) => n[0]).join("");

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 p-1 pr-2.5 rounded-xl hover:bg-ink-100 dark:hover:bg-white/10 transition-colors"
      >
        <span className="w-8 h-8 rounded-full bg-brand-gradient text-white text-xs font-semibold flex items-center justify-center">
          {initials}
        </span>
        <span className="hidden sm:block text-sm text-left leading-tight">
          <span className="block font-medium">{name}</span>
          <span className="block text-xs text-ink-900/50 dark:text-white/40">{role}</span>
        </span>
        <FiChevronDown className="w-3.5 h-3.5 text-ink-900/40 dark:text-white/30" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 card p-1.5 z-50 animate-fadeUp">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-ink-50 dark:hover:bg-white/5 transition-colors">
            <FiUser className="w-4 h-4" /> Profile
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-ink-50 dark:hover:bg-white/5 transition-colors">
            <FiSettings className="w-4 h-4" /> Settings
          </button>
          <div className="my-1 border-t border-ink-100 dark:border-white/10" />
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
          >
            <FiLogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
