import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { StatCard } from "../../components/ui/StatCard";
import { Badge } from "../../components/ui/Badge";
import { apiClient } from "../../lib/api-client";

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    apiClient("/admin/stats").then(setStats).catch(console.error);
    apiClient("/admin/audit-logs").then((res: any) => setLogs(res || [])).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between mb-8">
        <div>
          <h1 className="atlas-page-title text-atlas-600">Platform Analytics</h1>
          <p className="atlas-page-subtitle">System-level health, entity provisioning, and global footprint.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total Entities"
          value={stats?.tenant_count ?? "—"}
          icon="domain"
          variant="default"
        />
        <StatCard
          label="Active Users"
          value={stats?.active_user_count ?? "—"}
          icon="group"
          variant="success"
        />
        <StatCard
          label="Pending Access Requests"
          value={stats?.pending_user_count ?? "—"}
          icon="person_add"
          variant="warning"
        />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-bold text-text-primary">Real-time Audit Pipeline</h2>
          <Badge variant="blue">SYSTEM ACTIVE</Badge>
        </div>
        
        <Card variant="flush">
          <div className="divide-y divide-border overflow-y-auto max-h-[500px]">
            {logs.length > 0 ? logs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-surface-secondary transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-secondary flex items-center justify-center border border-border">
                    <span className="material-symbols-outlined text-text-muted text-[20px]">monitor_heart</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-text-primary">{log.event_type.replace(/_/g, " ").toUpperCase()}</p>
                    <p className="text-[12px] text-text-secondary mt-0.5">
                      Actor: <span className="font-medium text-text-primary">{log.actor_user_id || "system"}</span> · 
                      Entity: <span className="font-medium text-text-primary">{log.entity_table || "n/a"}</span> 
                      ({log.entity_id?.slice(0, 8) || "—"})
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-text-muted">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            )) : (
              <div className="py-12 text-center">
                 <span className="material-symbols-outlined text-[32px] text-text-muted mb-2 block">history</span>
                 <p className="text-[13px] text-text-secondary">No audit events generated yet.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
