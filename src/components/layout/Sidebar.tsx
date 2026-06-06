import { useAuthStore } from "../../store/auth";
import { useWorkspaceStore } from "../../store/workspace";
import { useNavigate, useLocation } from "react-router-dom";
import { copy } from "../../lib/copy";
import { useUiPreferencesStore } from "../../store/uiPreferences";
import { usePersonaMode } from "../../hooks/usePersonaMode";

const EXPERT_PIPELINE = [
  { label: copy.nav.approvalQueue, icon: "verified", path: (id: string) => `/w/${id}/review` },
  { label: copy.expert.metricsTitle, icon: "bar_chart", path: (id: string) => `/w/${id}/metrics` },
  { label: copy.nav.documentTypes, icon: "account_tree", path: (id: string) => `/w/${id}/templates` },
  { label: copy.nav.evidenceTrail, icon: "timeline", path: (id: string) => `/w/${id}/evidence` },
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
  const roleLabel = user?.role ? copy.roles[user.role as keyof typeof copy.roles] || user.role : "";

  const navBtn = (active: boolean) =>
    active
      ? "bg-sidebar-active-bg text-atlas-400 border-l-2 border-sidebar-active-border -ml-[2px] pl-[14px]"
      : "text-sidebar-text hover:bg-sidebar-hover hover:text-text-on-dark";

  return (
    <aside className="w-[220px] h-full bg-sidebar-bg flex flex-col shrink-0 border-r border-sidebar-border">
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
            <div className="text-[15px] font-bold text-text-on-dark tracking-tight">Atlas</div>
            <div className="text-[10px] font-medium text-atlas-400">Sustainability reporting</div>
          </div>
        </div>
      </div>

      {activeWorkspaceId && !isAdmin && (
        <div className="mx-3 mt-3 bg-sidebar-surface border border-sidebar-border rounded-lg p-3">
          <div className="text-[10px] text-sidebar-text-dim font-medium">{copy.nav.thisPeriod}</div>
          <div className="text-[12px] font-semibold text-text-on-dark mt-0.5 truncate" title={activeWorkspaceName || ""}>
            {activeWorkspaceName || "Current period"}
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto sidebar-scroll px-3 pt-4">
        {isAdmin ? (
          <div className="space-y-0.5">
            <div className="px-3 mb-2 text-[10px] font-semibold text-sidebar-text-dim">Administration</div>
            {[
              { label: "Dashboard", path: "/admin", icon: "space_dashboard" },
              { label: "Companies", path: "/admin/companies", icon: "domain" },
              { label: "Users", path: "/admin/users", icon: "group" },
            ].map((item) => {
              const active = currentPath === item.path || (item.path !== "/admin" && currentPath.startsWith(item.path));
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-medium transition-all ${navBtn(active)}`}
                >
                  <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
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
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-medium mb-2 transition-all ${navBtn(
                  currentPath === `/c/${activeCompanyId}`
                )}`}
              >
                <span className="material-symbols-outlined text-[18px]">home</span>
                {copy.nav.home}
              </button>
            )}

            {activeWorkspaceId ? (
              <>
                {[
                  { label: copy.nav.thisPeriod, path: `/w/${activeWorkspaceId}`, icon: "dashboard" },
                  {
                    label: isLead ? copy.nav.documents : copy.nav.upload,
                    path: isLead ? `/w/${activeWorkspaceId}/documents` : `/w/${activeWorkspaceId}/extraction`,
                    icon: "upload_file",
                  },
                  { label: copy.nav.report, path: `/w/${activeWorkspaceId}/report`, icon: "description" },
                  ...(isLead
                    ? [{ label: copy.nav.evidence, path: `/w/${activeWorkspaceId}/evidence`, icon: "shield" as const }]
                    : []),
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
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-medium transition-all ${navBtn(active)}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      {item.label}
                    </button>
                  );
                })}

                {isExpert && (
                  <div className="mt-4 pt-3 border-t border-sidebar-border">
                    <div className="px-3 mb-2 text-[10px] font-semibold text-sidebar-text-dim">{copy.nav.teamTools}</div>
                    {EXPERT_PIPELINE.map((item) => {
                      const path = item.path(activeWorkspaceId);
                      const active = currentPath.startsWith(path);
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => navigate(path)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-medium transition-all ${navBtn(active)}`}
                        >
                          <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                          {item.label}
                        </button>
                      );
                    })}
                    {canManageMembers && (
                      <button
                        type="button"
                        onClick={() => navigate(`/w/${activeWorkspaceId}/members`)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[12px] font-medium transition-all ${navBtn(
                          currentPath.includes("/members")
                        )}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">group</span>
                        {copy.nav.members}
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="px-3 py-6 text-center">
                <span className="material-symbols-outlined text-sidebar-text-dim text-2xl mb-2 block">calendar_month</span>
                <p className="text-[11px] text-sidebar-text-dim leading-relaxed">
                  Open a reporting period from your organization home to get started.
                </p>
              </div>
            )}
          </>
        )}
      </nav>

      <div className="px-3 pb-2 space-y-0.5">
        {!isAdmin && (
          isStaff ? (
            <button
              type="button"
              onClick={toggleTechnicalDetails}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-text-on-dark"
              title={copy.expert.showTechnicalDetails}
            >
              <span className="material-symbols-outlined text-[16px]">{showTechnicalDetails ? "code" : "visibility_off"}</span>
              {copy.expert.showTechnicalDetails}
              {showTechnicalDetails && <span className="ml-auto text-[9px] text-atlas-400">On</span>}
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleExperienceMode}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-text-on-dark"
              title={isExpert ? copy.modes.expertHint : copy.modes.simpleHint}
            >
              <span className="material-symbols-outlined text-[16px]">{isExpert ? "tune" : "auto_awesome"}</span>
              {isExpert ? copy.modes.expert : copy.modes.simple} mode
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => setHelpPanelOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-text-on-dark"
        >
          <span className="material-symbols-outlined text-[16px]">help</span>
          {copy.nav.help}
        </button>
      </div>

      <div className="px-3 pb-4 pt-2 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-atlas-600/50 border border-atlas-400/30 flex items-center justify-center text-[11px] font-bold text-atlas-400 shrink-0">
            {user?.full_name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-text-on-dark truncate">{user?.full_name}</p>
            <p className="text-[10px] text-sidebar-text-dim truncate">{roleLabel}</p>
          </div>
          <button type="button" onClick={handleLogout} className="text-sidebar-text-dim hover:text-atlas-400 transition-colors" title="Sign out">
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
