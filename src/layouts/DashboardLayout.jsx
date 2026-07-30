import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import MobileSidebar from "../components/MobileSidebar";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/AuthContext";

/**
 * Guards a role's dashboard section: if the active role doesn't match
 * `requiredRole`, the user is redirected to role selection instead of
 * being able to view another role's dashboard directly.
 */
export default function DashboardLayout({ requiredRole, navItems, basePath, breadcrumbRoot, profileName }) {
  const { role } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (role !== requiredRole) {
    return <Navigate to="/select-role" replace />;
  }

  return (
    <div className="flex min-h-screen bg-ink-50 dark:bg-ink-950">
      <Sidebar items={navItems} basePath={basePath} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <MobileSidebar items={navItems} basePath={basePath} open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 min-w-0">
        <Topbar
          breadcrumb={[breadcrumbRoot, "Overview"]}
          profileName={profileName}
          profileRole={requiredRole}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="p-4 md:p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
