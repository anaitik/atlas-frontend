import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { InlineAlert } from "../../components/ui/InlineAlert";
import { PublishReadinessCard } from "../../components/ui/PublishReadinessCard";
import { Stepper } from "../../components/ui/Stepper";
import { Tabs } from "../../components/ui/Tabs";
import { TraceabilityRing } from "../../components/ui/TraceabilityRing";
import { EvidenceMap } from "../../components/trust/EvidenceMap";
import { copy } from "../../lib/copy";
import { apiClient } from "../../lib/api-client";
import { fetchHubSnapshot, formatDueLabel, type HubSnapshot } from "../../lib/workspace-hub";
import { useWorkspaceStore } from "../../store/workspace";

export function WorkspaceHub() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { activeCompanyId, setActiveWorkspace } = useWorkspaceStore();
  const [hub, setHub] = useState<HubSnapshot | null>(null);
  const [dueLabel, setDueLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("readiness");
  const [reportPreview, setReportPreview] = useState<{ percent: number; status: string | null }>({ percent: 0, status: null });

  useEffect(() => {
    if (!workspaceId || !activeCompanyId) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const snapshot = await fetchHubSnapshot(workspaceId, activeCompanyId);
        setActiveWorkspace(workspaceId, snapshot.workspaceName);
        setDueLabel(formatDueLabel(snapshot.workspaceDescription));
        setHub(snapshot);
        setReportPreview({ percent: snapshot.reportDraftPercent, status: snapshot.reportStatus });
      } catch (e: any) {
        setError(e?.message || "Failed to load reporting period.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [workspaceId, activeCompanyId, setActiveWorkspace]);

  useEffect(() => {
    if (activeTab !== "report" || !workspaceId || !activeCompanyId) return;
    apiClient(`/reports?company_id=${activeCompanyId}&workspace_id=${workspaceId}`)
      .then((reports: any) => {
        const list = Array.isArray(reports) ? reports : [];
        const r = list.find((x: any) => x.status !== "archived") || list[0];
        if (!r) return;
        const sections = r.sections ? Object.values(r.sections) : [];
        const filled = sections.filter((s: any) => s?.content && String(s.content).length > 20).length;
        const pct = sections.length ? Math.round((filled / sections.length) * 100) : 0;
        setReportPreview({ percent: pct, status: r.status });
      })
      .catch(() => {});
  }, [activeTab, workspaceId, activeCompanyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted text-[13px]">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Loading reporting period…
      </div>
    );
  }

  if (error || !hub) {
    return (
      <InlineAlert variant="danger">
        {error || "Unable to load this reporting period."}
        {activeCompanyId && (
          <button type="button" className="ml-2 underline font-semibold" onClick={() => navigate(`/c/${activeCompanyId}`)}>
            Back to organization home
          </button>
        )}
      </InlineAlert>
    );
  }

  const steps = [
    { id: "setup", label: copy.steps.setup, status: hub.stepStatuses.setup, detail: undefined },
    {
      id: "upload",
      label: copy.steps.upload,
      status: hub.stepStatuses.upload,
      detail: hub.uploadCount > 0 ? `${hub.uploadCount} files` : undefined,
    },
    {
      id: "review",
      label: copy.steps.review,
      status: hub.stepStatuses.review,
      detail: hub.pendingReviewCount > 0 ? `${hub.pendingReviewCount} left` : undefined,
    },
    {
      id: "publish",
      label: copy.steps.publish,
      status: hub.stepStatuses.publish,
      detail: hub.reportDraftPercent > 0 ? `${hub.reportDraftPercent}% draft` : undefined,
    },
  ];

  const tabs = [
    { id: "readiness", label: copy.period.tabReadiness },
    { id: "documents", label: copy.period.tabDocuments },
    { id: "report", label: copy.period.tabReport },
    { id: "evidence", label: copy.period.tabEvidence },
  ];

  return (
    <div className="space-y-6 animate-atlas-in">
      <div className="relative overflow-hidden rounded-2xl bg-atlas-900 p-8 text-white">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold text-atlas-400 mb-1">{copy.period.hubTitle}</p>
            <h1 className="text-[24px] font-extrabold tracking-tight">{hub.workspaceName}</h1>
            <p className="text-[13px] text-atlas-300/80 mt-2">
              Sustainability report · {hub.reportDraftPercent}% draft complete
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-[12px]">
              {dueLabel && (
                <span className="text-atlas-300">
                  {copy.period.dueLabel}: {dueLabel}
                </span>
              )}
              <span
                className={`px-2.5 py-0.5 rounded-full font-semibold ${
                  hub.trackStatus === "on_track" ? "bg-atlas-500/30 text-atlas-100" : "bg-amber-500/30 text-amber-100"
                }`}
              >
                {hub.trackStatus === "on_track" ? copy.period.onTrack : copy.period.atRisk}
              </span>
            </div>
          </div>
          <TraceabilityRing value={hub.traceabilityScore} label={copy.period.traceability} size={100} />
        </div>
        <div className="relative z-10 flex flex-wrap gap-2 mt-6">
          <Button className="bg-atlas-500 hover:bg-atlas-400 text-white" onClick={() => navigate(hub.primaryCta.path)}>
            {hub.primaryCta.label}
          </Button>
          <Button
            variant="outline"
            className="border-atlas-400/40 text-atlas-100 hover:bg-atlas-800"
            onClick={() => navigate(`/w/${workspaceId}/report`)}
          >
            {copy.period.openReport}
          </Button>
        </div>
      </div>

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {activeTab === "readiness" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="text-[14px] font-bold text-text-primary mb-4">{copy.period.readiness}</h2>
              <Stepper steps={steps} />
              <p className="text-[12px] text-text-secondary mt-4">
                {copy.period.evidenceComplete}: {hub.verifiedDocCount}/{hub.uploadCount || 0} documents secured
              </p>
            </Card>
            <PublishReadinessCard
              blockers={hub.blockers}
              primaryLabel={hub.primaryCta.label}
              onPrimary={() => navigate(hub.primaryCta.path)}
              secondaryLabel={copy.period.openReport}
              onSecondary={() => navigate(`/w/${workspaceId}/report`)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-[11px] text-text-muted font-medium">Documents uploaded</p>
              <p className="text-[22px] font-bold text-text-primary mt-1">{hub.uploadCount}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-text-muted font-medium">Awaiting review</p>
              <p className="text-[22px] font-bold text-text-primary mt-1">{hub.pendingReviewCount}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-text-muted font-medium">Report draft</p>
              <p className="text-[22px] font-bold text-atlas-600 mt-1">{hub.reportDraftPercent}%</p>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <Card className="p-6">
          <p className="text-[13px] text-text-secondary mb-4">
            {hub.uploadCount === 0
              ? "No documents yet. Upload source files to begin building your report."
              : `${hub.uploadCount} document${hub.uploadCount > 1 ? "s" : ""} uploaded · ${hub.pendingReviewCount} awaiting review.`}
          </p>
          <Button onClick={() => navigate(`/w/${workspaceId}/documents`)}>{copy.period.uploadDocuments}</Button>
        </Card>
      )}

      {activeTab === "report" && (
        <Card className="p-6">
          <p className="text-[13px] text-text-secondary mb-2">
            Report draft: <strong className="text-atlas-600">{reportPreview.percent}%</strong>
            {reportPreview.status && ` · Status: ${reportPreview.status}`}
          </p>
          <Button onClick={() => navigate(`/w/${workspaceId}/report`)}>{copy.period.openReport}</Button>
        </Card>
      )}

      {activeTab === "evidence" && (
        <div className="space-y-4">
          <EvidenceMap
            rows={[
              {
                id: "trace",
                metricLabel: copy.period.traceability,
                value: `${hub.traceabilityScore}%`,
                status: hub.traceabilityScore >= 80 ? "verified" : "pending",
              },
            ]}
            title={copy.trust.verificationSummary}
          />
          <Button variant="ghost" onClick={() => navigate(`/w/${workspaceId}/evidence`)}>
            {copy.trust.evidenceTrail}
          </Button>
        </div>
      )}

      {activeCompanyId && (
        <Button variant="ghost" onClick={() => navigate(`/c/${activeCompanyId}`)}>
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Organization home
        </Button>
      )}
    </div>
  );
}
