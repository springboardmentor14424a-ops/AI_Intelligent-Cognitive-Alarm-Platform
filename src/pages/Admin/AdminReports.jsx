import { FiDownload, FiFileText } from "react-icons/fi";
import ChartCard from "../../components/ChartCard";
import DataTable from "../../components/DataTable";

const REPORTS = [
  { id: "PR-410", title: "Monthly platform health", period: "June 2026", generated: "2026-07-01" },
  { id: "PR-409", title: "User growth & churn", period: "Q2 2026", generated: "2026-07-05" },
  { id: "PR-408", title: "Coach performance summary", period: "June 2026", generated: "2026-07-02" },
  { id: "PR-407", title: "System uptime & incidents", period: "June 2026", generated: "2026-07-01" },
];

export default function AdminReports() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-ink-900/60 dark:text-white/50 mt-1">Platform-wide reporting for stakeholders.</p>
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
