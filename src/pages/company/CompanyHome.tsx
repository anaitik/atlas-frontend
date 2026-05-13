import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { apiClient } from "../../lib/api-client";
import { env } from "../../lib/env";
import { useWorkspaceStore } from "../../store/workspace";
import { useMutation } from "@tanstack/react-query";

type WorkspaceSummary = {
  id: string;
  name: string;
  description: string;
  company_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type ExtractionSummary = {
  status: string;
  confidence_score?: number;
};

type ReportSummary = {
  status: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CompanyHome() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspaceId, setActiveCompany, setActiveWorkspace } = useWorkspaceStore();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("Loading Entity...");
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [publishedReportCount, setPublishedReportCount] = useState(0);

  const deleteWorkspace = useMutation({
    mutationFn: (workspaceId: string) => apiClient(`/companies/${companyId}/workspaces/${workspaceId}`, { method: "DELETE" }),
    onSuccess: (_, deletedId) => {
      setWorkspaces((prev) => prev.filter((w) => w.id !== deletedId));
    },
    onError: (err: any) => {
      setErrorMessage(err.message || "Failed to delete workspace.");
    },
  });

  useEffect(() => {
    if (!companyId || companyId === "setup") return;

    apiClient(`/companies/${companyId}`)
      .then((data: any) => {
        setCompanyName(data.name || "Entity Overview");
        setActiveCompany(companyId, data.name);
      })
      .catch(() => setCompanyName("Entity Overview"));

    apiClient<WorkspaceSummary[]>(`/companies/${companyId}/workspaces`)
      .then((data) => setWorkspaces(data || []))
      .catch((err) => setErrorMessage(err.message || "Failed to load workspaces."));
  }, [companyId, setActiveCompany]);

  useEffect(() => {
    if (!companyId || workspaces.length === 0) {
      setPendingReviewCount(0);
      setPublishedReportCount(0);
      return;
    }

    const loadEntityActivity = async () => {
      try {
        const extractionPromises = workspaces.map((workspace) => apiClient<any>(`/extraction?workspace_id=${workspace.id}`));
        const reportPromises = workspaces.map((workspace) =>
          apiClient<ReportSummary[]>(`/reports?company_id=${companyId}&workspace_id=${workspace.id}`)
        );

        const [extractionResults, reportResults] = await Promise.all([
          Promise.all(extractionPromises),
          Promise.all(reportPromises),
        ]);

        const extractions = extractionResults.flatMap((res) => (res?.items || res || []) as ExtractionSummary[]);
        const reports = reportResults.flatMap((res) => res || []);

        const pending = extractions.filter(
          (item) => item.status === "needs_review" || item.status === "pending_review" || (item.confidence_score ?? 1) < 0.85
        ).length;
        const published = reports.filter((report) => report.status === "published").length;

        setPendingReviewCount(pending);
        setPublishedReportCount(published);
      } catch {
        setPendingReviewCount(0);
        setPublishedReportCount(0);
      }
    };

    void loadEntityActivity();
  }, [companyId, workspaces]);

  if (companyId === "setup") {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center max-w-md mx-auto animate-atlas-in">
        <div className="w-16 h-16 bg-warning-bg rounded-full flex items-center justify-center mb-5 border border-warning-border">
          <span className="material-symbols-outlined text-[32px] text-warning">hourglass_empty</span>
        </div>
        <h2 className="text-[20px] font-bold text-text-primary mb-2">Account Provisioning</h2>
        <p className="text-[13px] text-text-secondary leading-relaxed">
          Your account needs to be assigned to an entity by the system administrator before you can access the platform.
        </p>
      </div>
    );
  }

  const activeCount = workspaces.filter((w) => w.status === "active").length || (workspaces.length > 0 ? 1 : 0);

  const heroStats = [
    { label: "Total Workspaces", value: workspaces.length, icon: "source_environment" },
    { label: "Active Now", value: activeCount, icon: "bolt" },
    { label: "Pending Review", value: pendingReviewCount, icon: "pending_actions" },
    { label: "Published Reports", value: publishedReportCount, icon: "workspace_premium" },
  ];

  return (
    <div className="space-y-6 animate-atlas-in">
      {env.DEMO_MODE && (
        <div className="rounded-lg border border-atlas-200 bg-atlas-50 px-3 py-2 text-[12px] text-atlas-800">
          <strong>Act 3 cue:</strong> Define reporting boundary (workspace) before evidence collection.
        </div>
      )}
      <div className="relative overflow-hidden bg-atlas-900 rounded-2xl p-8 text-white">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-atlas-500/10 blur-3xl transform translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-atlas-400/10 blur-3xl transform -translate-x-1/3 translate-y-1/3" />

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-xl bg-atlas-500/20 border border-atlas-400/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-atlas-400 text-[22px]">domain</span>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-atlas-400">Entity Dashboard</p>
                <h1 className="text-[24px] font-extrabold tracking-tight leading-tight">{companyName}</h1>
              </div>
            </div>
            <p className="text-[13px] text-atlas-300/70 mt-2 max-w-lg leading-relaxed">
              Manage your reporting boundaries, track ESG data collection progress, and generate verified sustainability reports.
            </p>
          </div>
          <Button onClick={() => navigate(`/c/${companyId}/workspaces/new`)} className="bg-atlas-500 hover:bg-atlas-400 text-white shadow-lg shadow-atlas-900/50">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Workspace
          </Button>
        </div>

        <div className="relative z-10 grid grid-cols-4 gap-4 mt-6">
          {heroStats.map((stat) => (
            <div key={stat.label} className="glass-dark rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-atlas-400/70 text-[16px]">{stat.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-atlas-400/60">{stat.label}</span>
              </div>
              <span className="text-[24px] font-bold text-white animate-counter-pop">{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-lg bg-danger-bg border border-danger-border text-danger text-[13px] flex items-center gap-2 animate-slide-up">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {errorMessage}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-text-primary">Reporting Periods</h2>
      </div>

      {workspaces.length === 0 ? (
        <Card className="py-16 text-center shadow-none border-dashed bg-surface-secondary/50">
          <span className="material-symbols-outlined text-[48px] text-text-muted mb-4 block">folder_open</span>
          <h3 className="text-[16px] font-semibold text-text-primary mb-1">No workspaces found</h3>
          <p className="text-[13px] text-text-secondary mb-6">Initialize a reporting boundary to begin the data pipeline.</p>
          <Button onClick={() => navigate(`/c/${companyId}/workspaces/new`)}>Initialize Workspace</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-5 stagger-fade">
          {workspaces.map((workspace) => {
            const isActiveContext = activeWorkspaceId === workspace.id;

            return (
              <Card key={workspace.id} variant="interactive" className={`flex flex-col h-full border-t-4 ${isActiveContext ? "border-t-atlas-400 ring-1 ring-atlas-400/20" : "border-t-atlas-500"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-[16px] font-bold text-text-primary mb-1">{workspace.name}</h3>
                    <Badge variant={workspace.status === "active" ? "green" : "gray"}>{workspace.status.toUpperCase()}</Badge>
                  </div>
                  {isActiveContext && (
                    <div className="flex items-center gap-1 text-atlas-500 animate-blockchain-confirm">
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </div>
                  )}
                </div>

                <p className="text-[12px] text-text-secondary mb-3 flex-1">{workspace.description || "No description provided."}</p>

                <div className="text-[10px] text-text-muted mb-4 font-mono">Created {formatDate(workspace.created_at)}</div>

                <div className="flex gap-2 pt-4 border-t border-border mt-auto">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (companyId) setActiveCompany(companyId, companyName);
                      setActiveWorkspace(workspace.id, workspace.name);
                      navigate(`/w/${workspace.id}/extraction`);
                    }}
                  >
                    Enter Workspace
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (companyId) navigate(`/c/${companyId}/settings`);
                    }}
                    className="px-3 hover:text-atlas-600 hover:bg-atlas-50"
                    title="Entity settings"
                  >
                    <span className="material-symbols-outlined text-[18px]">settings</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this workspace completely? All pipeline data will be lost.")) {
                        deleteWorkspace.mutate(workspace.id);
                      }
                    }}
                    className="px-3 !text-red-500 hover:bg-red-50"
                    title="Delete Workspace"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
