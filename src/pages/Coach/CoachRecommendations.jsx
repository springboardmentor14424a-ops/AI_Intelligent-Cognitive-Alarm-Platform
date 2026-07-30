import { useState } from "react";
import { FiSend } from "react-icons/fi";
import ChartCard from "../../components/ChartCard";
import { assignedUsers } from "../../data/coach";

const TEMPLATES = [
  "Try moving lights-out 20 minutes earlier this week.",
  "Consider switching your morning challenge to Riddle for an easier restart.",
  "Great consistency — keep the same wind-down routine going.",
  "Your wake accuracy dipped on weekends; consider a softer weekend alarm.",
];

export default function CoachRecommendations() {
  const [selectedUser, setSelectedUser] = useState(assignedUsers[0].id);
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Recommendations</h1>
        <p className="text-ink-900/60 dark:text-white/50 mt-1">Send a nudge to a user based on their recent trends.</p>
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <ChartCard title="Compose recommendation" className="xl:col-span-2">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-ink-900/50 dark:text-white/40 mb-1.5 block">Send to</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="input-field text-sm"
              >
                {assignedUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-900/50 dark:text-white/40 mb-1.5 block">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Write a recommendation…"
                className="input-field text-sm resize-none"
              />
            </div>
            <button className="btn-primary text-sm">
              <FiSend className="w-4 h-4" /> Send recommendation
            </button>
          </div>
        </ChartCard>

        <ChartCard title="Quick templates">
          <div className="space-y-2">
            {TEMPLATES.map((t) => (
              <button
                key={t}
                onClick={() => setMessage(t)}
                className="w-full text-left text-sm p-3 rounded-xl border border-ink-100 dark:border-white/10 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
              >
                {t}
              </button>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
