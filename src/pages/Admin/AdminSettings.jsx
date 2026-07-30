import { useState } from "react";
import ChartCard from "../../components/ChartCard";

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-brand-gradient" : "bg-ink-100 dark:bg-white/10"}`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`}
      />
    </button>
  );
}

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    newSignups: true,
    coachApprovalRequired: true,
    weeklyDigest: true,
  });

  function toggle(key) {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  }

  const rows = [
    { key: "maintenanceMode", label: "Maintenance mode", desc: "Temporarily block sign-ins for scheduled maintenance." },
    { key: "newSignups", label: "Allow new sign-ups", desc: "Let new users create accounts on the platform." },
    { key: "coachApprovalRequired", label: "Require coach approval", desc: "New wellness coach accounts must be manually approved." },
    { key: "weeklyDigest", label: "Weekly digest email", desc: "Send a weekly summary email to all admins." },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-ink-900/60 dark:text-white/50 mt-1">Platform-wide configuration.</p>
      </div>

      <ChartCard title="General">
        <div className="divide-y divide-ink-100 dark:divide-white/10">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-ink-900/50 dark:text-white/40 mt-0.5">{r.desc}</p>
              </div>
              <Toggle checked={settings[r.key]} onChange={() => toggle(r.key)} />
            </div>
          ))}
        </div>
      </ChartCard>

      <ChartCard title="Danger zone">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-medium">Reset all demo data</p>
            <p className="text-xs text-ink-900/50 dark:text-white/40 mt-0.5">Restores the dashboard to its default sample dataset.</p>
          </div>
          <button className="btn-secondary text-sm border-rose-200 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10">
            Reset data
          </button>
        </div>
      </ChartCard>
    </div>
  );
}
