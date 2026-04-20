import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-page-bg">
      {/* ── Deep-green sidebar ──────────────────────── */}
      <Sidebar />

      {/* ── Main content area ───────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto px-8 py-6 animate-atlas-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
