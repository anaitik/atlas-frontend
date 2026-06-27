import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { InlineAlert } from "../../components/ui/InlineAlert";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { apiClient } from "../../lib/api-client";

interface BankAccess {
  id: string;
  institution_name: string;
  access_token: string;
  access_url: string;
  allowed_pillars: string[];
  allow_document_access: boolean;
  expires_at: string | null;
  is_active: boolean;
  access_count: number;
  created_at: string;
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function BankAccessPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<BankAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [renewing, setRenewing] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // New link modal
  const [showModal, setShowModal] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankExpiry, setBankExpiry] = useState("90");
  const [creating, setCreating] = useState(false);
  const [newToken, setNewToken] = useState<BankAccess | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<BankAccess | null>(null);

  // Build the shareable verification URL from the token string.
  // Backend stores only the token; we add the frontend origin so the copied link works.
  const buildAccessUrl = (accessToken: string) =>
    `${window.location.origin}/verify/${accessToken}`;

  const load = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await apiClient<BankAccess[]>(`/bank/workspace/${workspaceId}/access`);
      setTokens(res || []);
    } catch (e: any) {
      setError(e?.message || "Could not load bank access links");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void load(); }, [load]);

  const handleRevoke = (token: BankAccess) => {
    setRevokeTarget(token);
  };

  const handleRevokeConfirm = async () => {
    if (!workspaceId || !revokeTarget) return;
    setRevoking(revokeTarget.id);
    setRevokeTarget(null);
    try {
      await apiClient(`/bank/workspace/${workspaceId}/access/${revokeTarget.id}`, { method: "DELETE" });
      setTokens((prev) => prev.filter((t) => t.id !== revokeTarget.id));
    } catch (e: any) {
      setError(e?.message || "Could not revoke access");
    } finally {
      setRevoking(null);
    }
  };

  const handleRenew = async (token: BankAccess) => {
    if (!workspaceId) return;
    setRenewing(token.id);
    try {
      const updated = await apiClient<BankAccess>(`/bank/workspace/${workspaceId}/access/${token.id}/renew`, {
        method: "PATCH",
        body: JSON.stringify({ expires_days: 90 }),
      });
      if (updated) setTokens((prev) => prev.map((t) => (t.id === token.id ? updated : t)));
    } catch (e: any) {
      setError(e?.message || "Could not renew access link");
    } finally {
      setRenewing(null);
    }
  };

  const handleCopy = (token: BankAccess) => {
    void navigator.clipboard.writeText(buildAccessUrl(token.access_token));
    setCopiedId(token.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = async () => {
    if (!workspaceId || !bankName.trim()) return;
    setCreating(true);
    try {
      const created = await apiClient<BankAccess>(`/bank/workspace/${workspaceId}/access`, {
        method: "POST",
        body: JSON.stringify({
          institution_name: bankName.trim(),
          allowed_pillars: ["environmental", "social", "governance"],
          allow_document_access: false,
          expires_days: bankExpiry ? parseInt(bankExpiry) : null,
        }),
      });
      if (created) {
        setNewToken(created);
        setTokens((prev) => [created, ...prev]);
      }
    } catch (e: any) {
      setError(e?.message || "Could not create bank access link");
    } finally {
      setCreating(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setNewToken(null);
    setBankName("");
    setBankExpiry("90");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <header>
        <Button variant="ghost" onClick={() => navigate(`/w/${workspaceId}`)} className="mb-4 px-2 -ml-2 text-text-secondary">
          <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span> Back
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="atlas-page-title text-atlas-600">Bank Access Links</h1>
            <p className="atlas-page-subtitle">Secure read-only access for lenders to verify your ESG data.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/w/${workspaceId}/vsme-report`)} className="text-[12px]">
              <span className="material-symbols-outlined text-[15px]">description</span>
              VSME Report
            </Button>
            <Button onClick={() => setShowModal(true)}>
              <span className="material-symbols-outlined text-[16px]">add</span>
              New bank link
            </Button>
          </div>
        </div>
      </header>

      {error && <InlineAlert variant="danger" onDismiss={() => setError(null)}>{error}</InlineAlert>}

      {/* Info card */}
      <div className="bg-atlas-50 border border-atlas-200 rounded-xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-atlas-600 text-[20px] mt-0.5">info</span>
        <div className="text-[12px] text-atlas-700 leading-relaxed">
          Each link grants a named institution read-only access to your approved ESG metrics and blockchain certificate.
          They cannot edit data or see other workspaces. Revoke any link instantly.
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-text-muted text-[13px]">
          <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
          Loading…
        </div>
      ) : tokens.length === 0 ? (
        <Card className="p-12 text-center">
          <span className="material-symbols-outlined text-[40px] text-text-muted mb-3 block">account_balance</span>
          <p className="text-[15px] font-bold text-text-primary mb-1">No bank links yet</p>
          <p className="text-[13px] text-text-secondary mb-4">
            Create a secure link to share your verified ESG data with your lender.
          </p>
          <Button onClick={() => setShowModal(true)}>
            <span className="material-symbols-outlined text-[16px]">add</span>
            Create first bank link
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => {
            const expired = token.expires_at && new Date(token.expires_at) < new Date();
            return (
              <div key={token.id} className={`bg-white rounded-xl border p-4 ${expired ? "border-border opacity-60" : "border-border hover:border-atlas-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-[18px] text-atlas-600">account_balance</span>
                      <p className="text-[14px] font-bold text-text-primary">{token.institution_name}</p>
                      {expired && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600">
                          Expired
                        </span>
                      )}
                    </div>

                    {/* URL row */}
                    <div className="flex items-center gap-2 mt-2 bg-surface-secondary rounded-lg px-3 py-2 border border-border">
                      <span className="text-[11px] font-mono text-text-muted flex-1 truncate">{buildAccessUrl(token.access_token)}</span>
                      <button
                        onClick={() => handleCopy(token)}
                        className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-atlas-600 hover:text-atlas-700"
                      >
                        <span className="material-symbols-outlined text-[13px]">{copiedId === token.id ? "check" : "content_copy"}</span>
                        {copiedId === token.id ? "Copied" : "Copy"}
                      </button>
                    </div>

                    {/* Stats row */}
                    <div className="flex flex-wrap gap-4 mt-2.5 text-[11px] text-text-muted">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">calendar_today</span>
                        Created {timeAgo(token.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px]">visibility</span>
                        Viewed {token.access_count} time{token.access_count !== 1 ? "s" : ""}
                      </span>
                      {token.expires_at && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">schedule</span>
                          Expires {new Date(token.expires_at).toLocaleDateString()}
                        </span>
                      )}
                      <span className="flex items-center gap-1 capitalize">
                        <span className="material-symbols-outlined text-[13px]">bar_chart</span>
                        {token.allowed_pillars.join(" · ")}
                      </span>
                    </div>
                  </div>

                  {/* Renew (expired) or Revoke (active) */}
                  {expired ? (
                    <button
                      onClick={() => void handleRenew(token)}
                      disabled={renewing === token.id}
                      className="shrink-0 flex items-center gap-1.5 text-[12px] font-semibold text-atlas-600 hover:text-atlas-700 transition-colors mt-1 border border-atlas-200 rounded-lg px-2.5 py-1.5 hover:bg-atlas-50"
                      title="Renew for 90 days"
                    >
                      {renewing === token.id ? (
                        <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-[14px]">autorenew</span>
                      )}
                      Renew 90d
                    </button>
                  ) : (
                    <button
                      onClick={() => void handleRevoke(token)}
                      disabled={revoking === token.id}
                      className="shrink-0 flex items-center gap-1.5 text-[12px] font-medium text-text-muted hover:text-red-600 transition-colors mt-1"
                      title="Revoke access"
                    >
                      {revoking === token.id ? (
                        <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-[16px]">link_off</span>
                      )}
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            {!newToken ? (
              <>
                <div className="flex justify-between items-start">
                  <h3 className="text-[16px] font-bold text-text-primary">New bank access link</h3>
                  <button onClick={handleModalClose} className="text-text-muted hover:text-text-primary">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
                <div>
                  <label className="atlas-label">Bank or institution name</label>
                  <input
                    className="atlas-input"
                    placeholder="e.g. Deutsche Bank, HSBC, Rabobank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="atlas-label">Link expires after</label>
                  <select className="atlas-input" value={bankExpiry} onChange={(e) => setBankExpiry(e.target.value)}>
                    <option value="30">30 days</option>
                    <option value="60">60 days</option>
                    <option value="90">90 days</option>
                    <option value="180">180 days</option>
                    <option value="">Never expires</option>
                  </select>
                </div>
                <div className="bg-surface-secondary rounded-lg p-3 text-[12px] text-text-secondary space-y-1.5">
                  <p className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-500 text-[14px]">check</span>
                    Read-only access to approved ESG metrics
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-500 text-[14px]">check</span>
                    Blockchain verification certificate
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-500 text-[14px]">check</span>
                    No account needed for the bank
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={handleModalClose}>Cancel</Button>
                  <Button
                    className="flex-1"
                    disabled={!bankName.trim() || creating}
                    onClick={() => void handleCreate()}
                  >
                    {creating ? (
                      <span className="material-symbols-outlined animate-spin text-[15px]">progress_activity</span>
                    ) : (
                      <span className="material-symbols-outlined text-[15px]">lock</span>
                    )}
                    Generate link
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-start">
                  <h3 className="text-[16px] font-bold text-text-primary">
                    Link ready for {newToken.institution_name}
                  </h3>
                  <button onClick={handleModalClose} className="text-text-muted hover:text-text-primary">
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <div className="bg-surface-secondary rounded-lg border border-border p-3 flex items-center gap-2">
                  <span className="text-[11px] text-text-secondary flex-1 truncate font-mono">{buildAccessUrl(newToken.access_token)}</span>
                  <button
                    onClick={() => handleCopy(newToken)}
                    className="shrink-0 text-[11px] font-semibold text-atlas-600 hover:text-atlas-700 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">{copiedId === newToken.id ? "check" : "content_copy"}</span>
                    {copiedId === newToken.id ? "Copied!" : "Copy"}
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified_user</span>
                  <span className="text-[12px] text-emerald-700 font-medium">
                    Verified by Atlas · Read-only · Blockchain-anchored
                  </span>
                </div>

                <Button className="w-full" onClick={handleModalClose}>Done</Button>
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke access?"
        message={`${revokeTarget?.institution_name} will immediately lose access to your ESG data.`}
        confirmLabel="Revoke access"
        cancelLabel="Keep access"
        variant="danger"
        onConfirm={handleRevokeConfirm}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}
