import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { ConfirmDialog } from "../../components/ui/Dialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { InlineAlert } from "../../components/ui/InlineAlert";
import { OnboardingChecklist } from "../../components/layout/OnboardingChecklist";
import { apiClient } from "../../lib/api-client";
import { copy } from "../../lib/copy";
import { useWorkspaceStore } from "../../store/workspace";
import { useMutation } from "@tanstack/react-query";
import { TraceabilityRing } from "../../components/ui/TraceabilityRing";
import { fetchHubSnapshot } from "../../lib/workspace-hub";
import { usePersonaMode } from "../../hooks/usePersonaMode";

type WorkspaceSummary = {
  id: string;
  name: string;
  description: string;
  company_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type PeriodProgress = Record<string, number>;
type PeriodTraceability = Record<string, number>;

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CompanyHome() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { setActiveCompany, setActiveWorkspace } = useWorkspaceStore();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("Loading…");
  const [periodProgress, setPeriodProgress] = useState<PeriodProgress>({});
  const [periodTraceability, setPeriodTraceability] = useState<PeriodTraceability>({});
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceSummary | null>(null);
  const { isLead } = usePersonaMode();

  const deleteWorkspace = useMutation({
    mutationFn: (workspaceId: string) => apiClient(`/companies/${companyId}/workspaces/${workspaceId}`, { method: "DELETE" }),
    onSuccess: (_, deletedId) => {
      setWorkspaces((prev) => prev.filter((w) => w.id !== deletedId));
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to delete reporting period.");
      setDeleteTarget(null);
    },
  });

  useEffect(() => {
    if (!companyId || companyId === "setup") return;

    apiClient(`/companies/${companyId}`)
      .then((data: any) => {
        setCompanyName(data.name || "Your organization");
        setActiveCompany(companyId, data.name);
      })
      .catch(() => setCompanyName("Your organization"));

    apiClient<WorkspaceSummary[]>(`/companies/${companyId}/workspaces`)
      .then((data) => setWorkspaces(data || []))
      .catch((err) => setErrorMessage(err.message || "Failed to load reporting periods."));
  }, [companyId, setActiveCompany]);

  useEffect(() => {
    if (!companyId || workspaces.length === 0) {
      setPeriodProgress({});
      setPeriodTraceability({});
      return;
    }

    const loadProgress = async () => {
      const progressEntries: PeriodProgress = {};
      const traceEntries: PeriodTraceability = {};
      await Promise.all(
        workspaces.map(async (ws) => {
          try {
            const hub = await fetchHubSnapshot(ws.id, companyId);
            progressEntries[ws.id] = hub.readinessPercent;
            traceEntries[ws.id] = hub.traceabilityScore;
          } catch {
            progressEntries[ws.id] = 0;
            traceEntries[ws.id] = 0;
          }
        })
      );
      setPeriodProgress(progressEntries);
      setPeriodTraceability(traceEntries);
    };

    void loadProgress();
  }, [companyId, workspaces]);

  if (companyId === "setup") {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center max-w-md mx-auto animate-atlas-in">
        <div className="w-16 h-16 bg-warning-bg rounded-full flex items-center justify-center mb-5 border border-warning-border">
          <span className="material-symbols-outlined text-[32px] text-warning">hourglass_empty</span>
        </div>
        <h2 className="text-[20px] font-bold text-text-primary mb-2">{copy.org.provisioningTitle}</h2>
        <p className="text-[13px] text-text-secondary leading-relaxed">{copy.org.provisioningBody}</p>
      </div>
    );
  }

  const hasPeriod = workspaces.length > 0;
  const anyUploads = Object.values(periodProgress).some((p) => p > 10);

  const onboardingItems = [
    {
      id: "period",
      label: "Create a reporting period",
      done: hasPeriod,
      actionLabel: "Create",
      onAction: () => navigate(`/c/${companyId}/workspaces/new`),
    },
    {
      id: "upload",
      label: "Upload your first source document",
      done: anyUploads,
      actionLabel: hasPeriod ? "Upload" : undefined,
      onAction: hasPeriod ? () => navigate(`/w/${workspaces[0].id}/documents`) : undefined,
    },
    {
      id: "report",
      label: "Open your report draft",
      done: Object.values(periodProgress).some((p) => p >= 50),
      actionLabel: hasPeriod ? "Open report" : undefined,
      onAction: hasPeriod ? () => navigate(`/w/${workspaces[0].id}/report`) : undefined,
    },
  ];

  const avgTraceability =
    workspaces.length > 0
      ? Math.round(Object.values(periodTraceability).reduce((a, b) => a + b, 0) / workspaces.length)
      : 0;

  const heroStats = [
    { label: "Reporting periods", value: workspaces.length, icon: "calendar_month" },
    { label: "Avg. readiness", value: workspaces.length ? `${Math.round(Object.values(periodProgress).reduce((a, b) => a + b, 0) / workspaces.length)}%` : "—", icon: "speed" },
    { label: "In progress", value: workspaces.filter((w) => w.status === "active").length, icon: "bolt" },
  ];

  return (
    <div className="space-y-6 animate-atlas-in">
      <div className="relative overflow-hidden bg-atlas-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-atlas-400 mb-1">{copy.org.dashboardEyebrow}</p>
            <h1 className="text-[24px] font-extrabold tracking-tight leading-tight">{companyName}</h1>
            <p className="text-[13px] text-atlas-300/80 mt-2 max-w-lg leading-relaxed">
              Know where your sustainability report stands—and what to do next—before the deadline.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {workspaces.length > 0 && (
              <TraceabilityRing value={avgTraceability} label={copy.period.traceability} size={88} />
            )}
            <Button onClick={() => navigate(`/c/${companyId}/workspaces/new`)} className="bg-atlas-500 hover:bg-atlas-400 text-white shadow-lg">
              <span className="material-symbols-outlined text-[18px]">add</span>
              {copy.org.newPeriod}
            </Button>
          </div>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-4 mt-6">
          {heroStats.map((stat) => (
            <div key={stat.label} className="glass-dark rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-atlas-400/70 text-[16px]">{stat.icon}</span>
                <span className="text-[10px] font-semibold text-atlas-400/70">{stat.label}</span>
              </div>
              <span className="text-[24px] font-bold text-white">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {companyId && <OnboardingChecklist companyId={companyId} items={onboardingItems} />}

      {errorMessage && <InlineAlert variant="danger">{errorMessage}</InlineAlert>}

      <h2 className="text-[16px] font-bold text-text-primary">{copy.org.reportingPeriods}</h2>

      {workspaces.length === 0 ? (
        <Card className="shadow-none border-dashed bg-surface-secondary/50">
          <EmptyState
            icon="folder_open"
            title={copy.org.noPeriodsTitle}
            description={copy.org.noPeriodsBody}
            actionLabel={copy.org.createPeriod}
            onAction={() => navigate(`/c/${companyId}/workspaces/new`)}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-fade">
          {workspaces.map((workspace) => {
            const progress = periodProgress[workspace.id] ?? 0;
            return (
              <Card key={workspace.id} variant="interactive" className="flex flex-col h-full border-t-4 border-t-atlas-500">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-[16px] font-bold text-text-primary mb-1">{workspace.name}</h3>
                    <Badge variant={workspace.status === "active" ? "green" : "gray"}>
                      {workspace.status === "active" ? "Active" : workspace.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-[13px] font-bold text-atlas-600 block">{progress}%</span>
                    {isLead && periodTraceability[workspace.id] != null && (
                      <span className="text-[10px] text-text-muted">{periodTraceability[workspace.id]}% traceable</span>
                    )}
                  </div>
                </div>
                <p className="text-[12px] text-text-secondary mb-2 flex-1">{workspace.description || "No description yet."}</p>
                <div className="h-1.5 rounded-full bg-surface-secondary mb-3 overflow-hidden">
                  <div className="h-full bg-atlas-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[11px] text-text-muted mb-4">Created {formatDate(workspace.created_at)}</p>
                <div className="flex gap-2 pt-4 border-t border-border mt-auto">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (companyId) setActiveCompany(companyId, companyName);
                      setActiveWorkspace(workspace.id, workspace.name);
                      navigate(`/w/${workspace.id}`);
                    }}
                  >
                    {copy.org.continue}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setDeleteTarget(workspace)}
                    className="px-3 !text-red-500 hover:bg-red-50"
                    title="Delete reporting period"
                    aria-label="Delete reporting period"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete reporting period?"
        message="This will permanently remove all uploads, reviews, and report data for this period."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteTarget && deleteWorkspace.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
