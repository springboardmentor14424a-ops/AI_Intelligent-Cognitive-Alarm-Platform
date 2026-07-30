import { FiDownload, FiFileText } from "react-icons/fi";
import ChartCard from "../../components/ChartCard";
import DataTable from "../../components/DataTable";

const REPORTS = [
  { id: "R-201", title: "Weekly cohort summary", period: "Jul 20 – Jul 26, 2026", generated: "2026-07-26" },
  { id: "R-200", title: "At-risk user watchlist", period: "Jul 13 – Jul 19, 2026", generated: "2026-07-19" },
  { id: "R-199", title: "Monthly habit score review", period: "June 2026", generated: "2026-07-01" },
  { id: "R-198", title: "Sleep hygiene compliance", period: "Jul 6 – Jul 12, 2026", generated: "2026-07-12" },
];

export default function CoachReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-ink-900/60 dark:text-white/50 mt-1">Generated summaries for your assigned cohort.</p>
        </div>
        <button className="btn-primary text-sm">
          <FiFileText className="w-4 h-4" /> Generate report
        </button>
      </div>

      <ChartCard title="Report history">
        <DataTable
          columns={[
            { key: "title", header: "Report" },
            { key: "period", header: "Period" },
            { key: "generated", header: "Generated" },
            {
              key: "actions",
              header: "",
              render: () => (
                <button className="flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline">
                  <FiDownload className="w-3.5 h-3.5" /> Download
                </button>
              ),
            },
          ]}
          rows={REPORTS}
        />
      </ChartCard>
    </div>
  );
}
