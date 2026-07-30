import { useState } from "react";
import { FiSearch, FiUserPlus } from "react-icons/fi";
import ChartCard from "../../components/ChartCard";
import DataTable, { StatusPill } from "../../components/DataTable";
import { users } from "../../data/users";

const ROLES = ["All", "User", "Coach", "Admin"];

export default function AdminUsers() {
  const [role, setRole] = useState("All");
  const [query, setQuery] = useState("");

  const filtered = users.filter((u) => {
    const matchesRole = role === "All" || u.role === role;
    const matchesQuery = u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase());
    return matchesRole && matchesQuery;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-ink-900/60 dark:text-white/50 mt-1">All accounts across every role on the platform.</p>
        </div>
        <button className="btn-primary text-sm">
          <FiUserPlus className="w-4 h-4" /> Invite user
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-900/30 dark:text-white/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="input-field pl-9 text-sm"
          />
        </div>
        <div className="flex gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`pill border ${role === r ? "bg-brand-gradient text-white border-transparent" : "border-ink-100 dark:border-white/10 text-ink-900/60 dark:text-white/50"}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <ChartCard title="All accounts" subtitle={`${filtered.length} of ${users.length} shown`}>
        <DataTable
          columns={[
            { key: "id", header: "ID" },
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "role", header: "Role" },
            { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} /> },
            { key: "joined", header: "Joined" },
          ]}
          rows={filtered}
        />
      </ChartCard>
    </div>
  );
}
