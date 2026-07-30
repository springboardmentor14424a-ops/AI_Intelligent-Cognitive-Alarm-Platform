import { useNavigate, Link } from "react-router-dom";
import { FiUser, FiShield, FiArrowRight } from "react-icons/fi";
import { GiHealthNormal } from "react-icons/gi";
import Logo from "../../components/Logo";
import { useAuth } from "../../context/AuthContext";

const ROLES = [
  {
    key: "User",
    icon: FiUser,
    title: "User",
    desc: "Track your alarms, habit score and sleep analytics day to day.",
    path: "/user",
  },
  {
    key: "Coach",
    icon: GiHealthNormal,
    title: "Wellness Coach",
    desc: "Monitor assigned users, spot at-risk habits and send recommendations.",
    path: "/coach",
  },
  {
    key: "Admin",
    icon: FiShield,
    title: "Administrator",
    desc: "Oversee platform-wide analytics, users and system health.",
    path: "/admin",
  },
];

export default function RoleSelection() {
  const navigate = useNavigate();
  const { selectRole } = useAuth();

  function handleSelect(role, path) {
    selectRole(role);
    navigate(path);
  }

  return (
    <div className="min-h-screen bg-aurora flex flex-col">
      <header className="max-w-7xl mx-auto w-full px-4 md:px-6 h-16 flex items-center">
        <Link to="/">
          <Logo />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Continue as…</h1>
            <p className="mt-3 text-ink-900/60 dark:text-white/50">
              Choose the role you want to sign in with. Each leads to its own dashboard.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {ROLES.map(({ key, icon: Icon, title, desc, path }, i) => (
              <button
                key={key}
                onClick={() => handleSelect(key, path)}
                className="card p-7 text-left hover:-translate-y-1.5 hover:shadow-glow transition-all duration-300 group animate-fadeUp"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center text-white mb-5 shadow-glow group-hover:scale-105 transition-transform">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
                <p className="text-sm text-ink-900/60 dark:text-white/50 leading-relaxed mb-5">{desc}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 dark:text-violet-400">
                  Continue <FiArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
