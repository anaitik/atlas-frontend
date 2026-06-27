import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { apiClient } from "../../lib/api-client";
import { useAuthStore } from "../../store/auth";
import { useWorkspaceStore } from "../../store/workspace";
import { formatRoleLabel } from "../../lib/display-labels";

interface CompanyUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  company_id: string | null;
}

export function WorkspaceMembers() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { activeCompanyId } = useWorkspaceStore();
  const [members, setMembers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const isAdmin = user?.role === "system_admin";

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    apiClient("/users?page_size=100")
      .then((res: any) => {
        const all: CompanyUser[] = res?.data ?? res ?? [];
        setMembers(all.filter((u) => u.company_id === activeCompanyId || u.role === "system_admin"));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAdmin, activeCompanyId]);

  const roleVariant = (role: string) => {
    if (role === "system_admin") return "blue";
    if (role === "company_owner") return "green";
    if (role === "sustainability_manager") return "green";
    return "gray";
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between mb-8">
        <div>
          <Button variant="ghost" className="mb-4 px-2 -ml-2 text-text-secondary" onClick={() => navigate(-1)}>
            <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span> Back
          </Button>
          <h1 className="atlas-page-title text-atlas-600">Team Access</h1>
          <p className="atlas-page-subtitle">Users who can access this reporting period through their organization membership.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate("/admin/users")}>
            <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
            Manage in Admin
          </Button>
        )}
      </header>

      <div className="rounded-xl border border-atlas-200 bg-atlas-50 p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-atlas-600 text-[20px] mt-0.5 shrink-0">info</span>
        <div>
          <p className="text-[13px] font-semibold text-atlas-800">Access is managed at the organization level</p>
          <p className="text-[12px] text-atlas-700 mt-0.5 leading-relaxed">
            All active users assigned to this organization have access to its reporting periods based on their role.
            {isAdmin
              ? " Manage user roles and assignments from the Admin portal."
              : " Contact your administrator to add or change access."}
          </p>
          {!isAdmin && activeCompanyId && (
            <a
              href={`/c/${activeCompanyId}/settings`}
              className="inline-block mt-2 text-[12px] font-semibold text-atlas-600 hover:text-atlas-700 underline"
            >
              Organization settings →
            </a>
          )}
        </div>
      </div>

      {isAdmin && (
        <>
          {loading ? (
            <div className="flex items-center gap-2 text-text-muted text-[13px] py-6">
              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              Loading members…
            </div>
          ) : (
            <Card variant="flush">
              <table className="atlas-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td className="font-semibold text-text-primary">{m.full_name}</td>
                      <td className="text-[12px] text-text-secondary">{m.email}</td>
                      <td>
                        <Badge variant={roleVariant(m.role) as any}>{formatRoleLabel(m.role)}</Badge>
                      </td>
                      <td>
                        <Badge variant={m.status === "active" ? "green" : m.status === "pending" ? "amber" : "red"}>
                          {m.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {members.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-text-muted italic">
                        No users assigned to this organization yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      {!isAdmin && (
        <Card className="text-center py-12 bg-surface-secondary/50">
          <span className="material-symbols-outlined text-[40px] text-text-muted mb-3 block">group</span>
          <p className="text-[14px] font-semibold text-text-primary mb-1">Your organization team</p>
          <p className="text-[12px] text-text-secondary max-w-xs mx-auto leading-relaxed">
            All active team members of your organization can access this reporting period based on their assigned role. Contact your administrator to request changes.
          </p>
        </Card>
      )}
    </div>
  );
}
