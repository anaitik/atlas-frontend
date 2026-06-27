import { useAuthStore } from "../../store/auth";
import { useWorkspaceStore } from "../../store/workspace";
import { useNavigate, useLocation } from "react-router-dom";
import { copy } from "../../lib/copy";
import { useUiPreferencesStore } from "../../store/uiPreferences";
import { usePersonaMode } from "../../hooks/usePersonaMode";
import { NotificationBell } from "../ui/NotificationBell";

const EXPERT_PIPELINE = [
  { label: "Review queue", icon: "verified", path: (id: string) => `/w/${id}/review` },
  { label: "Metrics", icon: "bar_chart", path: (id: string) => `/w/${id}/metrics` },
  { label: "Bank links", icon: "account_balance", path: (id: string) => `/w/${id}/bank-access` },
  { label: "Document types", icon: "account_tree", path: (id: string) => `/w/${id}/templates` },
  { label: "Evidence trail", icon: "timeline", path: (id: string) => `/w/${id}/evidence` },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeCompanyId, activeWorkspaceId, activeWorkspaceName, resetWorkspaceContext } = useWorkspaceStore();
  const setHelpPanelOpen = useUiPreferencesStore((s) => s.setHelpPanelOpen);
  const { isLead, isExpert, isStaff, toggleExperienceMode, showTechnicalDetails, toggleTechnicalDetails } = usePersonaMode();

  const handleLogout = () => {
    resetWorkspaceContext();
    logout();
    navigate("/login");
  };

  const isAdmin = user?.role === "system_admin";
  const canManageMembers = user?.role === "system_admin" || user?.role === "company_owner";
  const currentPath = location.pathname;

  const navActive = (active: boolean) =>
    active
      ? "bg-gradient-to-r from-atlas-600/35 to-transparent text-atlas-300 shadow-[inset_0_0_0_1px_rgba(34,197,94,0.2)]"
      : "text-sidebar-text hover:bg-sidebar-hover hover:text-text-on-dark";

  return (
    <aside
      className="w-[220px] h-full flex flex-col shrink-0 border-r border-sidebar-border"
      style={{ background: "linear-gradient(180deg, #0a2316 0%, #071a12 60%, #040e09 100%)" }}
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-atlas-400 to-atlas-600 flex items-center justify-center"
            style={{ boxShadow: "0 3px 12px rgba(34,197,94,0.3), inset 0 1px 0 rgba(255,255,255,0.15)" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f0fdf4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="text-[15px] font-extrabold text-text-on-dark tracking-tight leading-none">Atlas</div>
            <div className="text-[10px] font-medium text-atlas-400 mt-0.5">ESG Intelligence</div>
          </div>
        </div>
      </div>

      {/* Workspace context pill */}
      {activeWorkspaceId && !isAdmin && (
        <div className="mx-3 mt-3 rounded-lg bg-sidebar-surface border border-sidebar-border px-3 py-2.5">
          <div className="text-[9px] text-sidebar-text-dim font-semibold uppercase tracking-widest mb-0.5">
            Current workspace
          </div>
          <div className="text-[12px] font-bold text-text-on-dark truncate" title={activeWorkspaceName || ""}>
            {activeWorkspaceName || "Active workspace"}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll px-2 pt-4 pb-2">
        {isAdmin ? (
          <div className="space-y-0.5">
            <p className="px-3 mb-2 text-[9px] font-bold text-sidebar-text-dim uppercase tracking-widest">
              Administration
            </p>
            {[
              { label: "Overview", path: "/admin", icon: "space_dashboard" },
              { label: "Companies", path: "/admin/companies", icon: "domain" },
              { label: "Users", path: "/admin/users", icon: "group" },
              { label: "Configuration", path: "/admin/config", icon: "tune" },
            ].map((item) => {
              const active = currentPath === item.path || (item.path !== "/admin" && currentPath.startsWith(item.path));
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${navActive(active)}`}
                >
                  <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                  {item.label}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {activeCompanyId && (
              <button
                type="button"
                onClick={() => navigate(`/c/${activeCompanyId}`)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium mb-1 transition-all ${navActive(
                  currentPath === `/c/${activeCompanyId}`
                )}`}
              >
                <span className="material-symbols-outlined text-[17px]">home</span>
                Home
              </button>
            )}

            {activeWorkspaceId ? (
              <>
                {/* ESG Interview CTA */}
                <button
                  type="button"
                  onClick={() => navigate(`/w/${activeWorkspaceId}/collect`)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-bold transition-all mb-2 mt-1 ${
                    currentPath === `/w/${activeWorkspaceId}/collect`
                      ? "bg-gradient-to-r from-atlas-500 to-atlas-600 text-white shadow-brand"
                      : "bg-atlas-600/15 text-atlas-300 hover:bg-atlas-600/25 hover:text-atlas-200"
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px]">quiz</span>
                  ESG Interview
                </button>

                {[
                  { label: "Dashboard", path: `/w/${activeWorkspaceId}`, icon: "dashboard" },
                  { label: "Gap analysis", path: `/w/${activeWorkspaceId}/gap-analysis`, icon: "track_changes" },
                  {
                    label: isLead ? "Documents" : "Upload",
                    path: isLead ? `/w/${activeWorkspaceId}/documents` : `/w/${activeWorkspaceId}/extraction`,
                    icon: "upload_file",
                  },
                  { label: "Report", path: `/w/${activeWorkspaceId}/report`, icon: "description" },
                  ...(isLead ? [{ label: "Evidence", path: `/w/${activeWorkspaceId}/evidence`, icon: "shield" as const }] : []),
                ].map((item) => {
                  const active =
                    item.path === `/w/${activeWorkspaceId}`
                      ? currentPath === item.path
                      : currentPath.startsWith(item.path);
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${navActive(active)}`}
                    >
                      <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                      {item.label}
                    </button>
                  );
                })}

                {isExpert && (
                  <div className="mt-4 pt-3 border-t border-sidebar-border">
                    <p className="px-3 mb-2 text-[9px] font-bold text-sidebar-text-dim uppercase tracking-widest">
                      Team tools
                    </p>
                    {EXPERT_PIPELINE.map((item) => {
                      const path = item.path(activeWorkspaceId);
                      const active = currentPath.startsWith(path);
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => navigate(path)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${navActive(active)}`}
                        >
                          <span className="material-symbols-outlined text-[17px]">{item.icon}</span>
                          {item.label}
                        </button>
                      );
                    })}
                    {canManageMembers && (
                      <button
                        type="button"
                        onClick={() => navigate(`/w/${activeWorkspaceId}/members`)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-medium transition-all ${navActive(currentPath.includes("/members"))}`}
                      >
                        <span className="material-symbols-outlined text-[17px]">group</span>
                        Members
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="px-3 py-8 text-center">
                <span className="material-symbols-outlined text-sidebar-text-dim text-[28px] mb-2 block">folder_open</span>
                <p className="text-[11px] text-sidebar-text-dim leading-relaxed">
                  Select a workspace from your company home to get started.
                </p>
              </div>
            )}
          </>
        )}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 pb-2 space-y-0.5">
        {!isAdmin && <NotificationBell />}
        {!isAdmin && (
          isStaff ? (
            <button
              type="button"
              onClick={toggleTechnicalDetails}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-text-on-dark transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">{showTechnicalDetails ? "code" : "visibility_off"}</span>
              Technical details
              {showTechnicalDetails && <span className="ml-auto text-[9px] text-atlas-400 font-bold">ON</span>}
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleExperienceMode}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-text-on-dark transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">{isExpert ? "tune" : "auto_awesome"}</span>
              {isExpert ? "Expert" : "Simple"} mode
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => setHelpPanelOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-text-on-dark transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">help</span>
          Help
        </button>
      </div>

      {/* User */}
      <div className="px-3 pb-4 pt-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-atlas-400 to-atlas-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ boxShadow: "0 2px 8px rgba(34,197,94,0.25)" }}>
            {user?.full_name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-text-on-dark truncate">{user?.full_name}</p>
            <p className="text-[10px] text-sidebar-text-dim truncate capitalize">
              {user?.role?.replace(/_/g, " ")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-sidebar-text-dim hover:text-atlas-400 transition-colors"
            title="Sign out"
          >
            <span className="material-symbols-outlined text-[17px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
