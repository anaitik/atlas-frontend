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
import { Sparkline } from "../../components/ui/Sparkline";
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
type PeriodInterview = Record<string, number>; // workspace_id → completion_pct
type PeriodEsgScore = Record<string, number>;  // workspace_id → overall_esg_score

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
  const [periodInterview, setPeriodInterview] = useState<PeriodInterview>({});
  const [periodEsgScore, setPeriodEsgScore] = useState<PeriodEsgScore>({});
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceSummary | null>(null);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);
  const { isLead } = usePersonaMode();

  // Mandatory company info must be complete before a reporting period can be created.
  const goCreatePeriod = () => {
    if (profileComplete === false) navigate(`/c/${companyId}/profile`);
    else navigate(`/c/${companyId}/workspaces/new`);
  };

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
        setProfileComplete(Boolean(data.profile_complete));
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
      const interviewEntries: PeriodInterview = {};
      const esgScoreEntries: PeriodEsgScore = {};
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
          try {
            const ip = await apiClient(`/interview/workspace/${ws.id}/progress`) as any;
            const d = ip?.data ?? ip;
            interviewEntries[ws.id] = d?.completion_pct ?? 0;
            esgScoreEntries[ws.id] = d?.overall_esg_score ?? 0;
          } catch {
            interviewEntries[ws.id] = 0;
            esgScoreEntries[ws.id] = 0;
          }
        })
      );
      setPeriodProgress(progressEntries);
      setPeriodTraceability(traceEntries);
      setPeriodInterview(interviewEntries);
      setPeriodEsgScore(esgScoreEntries);
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

  const anyInterviewStarted = Object.values(periodInterview).some((p) => p > 0);
  const anyInterviewComplete = Object.values(periodInterview).some((p) => p === 100);

  const onboardingItems = [
    {
      id: "profile",
      label: "Complete company information",
      done: profileComplete === true,
      actionLabel: profileComplete ? "Edit" : "Complete",
      onAction: () => navigate(`/c/${companyId}/profile`),
    },
    {
      id: "period",
      label: "Create a reporting period",
      done: hasPeriod,
      actionLabel: "Create",
      onAction: goCreatePeriod,
    },
    {
      id: "interview",
      label: "Complete the ESG data interview",
      done: anyInterviewComplete,
      actionLabel: hasPeriod ? (anyInterviewStarted ? "Continue" : "Start") : undefined,
      onAction: hasPeriod ? () => navigate(`/w/${workspaces[0].id}/collect`) : undefined,
    },
    {
      id: "upload",
      label: "Upload supporting documents",
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
      <div
        className="relative overflow-hidden rounded-2xl p-8 text-white"
        style={{
          background: "linear-gradient(135deg, #031a0c 0%, #052e16 40%, #0a3d1f 75%, #14532d 100%)",
          boxShadow: "0 18px 48px rgba(5,46,22,0.30)",
        }}
      >
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%)" }} />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold text-atlas-400 mb-1">{copy.org.dashboardEyebrow}</p>
            <h1 className="text-[24px] font-extrabold tracking-tight leading-tight">{companyName}</h1>
            <p className="text-[13px] text-atlas-300/80 mt-2 max-w-lg leading-relaxed">
              Build your verified ESG profile, track your sustainability performance, and share it with lenders who require it.
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            {workspaces.length > 0 && (
              <TraceabilityRing value={avgTraceability} label={copy.period.traceability} size={88} />
            )}
            <Button onClick={goCreatePeriod} className="bg-atlas-500 hover:bg-atlas-400 text-white shadow-lg">
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

      {/* ESG Score trend — shown only when 2+ workspaces have scores */}
      {(() => {
        const scoredWorkspaces = workspaces
          .map((ws) => ({ name: ws.name, score: periodEsgScore[ws.id] ?? 0 }))
          .filter((ws) => ws.score > 0);
        if (scoredWorkspaces.length < 2) return null;
        const latestScore = scoredWorkspaces[scoredWorkspaces.length - 1].score;
        const prevScore = scoredWorkspaces[scoredWorkspaces.length - 2].score;
        const delta = latestScore - prevScore;
        return (
          <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-5 shadow-sm">
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">ESG Score Trend</p>
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-black text-gray-900">{latestScore}</span>
                <span className="text-[12px] text-gray-400">/100</span>
                {delta !== 0 && (
                  <span className={`text-[12px] font-bold ${delta > 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {delta > 0 ? "+" : ""}{delta} pts
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">Across {scoredWorkspaces.length} reporting periods</p>
            </div>
            <Sparkline
              data={scoredWorkspaces.map((ws) => ws.score)}
              color="#22c55e"
              height={40}
              className="w-24 shrink-0"
            />
          </div>
        );
      })()}

      {profileComplete === false && (
        <InlineAlert variant="warning">
          <div className="flex items-center justify-between gap-3 w-full">
            <span>Complete your company information to tailor the ESG interview and unlock reporting periods.</span>
            <Button variant="ghost" onClick={() => navigate(`/c/${companyId}/profile`)} className="shrink-0 text-amber-700">
              Complete now
            </Button>
          </div>
        </InlineAlert>
      )}

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
            onAction={goCreatePeriod}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-fade">
          {workspaces.map((workspace) => {
            const progress = periodProgress[workspace.id] ?? 0;
            const interviewPct = periodInterview[workspace.id] ?? 0;
            const esgScore = periodEsgScore[workspace.id] ?? 0;
            const interviewDone = interviewPct === 100;
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

                {/* ESG Interview progress strip */}
                <div
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-3 cursor-pointer transition-colors ${
                    interviewDone
                      ? "bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                      : "bg-atlas-50 border border-atlas-200 hover:bg-atlas-100"
                  }`}
                  onClick={() => navigate(`/w/${workspace.id}/collect`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && navigate(`/w/${workspace.id}/collect`)}
                >
                  <span className={`material-symbols-outlined text-[15px] ${interviewDone ? "text-emerald-600" : "text-atlas-600"}`}>
                    {interviewDone ? "check_circle" : "quiz"}
                  </span>
                  <span className={`text-[11px] font-semibold flex-1 ${interviewDone ? "text-emerald-700" : "text-atlas-700"}`}>
                    ESG Interview
                  </span>
                  {esgScore > 0 ? (
                    <span className={`text-[11px] font-black ${interviewDone ? "text-emerald-600" : "text-atlas-600"}`}>
                      {esgScore}/100
                    </span>
                  ) : (
                    <span className={`text-[11px] font-bold ${interviewDone ? "text-emerald-600" : "text-atlas-600"}`}>
                      {interviewPct}%
                    </span>
                  )}
                </div>

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
                    onClick={() => navigate(`/c/${companyId}/workspaces/${workspace.id}/profile`)}
                    className="px-3 text-text-muted hover:text-atlas-600"
                    title="Edit company profile"
                    aria-label="Edit company profile"
                  >
                    <span className="material-symbols-outlined text-[18px]">tune</span>
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
