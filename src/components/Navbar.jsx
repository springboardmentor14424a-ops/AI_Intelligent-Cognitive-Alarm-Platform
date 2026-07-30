import { useState } from "react";
import { Link } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import Logo from "./Logo";

const LINKS = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Dashboard", to: "/select-role" },
  { label: "Login", to: "/select-role" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/70 dark:bg-ink-950/70 backdrop-blur-xl border-b border-ink-100 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link to="/">
          <Logo />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ink-900/70 dark:text-white/60">
          {LINKS.slice(0, 2).map((link) => (
            <a key={link.label} href={link.href} className="hover:text-ink-900 dark:hover:text-white transition-colors">
              {link.label}
            </a>
          ))}
          <Link to="/select-role" className="hover:text-ink-900 dark:hover:text-white transition-colors">
            Dashboard
          </Link>
        </nav>

        <div className="hidden md:block">
          <Link to="/select-role" className="btn-primary text-sm px-4 py-2">
            Log in
          </Link>
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-3 text-sm font-medium">
          <a href="#home" onClick={() => setOpen(false)}>Home</a>
          <a href="#features" onClick={() => setOpen(false)}>Features</a>
          <Link to="/select-role" onClick={() => setOpen(false)}>Dashboard</Link>
          <Link to="/select-role" onClick={() => setOpen(false)} className="btn-primary justify-center">Log in</Link>
        </div>
      )}
    </header>
  );
}
