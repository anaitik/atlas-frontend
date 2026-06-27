import { useEffect, useState } from "react";
import { apiClient } from "../../lib/api-client";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { InlineAlert } from "../../components/ui/InlineAlert";
import { formatRoleLabel, formatStatusLabel } from "../../lib/display-labels";
import { UserOut } from "../../types/api-overrides";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusFilter = "all" | "pending" | "active" | "suspended";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending approval" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
];

const ROLE_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "report_viewer", label: "Report viewer", hint: "Read-only access to reports and metrics" },
  { value: "data_reviewer", label: "Data reviewer", hint: "Can approve or reject extracted data" },
  { value: "sustainability_manager", label: "Sustainability manager", hint: "Full workspace access, runs AI extraction" },
  { value: "company_owner", label: "Company owner", hint: "Manages the company, members and workspaces" },
  { value: "system_admin", label: "System admin", hint: "Full platform access" },
];

// ─── Approve modal ────────────────────────────────────────────────────────────

function ApproveModal({
  user,
  companies,
  onConfirm,
  onClose,
  busy,
}: {
  user: UserOut;
  companies: any[];
  onConfirm: (companyId: string, role: string) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const [companyId, setCompanyId] = useState(user.company_id || "none");
  const [role, setRole] = useState(user.role || "data_reviewer");

  const selectedRole = ROLE_OPTIONS.find((r) => r.value === role);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-pop w-full max-w-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-border-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-atlas-400 to-atlas-600 flex items-center justify-center text-white text-[16px] font-bold shadow-brand">
              {user.full_name?.charAt(0) || "U"}
            </div>
            <div>
              <p className="text-[15px] font-bold text-text-primary">{user.full_name}</p>
              <p className="text-[12px] text-text-muted">{user.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <label className="atlas-label">Assign to company</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="atlas-input"
            >
              <option value="none">No company (System admin only)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="atlas-label">Assign role</label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    role === r.value
                      ? "border-atlas-400 bg-atlas-50"
                      : "border-border-light hover:border-atlas-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="mt-0.5 accent-atlas-500"
                  />
                  <div>
                    <p className="text-[13px] font-semibold text-text-primary">{r.label}</p>
                    <p className="text-[11px] text-text-muted">{r.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => onConfirm(companyId, role)} disabled={busy}>
            {busy ? "Approving…" : "Approve access"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditModal({
  user,
  companies,
  onConfirm,
  onClose,
  busy,
}: {
  user: UserOut;
  companies: any[];
  onConfirm: (companyId: string, role: string) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const [companyId, setCompanyId] = useState(user.company_id || "none");
  const [role, setRole] = useState(user.role || "data_reviewer");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-pop w-full max-w-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-border-light">
          <div>
            <p className="text-[15px] font-bold text-text-primary">Edit {user.full_name}</p>
            <p className="text-[12px] text-text-muted">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="atlas-label">Company</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="atlas-input"
            >
              <option value="none">No company (System admin)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="atlas-label">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="atlas-input"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => onConfirm(companyId, role)} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── User row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  companies,
  onApprove,
  onEdit,
  onSuspend,
  onReactivate,
}: {
  user: UserOut;
  companies: any[];
  onApprove: (u: UserOut) => void;
  onEdit: (u: UserOut) => void;
  onSuspend: (userId: string) => void;
  onReactivate: (userId: string) => void;
}) {
  const companyName = companies.find((c) => c.id === user.company_id)?.name;
  const roleOption = ROLE_OPTIONS.find((r) => r.value === user.role);

  const badgeVariant =
    user.status === "pending" ? "amber" :
    user.status === "suspended" ? "red" :
    "green";

  return (
    <tr className={user.status === "suspended" ? "opacity-60" : ""}>
      <td>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-atlas-300 to-atlas-500 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
            {user.full_name?.charAt(0) || "U"}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-text-primary">{user.full_name}</p>
            <p className="text-[11px] text-text-muted">{user.email}</p>
          </div>
        </div>
      </td>
      <td>
        <Badge variant={badgeVariant}>{formatStatusLabel(user.status)}</Badge>
      </td>
      <td>
        {companyName ? (
          <p className="text-[13px] text-text-primary">{companyName}</p>
        ) : (
          <p className="text-[12px] text-text-muted italic">No company</p>
        )}
      </td>
      <td>
        <p className="text-[13px] text-text-primary">{roleOption?.label || formatRoleLabel(user.role)}</p>
        <p className="text-[11px] text-text-muted">{roleOption?.hint}</p>
      </td>
      <td className="text-right">
        <div className="flex items-center justify-end gap-2">
          {user.status === "pending" && (
            <Button className="text-[12px]" onClick={() => onApprove(user)}>
              Approve
            </Button>
          )}
          {user.status === "active" && (
            <>
              <Button variant="ghost" className="text-[12px]" onClick={() => onEdit(user)}>
                Edit
              </Button>
              <Button
                variant="outline"
                className="text-[12px] text-warning border-warning/30 hover:bg-warning/5"
                onClick={() => onSuspend(user.id)}
              >
                Suspend
              </Button>
            </>
          )}
          {user.status === "suspended" && (
            <Button
              variant="outline"
              className="text-[12px] text-success border-success/30 hover:bg-success/5"
              onClick={() => onReactivate(user.id)}
            >
              Reactivate
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function UserManagement() {
  const [users, setUsers] = useState<UserOut[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<UserOut | null>(null);
  const [editTarget, setEditTarget] = useState<UserOut | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchData = async () => {
    try {
      const [uData, cData]: any[] = await Promise.all([
        apiClient("/users?page_size=100"),
        apiClient("/companies?page_size=100"),
      ]);
      setUsers(uData.data || []);
      setCompanies(cData.data || []);
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (userId: string, companyId: string, role: string) => {
    setBusy(true);
    try {
      setError(null);
      await apiClient(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "active",
          company_id: companyId !== "none" ? companyId : null,
          role,
        }),
      });
      await fetchData();
      setApproveTarget(null);
    } catch (e: any) {
      setError(e.message || "Failed to approve user.");
    } finally {
      setBusy(false);
    }
  };

  const handleEdit = async (userId: string, companyId: string, role: string) => {
    setBusy(true);
    try {
      setError(null);
      await apiClient(`/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          company_id: companyId !== "none" ? companyId : null,
          role,
        }),
      });
      await fetchData();
      setEditTarget(null);
    } catch (e: any) {
      setError(e.message || "Failed to update user.");
    } finally {
      setBusy(false);
    }
  };

  const handleSuspend = async (userId: string) => {
    try {
      setError(null);
      await apiClient(`/users/${userId}`, { method: "PATCH", body: JSON.stringify({ status: "suspended" }) });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "suspended" } : u)));
    } catch (e: any) {
      setError(e.message || "Failed to suspend user.");
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      setError(null);
      await apiClient(`/users/${userId}`, { method: "PATCH", body: JSON.stringify({ status: "active" }) });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: "active" } : u)));
    } catch (e: any) {
      setError(e.message || "Failed to reactivate user.");
    }
  };

  const filtered = users.filter((u) => {
    const matchSearch = !search
      || u.full_name.toLowerCase().includes(search.toLowerCase())
      || u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = users.filter((u) => u.status === "pending").length;

  return (
    <div className="space-y-6">
      {error && (
        <InlineAlert variant="danger" onDismiss={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      <header className="flex items-start justify-between">
        <div>
          <h1 className="atlas-page-title">Team & access</h1>
          <p className="atlas-page-subtitle">Review pending registrations and manage user roles.</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-warning-bg border border-warning-border rounded-xl px-4 py-2.5">
            <span className="material-symbols-outlined text-warning text-[18px]">schedule</span>
            <span className="text-[13px] font-semibold text-warning">
              {pendingCount} waiting for approval
            </span>
          </div>
        )}
      </header>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted pointer-events-none">
            search
          </span>
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="atlas-input pl-9 w-64"
          />
        </div>

        <div className="flex items-center gap-1 bg-surface-secondary rounded-xl p-1 border border-border">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                statusFilter === tab.key
                  ? "bg-white text-text-primary shadow-sm border border-border"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
              {tab.key === "pending" && pendingCount > 0 && (
                <span className="ml-1.5 bg-warning text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <Card variant="flush" className="overflow-x-auto">
        <table className="atlas-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Status</th>
              <th>Company</th>
              <th>Role</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <UserRow
                key={u.id}
                user={u}
                companies={companies}
                onApprove={setApproveTarget}
                onEdit={setEditTarget}
                onSuspend={handleSuspend}
                onReactivate={handleReactivate}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-text-muted">
                  {search || statusFilter !== "all" ? "No users match the current filters." : "No users registered yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Approve modal */}
      {approveTarget && (
        <ApproveModal
          user={approveTarget}
          companies={companies}
          onConfirm={(cId, role) => handleApprove(approveTarget.id, cId, role)}
          onClose={() => setApproveTarget(null)}
          busy={busy}
        />
      )}

      {/* Edit modal */}
      {editTarget && (
        <EditModal
          user={editTarget}
          companies={companies}
          onConfirm={(cId, role) => handleEdit(editTarget.id, cId, role)}
          onClose={() => setEditTarget(null)}
          busy={busy}
        />
      )}
    </div>
  );
}
