import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatStatusLabel } from "../../lib/display-labels";
import { apiClient } from "../../lib/api-client";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { InlineAlert } from "../../components/ui/InlineAlert";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  status: string;
  created_at: string;
  workspace_count: number;
  user_count: number;
}

// ─── Add company modal ────────────────────────────────────────────────────────

function AddCompanyModal({
  onConfirm,
  onClose,
  busy,
}: {
  onConfirm: (name: string) => void;
  onClose: () => void;
  busy: boolean;
}) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-pop w-full max-w-sm animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border-light flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-text-primary">Add new company</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="atlas-label">Company name</label>
            <input
              type="text"
              placeholder="e.g. Acme Corp"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && onConfirm(name.trim())}
              className="atlas-input"
              autoFocus
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => onConfirm(name.trim())} disabled={!name.trim() || busy}>
            {busy ? "Adding…" : "Add company"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Company card ─────────────────────────────────────────────────────────────

function CompanyCard({
  company,
  onManage,
  onToggle,
  toggling,
}: {
  company: Company;
  onManage: () => void;
  onToggle: () => void;
  toggling: boolean;
}) {
  const isActive = company.status === "active";

  return (
    <div className="atlas-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-atlas-100 to-atlas-200 border border-atlas-200 flex items-center justify-center shrink-0">
            <span className="text-[15px] font-bold text-atlas-700">
              {company.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-bold text-text-primary truncate">{company.name}</h3>
            <p className="text-[11px] text-text-muted">
              Added {new Date(company.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Badge variant={isActive ? "green" : "red"}>{formatStatusLabel(company.status)}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface-secondary rounded-xl p-3 text-center">
          <p className="text-[20px] font-bold text-text-primary">{company.workspace_count}</p>
          <p className="text-[11px] text-text-muted">Workspaces</p>
        </div>
        <div className="bg-surface-secondary rounded-xl p-3 text-center">
          <p className="text-[20px] font-bold text-text-primary">{company.user_count}</p>
          <p className="text-[11px] text-text-muted">Users</p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border-light">
        <Button variant="ghost" className="flex-1 text-[12px]" onClick={onManage}>
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          Manage
        </Button>
        <Button
          variant="outline"
          className={`flex-1 text-[12px] ${isActive ? "text-warning border-warning/30 hover:bg-warning/5" : "text-success border-success/30 hover:bg-success/5"}`}
          onClick={onToggle}
          disabled={toggling}
        >
          {toggling ? "…" : isActive ? "Suspend" : "Reactivate"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CompanyManagement() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchCompanies = async () => {
    try {
      const res: any = await apiClient("/admin/company-summaries");
      setCompanies(res || []);
    } catch {}
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleCreate = async (name: string) => {
    setAdding(true);
    try {
      await apiClient("/companies", { method: "POST", body: JSON.stringify({ name }) });
      await fetchCompanies();
      setShowAddModal(false);
    } catch (e: any) {
      setError(`Failed to add company: ${e.message || "Unknown error"}`);
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (company: Company) => {
    setTogglingId(company.id);
    const newStatus = company.status === "active" ? "suspended" : "active";
    try {
      await apiClient(`/admin/companies/${company.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, status: newStatus } : c)));
    } catch (e: any) {
      setError(`Failed to update status: ${e.message || "Unknown error"}`);
    } finally {
      setTogglingId(null);
    }
  };

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = companies.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      {error && (
        <InlineAlert variant="danger" onDismiss={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="atlas-page-title">Companies</h1>
          <p className="atlas-page-subtitle">
            {companies.length} companies · {activeCount} active
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add company
        </Button>
      </header>

      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-text-muted pointer-events-none">
          search
        </span>
        <input
          type="text"
          placeholder="Search companies…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="atlas-input pl-9 w-full max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <span className="material-symbols-outlined text-[40px] text-text-muted mb-3 block">domain</span>
          <p className="text-[15px] font-bold text-text-primary mb-1">
            {search ? "No companies match your search" : "No companies yet"}
          </p>
          {!search && (
            <Button className="mt-4" onClick={() => setShowAddModal(true)}>Add your first company</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((c) => (
            <CompanyCard
              key={c.id}
              company={c}
              onManage={() => navigate(`/c/${c.id}`)}
              onToggle={() => handleToggle(c)}
              toggling={togglingId === c.id}
            />
          ))}
        </div>
      )}

      {showAddModal && (
        <AddCompanyModal
          onConfirm={handleCreate}
          onClose={() => setShowAddModal(false)}
          busy={adding}
        />
      )}
    </div>
  );
}
