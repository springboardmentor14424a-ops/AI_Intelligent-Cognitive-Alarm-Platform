/**
 * columns: [{ key, header, render?(row) }]
 * rows: array of data objects
 */
export default function DataTable({ columns, rows, keyField = "id" }) {
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm min-w-[560px]">
        <thead>
          <tr className="text-left text-ink-900/50 dark:text-white/40 border-b border-ink-100 dark:border-white/10">
            {columns.map((col) => (
              <th key={col.key} className="px-2 py-3 font-medium whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[keyField]}
              className="border-b border-ink-50 dark:border-white/5 last:border-0 hover:bg-ink-50/70 dark:hover:bg-white/5 transition-colors"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-2 py-3 whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="text-center py-10 text-ink-900/40 dark:text-white/30 text-sm">
          Nothing here yet.
        </div>
      )}
    </div>
  );
}

export function StatusPill({ status }) {
  const map = {
    Active: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
    Paused: "bg-ink-100 text-ink-900/60 dark:bg-white/5 dark:text-white/50",
    Improving: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
    Stable: "bg-sky-50 text-sky-600 dark:bg-sky-500/10",
    "At Risk": "bg-rose-50 text-rose-600 dark:bg-rose-500/10",
    Passed: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
    Retry: "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
    High: "bg-rose-50 text-rose-600 dark:bg-rose-500/10",
    Medium: "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
    Low: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10",
    info: "bg-sky-50 text-sky-600 dark:bg-sky-500/10",
    warn: "bg-amber-50 text-amber-600 dark:bg-amber-500/10",
    error: "bg-rose-50 text-rose-600 dark:bg-rose-500/10",
  };
  return <span className={`pill ${map[status] || "bg-ink-100 text-ink-900/60"}`}>{status}</span>;
}
