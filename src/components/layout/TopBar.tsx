import { useAuthStore } from "../../store/auth";
import { useWorkspaceStore } from "../../store/workspace";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * TopBar - Persistent context bar showing entity/period/stage.
 */
export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const { activeWorkspaceId, activeCompanyName, activeWorkspaceName } = useWorkspaceStore();
  const location = useLocation();
  const navigate = useNavigate();

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
      <div className="flex items-center gap-2 text-[13px]">
        {isAdmin ? (
          <span className="font-semibold text-text-primary">Atlas Admin</span>
        ) : activeWorkspaceId ? (
          <>
            <span className="text-text-secondary font-medium">Entity:</span>
            <span className="font-semibold text-text-primary">{activeCompanyName || "Atlas Entity"}</span>
            <span className="text-border mx-1.5">.</span>
            <span className="text-text-secondary font-medium">Period:</span>
            <span className="font-semibold text-text-primary">{activeWorkspaceName || "Current Period"}</span>
            <span className="text-border mx-1.5">.</span>
            <span className="text-text-secondary font-medium">Stage:</span>
            <span
              className={`font-semibold ${
                stage === "In-Review" ? "text-atlas-600 underline underline-offset-4 decoration-atlas-400" : "text-text-primary"
              }`}
            >
              {stage}
            </span>
          </>
        ) : (
          <span className="font-semibold text-text-primary">Atlas</span>
        )}
      </div>

      <div className="hidden md:block text-[11px] text-text-muted font-medium">
        Traceable metrics. Verifiable reports.
      </div>

      <div className="flex items-center gap-1.5">
        <button
          className="relative p-2 rounded-lg transition-colors opacity-60 cursor-not-allowed"
          id="btn-notifications"
          title="Notifications are coming soon"
          disabled
        >
          <span className="material-symbols-outlined text-text-secondary text-[20px]">notifications</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger"></span>
        </button>

        <button className="p-2 rounded-lg hover:bg-surface-secondary transition-colors" id="btn-user-menu" title={user?.full_name || "Current user"}>
          <div className="w-7 h-7 rounded-full bg-atlas-600 flex items-center justify-center text-[11px] font-bold text-white">
            {user?.full_name?.charAt(0) ?? "U"}
          </div>
        </button>

        {!isAdmin && activeWorkspaceId && (
          <button
            className="ml-2 px-4 py-1.5 bg-atlas-900 hover:bg-atlas-800 text-white text-[12px] font-semibold rounded-lg transition-colors shadow-sm"
            id="btn-export-report"
            onClick={() => navigate(`/w/${activeWorkspaceId}/report`)}
          >
            Export Report
          </button>
        )}
      </div>
    </header>
  );
}
