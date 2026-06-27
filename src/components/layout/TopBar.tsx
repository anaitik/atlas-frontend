import { useAuthStore } from "../../store/auth";
import { useWorkspaceStore } from "../../store/workspace";
import { useLocation, useNavigate } from "react-router-dom";
import { copy } from "../../lib/copy";

export function TopBar() {
  const user = useAuthStore((s) => s.user);
  const { activeWorkspaceId, activeCompanyName, activeWorkspaceName } = useWorkspaceStore();
  const location = useLocation();
  const navigate = useNavigate();

  const getStepHint = () => {
    const path = location.pathname;
    if (path.match(/^\/w\/[^/]+$/)) return "Overview";
    if (path.includes("/extraction")) return copy.nav.upload;
    if (path.includes("/documents")) return copy.nav.documents;
    if (path.includes("/review")) return copy.nav.approvalQueue;
    if (path.includes("/metrics")) return copy.expert.metricsTitle;
    if (path.includes("/templates")) return copy.nav.documentTypes;
    if (path.includes("/evidence")) return copy.nav.evidenceTrail;
    if (path.includes("/report")) return copy.nav.report;
    if (path.includes("/admin")) return "Administration";
    if (path.includes("/settings")) return "Settings";
    return copy.org.homeTitle;
  };

  const step = getStepHint();
  const isAdmin = user?.role === "system_admin";

  return (
    <header
      className="h-14 border-b border-border-light flex items-center justify-between px-6 shrink-0 sticky top-0 z-20"
      style={{ background: "rgba(255,255,255,0.78)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
    >
      <div className="flex items-center gap-2 text-[13px] min-w-0">
        {isAdmin ? (
          <span className="font-semibold text-text-primary">Atlas Admin</span>
        ) : activeWorkspaceId ? (
          <>
            <span className="text-text-secondary truncate max-w-[140px]">{activeCompanyName || "Organization"}</span>
            <span className="text-border">/</span>
            <span className="font-semibold text-text-primary truncate max-w-[160px]">{activeWorkspaceName || "Period"}</span>
            <span className="text-border hidden sm:inline">/</span>
            <span className="text-text-secondary hidden sm:inline">{step}</span>
          </>
        ) : (
          <span className="font-semibold text-text-primary">{copy.org.homeTitle}</span>
        )}
      </div>

      <div className="hidden md:block text-[11px] text-text-muted font-medium">
        Traceable metrics. Audit-ready reports.
      </div>

      <div className="flex items-center gap-1.5">
        {!isAdmin && activeWorkspaceId && (
          <button
            type="button"
            className="ml-2 px-4 py-1.5 bg-gradient-to-b from-atlas-500 to-atlas-600 hover:to-atlas-700 text-white text-[12px] font-semibold rounded-xl transition-all shadow-[0_4px_12px_rgba(22,101,52,0.25)] active:scale-[0.97]"
            onClick={() => navigate(`/w/${activeWorkspaceId}/report`)}
          >
            {copy.period.openReport}
          </button>
        )}

        <button
          type="button"
          className="p-1 rounded-full hover:bg-surface-secondary transition-colors"
          title={user?.full_name || "Current user"}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-atlas-400 to-atlas-600 flex items-center justify-center text-[11px] font-bold text-white shadow-[0_2px_8px_rgba(34,197,94,0.3)]">
            {user?.full_name?.charAt(0) ?? "U"}
          </div>
        </button>
      </div>
    </header>
  );
}
