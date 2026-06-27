import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/auth";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { HelpPanel } from "./HelpPanel";

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
        <main
          className="flex-1 overflow-y-auto"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 55% at 100% 0%, rgba(22,163,74,0.055) 0%, transparent 60%)," +
              "radial-gradient(ellipse 55% 45% at 0% 100%, rgba(22,163,74,0.04) 0%, transparent 55%)",
          }}
        >
          <div className="max-w-[1200px] mx-auto px-8 py-6 animate-atlas-in">
            <Outlet />
          </div>
        </main>
      </div>
      <HelpPanel />
    </div>
  );
}
