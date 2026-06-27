import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { apiClient } from "../../lib/api-client";
import { formatEventType, formatAuditActor } from "../../lib/display-labels";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  tenant_count: number;
  active_companies: number;
  active_user_count: number;
  pending_user_count: number;
  workspace_count: number;
  active_bank_token_count: number;
  events_today: number;
}

interface AuditLog {
  id: string;
  event_type: string;
  actor_user_id: string | null;
  actor_name: string | null;
  company_id: string | null;
  entity_table: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EVENT_ICONS: Record<string, string> = {
  user_approved: "person_check",
  user_registered: "person_add",
  document_uploaded: "upload_file",
  document_verified: "verified",
  extraction_created: "manufacturing",
  extraction_approved: "done_all",
  extraction_rejected: "cancel",
  metric_computed: "calculate",
  metric_approved: "check_circle",
  report_generated: "description",
  report_published: "publish",
  workspace_created: "add_business",
  bank_access_created: "account_balance",
  bank_access_revoked: "block",
};

const EVENT_COLORS: Record<string, string> = {
  user_approved: "text-success bg-success-bg",
  user_registered: "text-info bg-info-bg",
  document_uploaded: "text-atlas-600 bg-atlas-50",
  extraction_approved: "text-success bg-success-bg",
  extraction_rejected: "text-danger bg-danger-bg",
  report_published: "text-atlas-600 bg-atlas-50",
  bank_access_created: "text-info bg-info-bg",
  bank_access_revoked: "text-danger bg-danger-bg",
};

function eventIcon(eventType: string): string {
  const key = eventType.toLowerCase().replace(/[\s.]+/g, "_");
  return EVENT_ICONS[key] ?? "monitor_heart";
}

function eventColor(eventType: string): string {
  const key = eventType.toLowerCase().replace(/[\s.]+/g, "_");
  return EVENT_COLORS[key] ?? "text-text-muted bg-surface-secondary";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: "Configuration", desc: "Scoring, AI and intake settings", icon: "tune", path: "/admin/config" },
  { label: "Companies", desc: "Manage company accounts", icon: "domain", path: "/admin/companies" },
  { label: "Users", desc: "Approve and manage access", icon: "group", path: "/admin/users" },
  { label: "Blueprint reviews", desc: "Approve generated questionnaires", icon: "fact_check", path: "/audit" },
];

// ─── Main page ────────────────────────────────────────────────────────────────

export function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pendingBlueprints, setPendingBlueprints] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = () => {
    apiClient("/admin/stats").then((res) => setStats(res as Stats)).catch(() => {});
    apiClient("/admin/audit-logs?limit=30").then((res) => setLogs((res as AuditLog[]) || [])).catch(() => {});
    apiClient<any[]>("/audit/blueprints").then((res) => setPendingBlueprints((res || []).length)).catch(() => {});
    setLastRefreshed(new Date());
    setSecondsAgo(0);
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setSecondsAgo((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, [lastRefreshed]);

  const refreshLabel = secondsAgo < 5 ? "just now" : `${secondsAgo}s ago`;

  return (
    <div className="space-y-6 animate-atlas-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="atlas-page-title">Overview</h1>
          <p className="atlas-page-subtitle">Platform health at a glance.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-[11px] text-text-muted">Live · updated {refreshLabel}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Companies" value={stats?.active_companies ?? "—"} icon="business_center" variant="success" />
        <StatCard label="Workspaces" value={stats?.workspace_count ?? "—"} icon="folder_open" variant="default" />
        <StatCard label="Active users" value={stats?.active_user_count ?? "—"} icon="group" variant="default" />
        <StatCard
          label="Pending approval"
          value={stats?.pending_user_count ?? "—"}
          icon="person_add"
          variant={stats?.pending_user_count ? "warning" : "muted"}
        />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Bank tokens" value={stats?.active_bank_token_count ?? "—"} icon="account_balance" variant="default" />
        <StatCard
          label="Blueprint reviews"
          value={pendingBlueprints}
          icon="fact_check"
          variant={pendingBlueprints > 0 ? "warning" : "muted"}
        />
        <StatCard label="Events today" value={stats?.events_today ?? 0} icon="timeline" variant="muted" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK_ACTIONS.map((a) => {
          const badge = a.path === "/audit" && pendingBlueprints > 0 ? pendingBlueprints : null;
          const urgent = a.path === "/admin/users" && (stats?.pending_user_count ?? 0) > 0;
          return (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              className="atlas-card atlas-card-hover p-4 flex items-center gap-3 text-left w-full"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative ${urgent || badge ? "bg-amber-50 border border-amber-200" : "bg-atlas-50 border border-atlas-200"}`}>
                <span className={`material-symbols-outlined text-[20px] ${urgent || badge ? "text-amber-600" : "text-atlas-600"}`}>
                  {a.icon}
                </span>
                {badge !== null && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-warning text-white text-[9px] font-bold flex items-center justify-center">
                    {badge}
                  </span>
                )}
                {urgent && !badge && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-warning text-white text-[9px] font-bold flex items-center justify-center">
                    {stats?.pending_user_count}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-text-primary">{a.label}</p>
                <p className="text-[11px] text-text-muted truncate">{a.desc}</p>
              </div>
              <span className="material-symbols-outlined text-[16px] text-text-muted ml-auto shrink-0">chevron_right</span>
            </button>
          );
        })}
      </div>

      {/* Activity feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold text-text-primary">Recent activity</h2>
          <span className="text-[12px] text-text-muted">{stats?.events_today ?? 0} events today</span>
        </div>

        <Card variant="flush">
          <div className="divide-y divide-border-light overflow-y-auto max-h-[480px]">
            {logs.length > 0 ? logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${eventColor(log.event_type)}`}>
                  <span className="material-symbols-outlined text-[16px]">{eventIcon(log.event_type)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-text-primary">
                    {formatEventType(log.event_type)}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5 truncate">
                    by <span className="font-medium text-text-secondary">{log.actor_name || formatAuditActor(log.actor_user_id)}</span>
                  </p>
                </div>
                <span className="text-[11px] text-text-muted shrink-0 whitespace-nowrap">
                  {timeAgo(log.created_at)}
                </span>
              </div>
            )) : (
              <div className="py-12 text-center">
                <span className="material-symbols-outlined text-[32px] text-text-muted mb-2 block">history</span>
                <p className="text-[13px] text-text-muted">No activity yet.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
