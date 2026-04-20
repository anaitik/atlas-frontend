import { useAuthStore } from "../store/auth";

type Role = "system_admin" | "company_owner" | "sustainability_manager" | "data_reviewer" | "report_viewer";

const ROLE_HIERARCHY: Record<Role, number> = {
  system_admin: 100,
  company_owner: 80,
  sustainability_manager: 60,
  data_reviewer: 40,
  report_viewer: 20,
};

/**
 * RBAC permission hook.
 * Route guards consume this — they never duplicate role logic.
 */
export function usePermission() {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? "report_viewer") as Role;

  const hasRole = (required: Role) => {
    return (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[required] ?? 999);
  };

  const isAdmin = role === "system_admin";
  const isOwner = role === "company_owner" || isAdmin;
  const isManager = role === "sustainability_manager" || isOwner;
  const isReviewer = role === "data_reviewer" || isManager;

  const can = {
    approveUsers: isAdmin,
    createCompany: isAdmin,
    createWorkspace: isOwner,
    uploadDocuments: isManager,
    reviewExtractions: isReviewer,
    approveMetrics: isManager,
    approveReport: isOwner,
    viewReport: true,
  };

  return { role, hasRole, isAdmin, isOwner, isManager, isReviewer, can };
}
