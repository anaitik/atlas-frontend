import { useEffect, useState } from "react";
import { apiClient } from "../../lib/api-client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { formatRoleLabel, formatStatusLabel } from "../../lib/display-labels";
import { UserOut } from "../../types/api-overrides";

export function UserManagement() {
  const [users, setUsers] = useState<UserOut[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const uData: any = await apiClient("/users?page_size=100");
      setUsers(uData.data || []);

      const cData: any = await apiClient("/companies?page_size=100");
      setCompanies(cData.data || []);
    } catch (e) {
      console.error(e);
    }
  };


  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (userId: string, companyId: string, role: string) => {
    try {
      await apiClient(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "active",
          company_id: companyId !== "none" ? companyId : null,
          role: role
        })
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between mb-8">
        <div>
          <h1 className="atlas-page-title text-atlas-600">Access Control matrix</h1>
          <p className="atlas-page-subtitle">Review pending registrations and assign RBAC roles securely.</p>
        </div>
      </header>

      <Card variant="flush" className="overflow-x-auto">
        <table className="atlas-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Status</th>
              <th>Assign Entity</th>
              <th>Assign Role</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <UserRow key={u.id} user={u} companies={companies} onApprove={handleApprove} />
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-text-muted italic">
                  No users registered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function UserRow({ user, companies, onApprove }: { user: UserOut, companies: any[], onApprove: any }) {
  const [selectedCompany, setSelectedCompany] = useState(user.company_id || "none");
  const [selectedRole, setSelectedRole] = useState(user.role);

  return (
    <tr>
      <td>
        <p className="text-[13px] font-semibold text-text-primary">{user.full_name}</p>
        <p className="text-[11px] text-text-secondary">{user.email}</p>
      </td>
      <td>
        <Badge variant={user.status === "pending" ? "amber" : "green"}>
          {formatStatusLabel(user.status)}
        </Badge>
      </td>
      <td>
        <select 
          value={selectedCompany} 
          onChange={e => setSelectedCompany(e.target.value)}
          className="atlas-input py-1.5 text-[12px] min-w-[200px]"
        >
          <option value="none">No Entity (System Admin)</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </td>
      <td>
        <select 
          value={selectedRole} 
          onChange={e => setSelectedRole(e.target.value as any)}
          className="atlas-input py-1.5 text-[12px] min-w-[180px]"
        >
          <option value="report_viewer">{formatRoleLabel("report_viewer")}</option>
          <option value="data_reviewer">{formatRoleLabel("data_reviewer")}</option>
          <option value="sustainability_manager">{formatRoleLabel("sustainability_manager")}</option>
          <option value="company_owner">{formatRoleLabel("company_owner")}</option>
          <option value="system_admin">{formatRoleLabel("system_admin")}</option>
        </select>
      </td>
      <td className="text-right">
        {user.status === 'pending' ? (
          <Button onClick={() => onApprove(user.id, selectedCompany, selectedRole)} className="text-[11px] px-3 py-1.5">
            Approve Access
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            className="text-[11px] px-3 py-1.5"
            onClick={() => onApprove(user.id, selectedCompany, selectedRole)}
          >
            Update Policy
          </Button>
        )}
      </td>
    </tr>
  );
}
