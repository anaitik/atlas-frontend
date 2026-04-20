import { useAuthStore } from "../../store/auth";
import { useWorkspaceStore } from "../../store/workspace";
import { useLocation } from "react-router-dom";

/**
 * TopBar — Persistent context bar showing Entity, Period, Stage, Search, and actions.
 * Replaces the unused dark glass top bar.
 */
export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const { activeWorkspaceId, activeCompanyName, activeWorkspaceName } = useWorkspaceStore();
  const location = useLocation();

  // Determine current stage from URL
  const getStageLabel = () => {
    const path = location.pathname;
    if (path.includes("/extraction")) return "Collection";
    if (path.includes("/review")) return "In-Review";
    if (path.includes("/metrics")) return "Metrics";
    if (path.includes("/report")) return "Reporting";
    if (path.includes("/admin")) return "Administration";
    return "Overview";
  };

  const stage = getStageLabel();
  const isAdmin = user?.role === "system_admin";

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
      {/* ── Left: Context breadcrumb ──────────────── */}
      <div className="flex items-center gap-2 text-[13px]">
        {isAdmin ? (
          <span className="font-semibold text-text-primary">Atlas Admin</span>
        ) : activeWorkspaceId ? (
          <>
            <span className="text-text-secondary font-medium">Entity:</span>
            <span className="font-semibold text-text-primary">{activeCompanyName || "Atlas Entity"}</span>
            <span className="text-border mx-1.5">·</span>
            <span className="text-text-secondary font-medium">Period:</span>
            <span className="font-semibold text-text-primary">{activeWorkspaceName || "Current Period"}</span>
            <span className="text-border mx-1.5">·</span>
            <span className="text-text-secondary font-medium">Stage:</span>
            <span className={`font-semibold ${
              stage === "In-Review" ? "text-atlas-600 underline underline-offset-4 decoration-atlas-400" : "text-text-primary"
            }`}>
              {stage}
            </span>
          </>
        ) : (
          <span className="font-semibold text-text-primary">Atlas</span>
        )}
      </div>

      {/* ── Center: Search ────────────────────────── */}
      <div className="relative hidden md:block">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-muted text-[18px]">
          search
        </span>
        <input
          type="text"
          placeholder="Search data points..."
          className="pl-9 pr-4 py-1.5 w-64 bg-surface-secondary border border-border rounded-lg text-[13px] text-text-primary
          placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-atlas-500/20 focus:border-atlas-500/50 transition-all"
          id="global-search"
        />
      </div>

      {/* ── Right: Actions ────────────────────────── */}
      <div className="flex items-center gap-1.5">
        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-surface-secondary transition-colors"
          id="btn-notifications"
        >
          <span className="material-symbols-outlined text-text-secondary text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger"></span>
        </button>

        {/* User avatar */}
        <button
          className="p-2 rounded-lg hover:bg-surface-secondary transition-colors"
          id="btn-user-menu"
        >
          <div className="w-7 h-7 rounded-full bg-atlas-600 flex items-center justify-center text-[11px] font-bold text-white">
            {user?.full_name?.charAt(0) ?? "U"}
          </div>
        </button>

        {/* Export Report CTA */}
        {!isAdmin && activeWorkspaceId && (
          <button
            className="ml-2 px-4 py-1.5 bg-atlas-900 hover:bg-atlas-800 text-white text-[12px] font-semibold rounded-lg transition-colors shadow-sm"
            id="btn-export-report"
          >
            Export Report
          </button>
        )}
      </div>
    </header>
  );
}
