import { FiMail, FiCalendar, FiEdit2 } from "react-icons/fi";
import ChartCard from "../../components/ChartCard";
import ProgressBar from "../../components/ProgressBar";

export default function Profile() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-ink-900/60 dark:text-white/50 mt-1">Your account details and preferences.</p>
      </div>

      <div className="grid xl:grid-cols-3 gap-5">
        <div className="card p-6 flex flex-col items-center text-center">
          <span className="w-20 h-20 rounded-full bg-brand-gradient text-white text-2xl font-semibold flex items-center justify-center shadow-glow">
            AM
          </span>
          <h2 className="font-display font-semibold text-lg mt-4">Aarav Mehta</h2>
          <p className="text-sm text-ink-900/50 dark:text-white/40">User · Joined Feb 2026</p>
          <div className="mt-4 space-y-2 text-sm text-left w-full">
            <div className="flex items-center gap-2 text-ink-900/60 dark:text-white/50">
              <FiMail className="w-4 h-4" /> aarav.mehta@example.com
            </div>
            <div className="flex items-center gap-2 text-ink-900/60 dark:text-white/50">
              <FiCalendar className="w-4 h-4" /> Coached by Divya Krishnan
            </div>
          </div>
          <button className="btn-secondary w-full mt-5 text-sm">
            <FiEdit2 className="w-4 h-4" /> Edit profile
          </button>
        </div>

        <div className="xl:col-span-2 space-y-5">
          <ChartCard title="Preferences">
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-ink-900/50 dark:text-white/40 mb-1">Default challenge type</p>
                <p className="font-medium">Math Sprint</p>
              </div>
              <div>
                <p className="text-ink-900/50 dark:text-white/40 mb-1">Difficulty</p>
                <p className="font-medium">Adaptive (Medium baseline)</p>
              </div>
              <div>
                <p className="text-ink-900/50 dark:text-white/40 mb-1">Snooze policy</p>
                <p className="font-medium">Disabled after 2 attempts</p>
              </div>
              <div>
                <p className="text-ink-900/50 dark:text-white/40 mb-1">Timezone</p>
                <p className="font-medium">Asia/Kolkata (IST)</p>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Profile completeness">
            <div className="space-y-4">
              <ProgressBar value={90} label="Account setup" />
              <ProgressBar value={65} label="Sleep goals configured" />
              <ProgressBar value={40} label="Coach check-in history" />
            </div>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
