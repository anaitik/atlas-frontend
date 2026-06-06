import { apiClient } from "./api-client";
import { copy } from "./copy";

export type HubBlocker = {
  id: string;
  message: string;
  actionLabel?: string;
  actionPath?: string;
};

type WorkspaceSummary = {
  id: string;
  name: string;
  description?: string;
};

function reportDraftPercent(sections: unknown): number {
  if (!sections || typeof sections !== "object") return 0;
  const list = Array.isArray(sections) ? sections : Object.values(sections as Record<string, { content?: string }>);
  if (list.length === 0) return 0;
  const filled = list.filter((s) => s?.content && String(s.content).length > 20).length;
  return Math.round((filled / list.length) * 100);
}

async function fetchWorkspace(companyId: string, workspaceId: string): Promise<WorkspaceSummary | null> {
  const list = await apiClient<WorkspaceSummary[]>(`/companies/${companyId}/workspaces`).catch(() => []);
  return list.find((w) => w.id === workspaceId) ?? null;
}

export type HubSnapshot = {
  workspaceId: string;
  workspaceName: string;
  workspaceDescription?: string;
  companyId: string;
  reportDraftPercent: number;
  readinessPercent: number;
  uploadCount: number;
  pendingReviewCount: number;
  verifiedDocCount: number;
  reportStatus: string | null;
  blockers: HubBlocker[];
  stepStatuses: {
    setup: "complete" | "current" | "upcoming";
    upload: "complete" | "current" | "upcoming";
    review: "complete" | "current" | "upcoming";
    publish: "complete" | "current" | "upcoming";
  };
  primaryCta: { label: string; path: string; };
  trackStatus: "on_track" | "at_risk";
  traceabilityScore: number;
};

function parseDueDate(description?: string): Date | null {
  if (!description) return null;
  const iso = description.match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return new Date(iso[0]);
  const year = description.match(/FY\s?(\d{4})|(\d{4})/i);
  if (year) {
    const y = year[1] || year[2];
    return new Date(`${y}-12-31`);
  }
  return null;
}

export function formatDueLabel(description?: string): string | null {
  const due = parseDueDate(description);
  if (!due) return null;
  return due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export async function fetchHubSnapshot(workspaceId: string, companyId: string): Promise<HubSnapshot> {
  const [workspace, extractionsRes, reportsRes, metricsRes] = await Promise.all([
    fetchWorkspace(companyId, workspaceId),
    apiClient<any>(`/extraction?workspace_id=${workspaceId}`).catch(() => []),
    apiClient<any[]>(`/reports?company_id=${companyId}&workspace_id=${workspaceId}`).catch(() => []),
    apiClient<any[]>(`/metrics?company_id=${companyId}&workspace_id=${workspaceId}`).catch(() => []),
  ]);

  const workspaceName = workspace?.name || "Reporting period";
  const workspaceDescription = workspace?.description;
  const items = (Array.isArray(extractionsRes) ? extractionsRes : extractionsRes?.items || []) as any[];
  const uploadCount = items.length;
  const pendingReviewCount = items.filter(
    (i) => i.status === "needs_review" || i.status === "pending_review" || (i.confidence_score ?? 1) < 0.85
  ).length;
  const verifiedDocCount = items.filter((i) => i.sha256_hash || i.blockchain_tx_id).length;
  const reviewedCount = items.filter(
    (i) => i.status === "approved" || (i.confidence_score ?? 0) >= 0.85
  ).length;
  const traceabilityScore =
    uploadCount === 0 ? 0 : Math.round(((verifiedDocCount + reviewedCount) / (uploadCount * 2)) * 100);

  const reports = Array.isArray(reportsRes) ? reportsRes : [];
  const activeReport = reports.find((r) => r.status !== "archived") || reports[0];
  const reportStatus = activeReport?.status || null;
  const reportDraftPercentValue = activeReport?.sections
    ? reportDraftPercent(activeReport.sections)
    : activeReport
    ? 15
    : 0;

  const metrics = (Array.isArray(metricsRes) ? metricsRes : []) as Array<{ status?: string; approval_status?: string }>;
  const approvedMetrics = metrics.filter((m) => m.status === "approved" || m.approval_status === "approved").length;

  const uploadDone = uploadCount > 0;
  const reviewDone = uploadCount > 0 && pendingReviewCount === 0;
  const publishDone = reportStatus === "published";

  let readinessPercent = 0;
  if (uploadCount > 0) readinessPercent += 25;
  if (reviewDone) readinessPercent += 25;
  if (approvedMetrics > 0) readinessPercent += 25;
  readinessPercent += Math.min(25, Math.round(reportDraftPercentValue / 4));

  const blockers: HubBlocker[] = [];
  if (uploadCount === 0) {
    blockers.push({
      id: "no-uploads",
      message: "Upload at least one source document to begin.",
      actionLabel: copy.period.uploadDocuments,
      actionPath: `/w/${workspaceId}/documents`,
    });
  }
  if (pendingReviewCount > 0) {
    blockers.push({
      id: "pending-review",
      message: `${pendingReviewCount} item${pendingReviewCount > 1 ? "s" : ""} need reviewer approval.`,
      actionLabel: copy.period.continueReview,
      actionPath: `/w/${workspaceId}/review`,
    });
  }
  if (reportDraftPercentValue < 50 && uploadDone && reviewDone) {
    blockers.push({
      id: "report-incomplete",
      message: "Complete more sections in your report draft.",
      actionLabel: copy.period.openReport,
      actionPath: `/w/${workspaceId}/report`,
    });
  }

  const trackStatus: "on_track" | "at_risk" = blockers.length > 1 || pendingReviewCount > 5 ? "at_risk" : "on_track";

  let primaryCta: { label: string; path: string } = {
    label: copy.period.uploadDocuments,
    path: `/w/${workspaceId}/documents`,
  };
  if (uploadCount === 0) {
    primaryCta = { label: copy.period.uploadDocuments, path: `/w/${workspaceId}/documents` };
  } else if (pendingReviewCount > 0) {
    primaryCta = { label: copy.period.continueReview, path: `/w/${workspaceId}/review` };
  } else if (reportDraftPercentValue < 80) {
    primaryCta = { label: copy.period.openReport, path: `/w/${workspaceId}/report` };
  } else {
    primaryCta = { label: copy.period.exportReport, path: `/w/${workspaceId}/report` };
  }

  const step = (done: boolean, current: boolean): "complete" | "current" | "upcoming" => {
    if (done) return "complete";
    if (current) return "current";
    return "upcoming";
  };

  return {
    workspaceId,
    workspaceName,
    workspaceDescription,
    companyId,
    reportDraftPercent: reportDraftPercentValue,
    readinessPercent,
    uploadCount,
    pendingReviewCount,
    verifiedDocCount,
    reportStatus,
    blockers,
    trackStatus,
    traceabilityScore,
    primaryCta,
    stepStatuses: {
      setup: "complete",
      upload: step(uploadDone && reviewDone, uploadCount > 0 && !reviewDone),
      review: step(reviewDone && reportDraftPercentValue > 30, uploadDone && !reviewDone),
      publish: step(publishDone, reviewDone && !publishDone),
    },
  };
}
