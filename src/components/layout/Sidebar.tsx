import { useAuthStore } from "../../store/auth";
import { useWorkspaceStore } from "../../store/workspace";
import { useNavigate, useLocation } from "react-router-dom";

const PIPELINE_STAGES = [
  { label: "Collect", icon: "upload_file", stage: "collect" },
  { label: "Review", icon: "verified", stage: "review" },
  { label: "Metrics", icon: "bar_chart", stage: "metrics" },
  { label: "Report", icon: "description", stage: "report" },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeCompanyId, activeWorkspaceId, activeWorkspaceName, resetWorkspaceContext } = useWorkspaceStore();

  const handleLogout = () => {
    resetWorkspaceContext();
    logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "system_admin";

  // Determine the current pipeline stage from the URL
  const currentPath = location.pathname;
  const getActiveStage = () => {
    if (currentPath.includes("/extraction")) return "collect";
    if (currentPath.includes("/review")) return "review";
    if (currentPath.includes("/metrics")) return "metrics";
    if (currentPath.includes("/report")) return "report";
    return null;
  };
  const activeStage = getActiveStage();

  return (
    <aside className="w-[220px] h-full bg-sidebar-bg flex flex-col shrink-0 border-r border-sidebar-border">

      {/* ── Brand ──────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-atlas-600 flex items-center justify-center shadow-lg shadow-atlas-900/50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f0fdf4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="text-[15px] font-bold text-text-on-dark tracking-tight">
              Atlas
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-atlas-400">
              ESG Reporting Hub
            </div>
          </div>
        </div>
      </div>

      {/* ── Workspace Context (when active) ────────── */}
      {activeWorkspaceId && !isAdmin && (
        <div className="mx-3 mt-3 bg-sidebar-surface border border-sidebar-border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-[0.06em] text-sidebar-text-dim font-medium">
            Active workspace
          </div>
          <div className="text-[12px] font-semibold text-text-on-dark mt-0.5 truncate" title={activeWorkspaceName || "Active"}>
            {activeWorkspaceName || "Current Period"}
          </div>
          <div className="text-[11px] text-atlas-400 mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-atlas-400 inline-block"></span>
            In Progress
          </div>
        </div>
      )}

      {/* ── Navigation ─────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll px-3 pt-4">

        {isAdmin ? (
          /* Admin menu */
          <div className="space-y-0.5">
            <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-text-dim">
              Administration
            </div>
            {[
              { label: "Dashboard", path: "/admin", icon: "space_dashboard" },
              { label: "Companies", path: "/admin/companies", icon: "domain" },
              { label: "Users", path: "/admin/users", icon: "group" },
            ].map((item) => {
              const active = currentPath === item.path || (item.path !== "/admin" && currentPath.startsWith(item.path));
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-medium transition-all duration-150 ${
                    active
                      ? "bg-sidebar-active-bg text-atlas-400 border-l-2 border-sidebar-active-border -ml-[2px] pl-[14px]"
                      : "text-sidebar-text hover:bg-sidebar-hover hover:text-text-on-dark"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* Pipeline Navigation */}
            {activeWorkspaceId && (
              <>
                {activeCompanyId && (
                  <button
                    onClick={() => navigate(`/c/${activeCompanyId}`)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[12px] font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-text-on-dark transition-all duration-150 mb-3"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Workspace Hub
                  </button>
                )}

                <div className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sidebar-text-dim">
                  Pipeline
                </div>
                <div className="space-y-0.5">
                  {PIPELINE_STAGES.map((stage) => {
                    const pathMap: Record<string, string> = {
                      collect: `/w/${activeWorkspaceId}/extraction`,
                      review: `/w/${activeWorkspaceId}/review`,
                      metrics: `/w/${activeWorkspaceId}/metrics`,
                      report: `/w/${activeWorkspaceId}/report`,
                    };
                    const active = activeStage === stage.stage;

                    return (
                      <button
                        key={stage.stage}
                        onClick={() => navigate(pathMap[stage.stage])}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-medium transition-all duration-150 ${
                          active
                            ? "bg-sidebar-active-bg text-atlas-400 border-l-2 border-sidebar-active-border -ml-[2px] pl-[14px]"
                            : "text-sidebar-text hover:bg-sidebar-hover hover:text-text-on-dark"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{stage.icon}</span>
                        {stage.label}
                      </button>
                    );
                  })}
                </div>

                {/* Pipeline Progress Stepper */}
                <div className="mx-0 mt-4 bg-sidebar-surface border border-sidebar-border rounded-lg p-3">
                  <div className="text-[10px] uppercase tracking-[0.06em] text-sidebar-text-dim font-semibold mb-2.5">
                    Pipeline Progress
                  </div>
                  {PIPELINE_STAGES.map((stage, i) => {
                    const stageIdx = PIPELINE_STAGES.findIndex(s => s.stage === activeStage);
                    const isDone = stageIdx > i;
                    const isCurrent = stageIdx === i;
                    return (
                      <div key={stage.stage} className="flex items-center gap-2 mb-1.5 last:mb-0">
                        <div className={`w-[7px] h-[7px] rounded-full shrink-0 ${
                          isDone ? "bg-atlas-400" : isCurrent ? "bg-warning" : "bg-sidebar-border"
                        }`} />
                        <span className={`text-[11px] ${
                          isDone ? "text-sidebar-text line-through" : isCurrent ? "text-warning font-medium" : "text-sidebar-text-dim"
                        }`}>
                          {stage.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Other workspace links */}
                <div className="mt-4 pt-3 border-t border-sidebar-border space-y-0.5">
                  {[
                    { label: "Templates", path: `/w/${activeWorkspaceId}/templates`, icon: "account_tree" },
                    { label: "Members", path: `/w/${activeWorkspaceId}/members`, icon: "group" },
                    { label: "Story", path: `/w/${activeWorkspaceId}/story`, icon: "auto_stories" },
                  ].map((item) => {
                    const active = currentPath.startsWith(item.path);
                    return (
                      <button
                        key={item.label}
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-medium transition-all duration-150 ${
                          active
                            ? "bg-sidebar-active-bg text-atlas-400 border-l-2 border-sidebar-active-border -ml-[2px] pl-[14px]"
                            : "text-sidebar-text hover:bg-sidebar-hover hover:text-text-on-dark"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {!activeWorkspaceId && (
              <div className="px-3 py-6 text-center">
                <span className="material-symbols-outlined text-sidebar-text-dim text-2xl mb-2 block">workspaces</span>
                <p className="text-[11px] text-sidebar-text-dim leading-relaxed">
                  Select a workspace to see the pipeline
                </p>
              </div>
            )}
          </>
        )}
      </nav>



      {/* ── Bottom links ──────────────────────────── */}
      <div className="px-3 pb-2 space-y-0.5">
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] text-sidebar-text-dim hover:text-sidebar-text hover:bg-sidebar-hover transition-all">
          <span className="material-symbols-outlined text-[16px]">settings</span>
          Workspace Settings
        </button>
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] text-sidebar-text-dim hover:text-sidebar-text hover:bg-sidebar-hover transition-all">
          <span className="material-symbols-outlined text-[16px]">help</span>
          Support
        </button>
      </div>

      {/* ── User ──────────────────────────────────── */}
      <div className="px-3 pb-4 pt-2 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-atlas-600/50 border border-atlas-400/30 flex items-center justify-center text-[11px] font-bold text-atlas-400 shrink-0">
            {user?.full_name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-text-on-dark truncate">{user?.full_name}</p>
            <p className="text-[10px] text-sidebar-text-dim truncate">{user?.role?.replace("_", " ")}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sidebar-text-dim hover:text-atlas-400 transition-colors"
            title="Sign out"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
