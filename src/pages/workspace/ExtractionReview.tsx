import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge, StatusBadge } from "../../components/ui/Badge";
import { ConfidenceBar } from "../../components/ui/ConfidenceBar";
import { apiClient } from "../../lib/api-client";
import { env } from "../../lib/env";
import { useAuthStore } from "../../store/auth";

type ExtractionRecord = {
  id: string;
  document_id: string;
  document_filename?: string;
  template_id: string;
  template_name?: string;
  status: string;
  confidence_score: number;
  payload: Record<string, any>;
  created_at: string;
};

type InsightAggregate = {
  key: string;
  label: string;
  value: number;
  unit?: string | null;
};

type InsightIssue = {
  extraction_id: string;
  document_id: string;
  document_filename: string;
  field: string;
  issue_type: string;
  detail: string;
};

type BlueprintInsight = {
  template_id: string;
  template_name: string;
  documents_processed: number;
  approved_count: number;
  pending_count: number;
  rejected_count: number;
  average_confidence: number;
  low_confidence_count: number;
  missing_required_count: number;
  aggregates: InsightAggregate[];
  top_issues: InsightIssue[];
};

type EvidenceDocument = {
  extraction_id: string;
  document_id: string;
  document_filename: string;
  template_id: string;
  template_name: string;
  status: string;
  confidence_score: number;
  created_at: string;
  payload: Record<string, any>;
};

type ExtractionInsights = {
  workspace_id: string;
  total_documents: number;
  total_blueprints: number;
  needs_review_count: number;
  low_confidence_count: number;
  blueprints: BlueprintInsight[];
  evidence_documents: EvidenceDocument[];
};

type AuditEvent = {
  id: string;
  event_type: string;
  actor_user_id?: string | null;
  entity_table?: string | null;
  entity_id?: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

type ViewMode = "exceptions" | "insights";

function toLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function readByPath(payload: Record<string, any> | undefined, fieldPath: string | null): unknown {
  if (!payload || !fieldPath) return null;
  const parts = fieldPath.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let current: unknown = payload;
  for (const part of parts) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }
  return current ?? null;
}

export function ExtractionReview() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const deepLinkExtractionId = searchParams.get("extractionId");
  const deepLinkFieldPath = searchParams.get("fieldPath");
  const deepLinkMetricCode = searchParams.get("metricCode");
  const deepLinkFieldKey =
    deepLinkFieldPath
      ?.split(".")
      .filter(Boolean)
      .map((part) => part.replace(/\[\d+\]/g, ""))
      .filter(Boolean)
      .pop() || null;

  const [records, setRecords] = useState<ExtractionRecord[]>([]);
  const [insights, setInsights] = useState<ExtractionInsights | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ExtractionRecord | null>(null);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>("");
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string>("");
  const [localPayload, setLocalPayload] = useState<Record<string, any>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("exceptions");
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const [runResponse, insightResponse] = await Promise.all([
        apiClient<any>(`/extraction?workspace_id=${workspaceId}`),
        apiClient<ExtractionInsights>(`/extraction/insights?workspace_id=${workspaceId}`),
      ]);
      const runItems = (runResponse.items || runResponse || []) as ExtractionRecord[];
      setRecords(runItems);
      setInsights(insightResponse);

      if (runItems.length > 0) {
        const deepLinked = deepLinkExtractionId
          ? runItems.find((item) => item.id === deepLinkExtractionId)
          : null;
        const firstException = runItems.find(
          (item) => item.status !== "approved" || item.confidence_score < 0.85
        );
        const active = deepLinked || firstException || runItems[0];
        setSelectedRecord(active);
        setLocalPayload(active.payload || {});
      }

      if (insightResponse.blueprints.length > 0) {
        setSelectedBlueprintId((current) => current || insightResponse.blueprints[0].template_id);
      }
      if (insightResponse.evidence_documents.length > 0) {
        setSelectedEvidenceId((current) => current || insightResponse.evidence_documents[0].extraction_id);
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, deepLinkExtractionId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (selectedRecord) {
      setLocalPayload(selectedRecord.payload || {});
    }
  }, [selectedRecord]);

  useEffect(() => {
    if (!selectedRecord || !deepLinkFieldKey) return;
    const handle = window.setTimeout(() => {
      const target = document.querySelector<HTMLInputElement>(
        `[data-field-key="${CSS.escape(deepLinkFieldKey)}"]`
      );
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.focus();
        setEvidenceOpen(true);
      }
    }, 80);
    return () => window.clearTimeout(handle);
  }, [selectedRecord, deepLinkFieldKey]);

  useEffect(() => {
    if (!selectedRecord || !evidenceOpen) return;
    setAuditLoading(true);
    apiClient<AuditEvent[]>(`/extraction/${selectedRecord.id}/audit`)
      .then((items) => setAuditEvents(items || []))
      .catch(() => setAuditEvents([]))
      .finally(() => setAuditLoading(false));
  }, [selectedRecord, evidenceOpen]);

  const exceptionRecords = useMemo(
    () =>
      records.filter(
        (item) => item.status === "pending_review" || item.status === "failed" || item.confidence_score < 0.85
      ),
    [records]
  );

  const selectedBlueprint = useMemo(
    () => insights?.blueprints.find((item) => item.template_id === selectedBlueprintId) || null,
    [insights, selectedBlueprintId]
  );

  const blueprintEvidence = useMemo(
    () =>
      (insights?.evidence_documents || []).filter((item) =>
        selectedBlueprint ? item.template_id === selectedBlueprint.template_id : true
      ),
    [insights, selectedBlueprint]
  );

  const selectedEvidence = useMemo(
    () => blueprintEvidence.find((item) => item.extraction_id === selectedEvidenceId) || blueprintEvidence[0] || null,
    [blueprintEvidence, selectedEvidenceId]
  );

  const hasEdits =
    selectedRecord && JSON.stringify(localPayload || {}) !== JSON.stringify(selectedRecord.payload || {});
  const deepLinkedValue = useMemo(
    () => readByPath(selectedRecord?.payload || {}, deepLinkFieldPath),
    [selectedRecord, deepLinkFieldPath]
  );

  const handleApprove = async (record: ExtractionRecord, isBulk = false) => {
    setApproving(true);
    try {
      await apiClient(`/extraction/${record.id}/review`, {
        method: "POST",
        body: JSON.stringify({
          action: "approve",
          notes: "Approved in review cockpit",
          overrides: isBulk ? null : localPayload,
        }),
      });
      setStatusMessage(`Approved ${record.document_filename || record.id}.`);
      await loadData();
    } finally {
      setApproving(false);
    }
  };

  const handleBulkApprove = async () => {
    setApproving(true);
    try {
      for (const record of records.filter((item) => item.status !== "approved")) {
        await apiClient(`/extraction/${record.id}/review`, {
          method: "POST",
          body: JSON.stringify({ action: "approve", notes: "Bulk approve from queue", overrides: null }),
        });
      }
      setStatusMessage("All records approved. Redirecting to metrics.");
      await loadData();
      navigate(`/w/${workspaceId}/metrics`);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (record: ExtractionRecord) => {
    await apiClient(`/extraction/${record.id}/review`, {
      method: "POST",
      body: JSON.stringify({ action: "reject", notes: "Rejected from review cockpit" }),
    });
    setStatusMessage(`Rejected ${record.document_filename || record.id}.`);
    await loadData();
  };

  const handleDownloadSource = async (documentId: string, filename: string) => {
    const apiRoot = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "")
      || `${(env.API_BASE_URL || "").replace(/\/+$/, "")}${env.API_V1}`;
    const response = await fetch(`${apiRoot}/documents/${documentId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-text-muted">
        <span className="material-symbols-outlined text-[40px] animate-atlas-pulse mb-3 block">hourglass_top</span>
        <p className="text-[14px] font-medium">Loading review cockpit...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full animate-atlas-in">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="atlas-page-title">Review Cockpit</h1>
          <p className="atlas-page-subtitle">
            Exception-first verification with blueprint insights and evidence exploration.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate(`/w/${workspaceId}/extraction`)}>
            Back to Collection
          </Button>
          <Button
            disabled={records.filter((item) => item.status !== "approved").length === 0 || approving}
            onClick={handleBulkApprove}
          >
            Approve All and Run Metrics
          </Button>
        </div>
      </header>

      {statusMessage && (
        <div className="atlas-annotation flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {statusMessage}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-[11px] text-text-muted uppercase tracking-wide">Total Documents</p>
          <p className="text-2xl font-bold mt-1">{insights?.total_documents || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-text-muted uppercase tracking-wide">Needs Review</p>
          <p className="text-2xl font-bold mt-1 text-warning">{insights?.needs_review_count || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-text-muted uppercase tracking-wide">Low Confidence</p>
          <p className="text-2xl font-bold mt-1 text-danger">{insights?.low_confidence_count || 0}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-text-muted uppercase tracking-wide">Blueprints</p>
          <p className="text-2xl font-bold mt-1">{insights?.total_blueprints || 0}</p>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Button variant={viewMode === "exceptions" ? "primary" : "ghost"} onClick={() => setViewMode("exceptions")}>
          Review Exceptions
        </Button>
        <Button variant={viewMode === "insights" ? "primary" : "ghost"} onClick={() => setViewMode("insights")}>
          Blueprint Insights
        </Button>
      </div>

      {viewMode === "exceptions" && (
        <div className="grid grid-cols-[320px_1fr] gap-6">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="atlas-eyebrow">Needs Attention</h3>
              <Badge variant="amber">{exceptionRecords.length}</Badge>
            </div>
            <div className="space-y-2 max-h-[68vh] overflow-auto pr-1">
              {exceptionRecords.length === 0 && (
                <p className="text-xs text-text-muted italic bg-surface-secondary p-3 rounded-lg border border-border">
                  No pending exceptions right now.
                </p>
              )}
              {exceptionRecords.map((record) => (
                <button
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    selectedRecord?.id === record.id
                      ? "bg-atlas-500/5 border-atlas-500 ring-1 ring-atlas-500/20"
                      : "bg-surface border-border hover:border-atlas-300"
                  }`}
                >
                  <p className="text-[13px] font-semibold truncate">{record.document_filename || record.document_id}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <StatusBadge status={record.status} />
                    <ConfidenceBar value={record.confidence_score} size="sm" className="w-16" />
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {selectedRecord ? (
            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-border bg-surface-secondary flex items-start justify-between">
                <div>
                  <h2 className="text-[16px] font-bold text-text-primary">
                    {selectedRecord.document_filename || `Record ${selectedRecord.id.slice(-6)}`}
                  </h2>
                  <p className="text-[12px] text-text-secondary mt-1 flex items-center gap-2">
                    <span>{selectedRecord.template_name || selectedRecord.template_id}</span>
                    <span className="text-border">|</span>
                    <span>{new Date(selectedRecord.created_at).toLocaleString()}</span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() =>
                    void handleDownloadSource(
                      selectedRecord.document_id,
                      selectedRecord.document_filename || `${selectedRecord.document_id}.pdf`
                    )
                  }
                >
                  Source File
                </Button>
              </div>

              {deepLinkFieldPath && (
                <div className="px-4 py-3 border-b border-border bg-atlas-50/70 flex items-center justify-between gap-3">
                  <div className="text-[12px] text-atlas-800">
                    Trace context: <span className="font-mono">{deepLinkFieldPath}</span>
                  </div>
                  <Button variant="ghost" className="text-[11px]" onClick={() => setEvidenceOpen((open) => !open)}>
                    {evidenceOpen ? "Hide Evidence Drawer" : "Open Source at Field"}
                  </Button>
                </div>
              )}

              {evidenceOpen && deepLinkFieldPath && (
                <div className="p-4 border-b border-border bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[13px] font-bold text-text-primary">Field Evidence</h3>
                    <Badge variant="blue">Forensic Trace</Badge>
                  </div>
                  <div className="mb-3 p-2 rounded border border-border-light bg-surface-secondary text-[11px] text-text-secondary">
                    <span className="font-semibold">Lineage:</span>{" "}
                    <span className="font-mono">Metric({deepLinkMetricCode || "unknown"})</span>{" "}
                    {"->"} <span className="font-mono">Extraction({selectedRecord.id})</span>{" "}
                    {"->"} <span className="font-mono">Field({deepLinkFieldPath})</span>{" "}
                    {"->"} <span className="font-mono">Document({selectedRecord.document_id})</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div className="p-3 rounded border border-border-light bg-surface-secondary">
                      <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Field Path</p>
                      <p className="font-mono break-all text-text-primary">{deepLinkFieldPath}</p>
                    </div>
                    <div className="p-3 rounded border border-border-light bg-surface-secondary">
                      <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Extracted Value</p>
                      <p className="font-mono break-all text-text-primary">
                        {deepLinkedValue === null ? "Not found in payload path." : String(deepLinkedValue)}
                      </p>
                    </div>
                    <div className="p-3 rounded border border-border-light bg-surface-secondary">
                      <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Extraction Confidence</p>
                      <p className="text-text-primary">{Math.round((selectedRecord.confidence_score || 0) * 100)}%</p>
                    </div>
                    <div className="p-3 rounded border border-border-light bg-surface-secondary">
                      <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Source Document</p>
                      <p className="text-text-primary truncate">{selectedRecord.document_filename || selectedRecord.document_id}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      className="text-[11px] h-8"
                      onClick={() =>
                        void handleDownloadSource(
                          selectedRecord.document_id,
                          selectedRecord.document_filename || `${selectedRecord.document_id}.pdf`
                        )
                      }
                    >
                      Download Source File
                    </Button>
                    <Button variant="ghost" className="text-[11px] h-8" onClick={() => setEvidenceOpen(false)}>
                      Close Drawer
                    </Button>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-[12px] font-bold text-text-primary mb-2">Audit Timeline</h4>
                    {auditLoading ? (
                      <p className="text-[11px] text-text-muted">Loading audit events...</p>
                    ) : auditEvents.length === 0 ? (
                      <p className="text-[11px] text-text-muted">No audit events found for this extraction yet.</p>
                    ) : (
                      <div className="max-h-[180px] overflow-auto space-y-2 pr-1">
                        {auditEvents.map((event) => (
                          <div key={event.id} className="p-2 rounded border border-border-light bg-surface-secondary">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold text-text-primary">{event.event_type}</p>
                              <p className="text-[10px] text-text-muted">
                                {new Date(event.created_at).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-[10px] text-text-muted mt-1">
                              actor: {event.actor_user_id || "system"} | entity: {event.entity_table || "n/a"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="max-h-[62vh] overflow-auto">
                <table className="atlas-table">
                  <thead>
                    <tr>
                      <th className="w-[40%]">Field</th>
                      <th>Extracted Value (Editable)</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(localPayload || {}).map(([key, value]) => (
                      <tr
                        key={key}
                        className={`group ${deepLinkFieldKey === key ? "bg-atlas-50" : ""}`}
                      >
                        <td>
                          <div className="flex flex-col">
                            <span className="font-semibold text-text-primary">{toLabel(key)}</span>
                            <code className="text-[10px] text-text-muted mt-0.5">{key}</code>
                          </div>
                        </td>
                        <td>
                          <input
                            className="atlas-input h-10 py-1"
                            data-field-key={key}
                            value={typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}
                            onChange={(event) =>
                              setLocalPayload((current) => ({ ...current, [key]: event.target.value }))
                            }
                          />
                        </td>
                        <td className="text-right pr-3">
                          <button
                            className="text-text-muted hover:text-danger opacity-0 group-hover:opacity-100"
                            onClick={() => {
                              const next = { ...localPayload };
                              delete next[key];
                              setLocalPayload(next);
                            }}
                          >
                            <span className="material-symbols-outlined text-[18px]">clear</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-border bg-surface-secondary flex items-center justify-between">
                <div className="text-[12px] text-text-secondary">
                  {hasEdits ? "Unsaved overrides are ready for approval." : "Using original extraction output."}
                </div>
                <div className="flex gap-2">
                  {deepLinkFieldPath && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        searchParams.delete("extractionId");
                        searchParams.delete("fieldPath");
                        setSearchParams(searchParams);
                      }}
                    >
                      Clear Trace Context
                    </Button>
                  )}
                  <Button variant="ghost" className="text-danger" onClick={() => void handleReject(selectedRecord)}>
                    Reject
                  </Button>
                  <Button disabled={approving} onClick={() => void handleApprove(selectedRecord)}>
                    {approving ? "Saving..." : "Approve and Finalize"}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-16 text-center text-text-muted">No record selected.</Card>
          )}
        </div>
      )}

      {viewMode === "insights" && (
        <div className="grid grid-cols-[360px_1fr] gap-6">
          <Card className="p-4 space-y-3">
            <h3 className="atlas-eyebrow">Blueprint Health</h3>
            <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
              {(insights?.blueprints || []).map((bp) => (
                <button
                  key={bp.template_id}
                  onClick={() => setSelectedBlueprintId(bp.template_id)}
                  className={`w-full text-left p-3 rounded-lg border transition ${
                    selectedBlueprintId === bp.template_id
                      ? "bg-atlas-500/5 border-atlas-500 ring-1 ring-atlas-500/20"
                      : "bg-surface border-border hover:border-atlas-300"
                  }`}
                >
                  <p className="text-[13px] font-semibold truncate">{bp.template_name}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-text-secondary">
                    <span>{bp.documents_processed} docs</span>
                    <span>{Math.round(bp.average_confidence * 100)}% avg conf</span>
                    <span className="text-warning">{bp.pending_count} pending</span>
                    <span className="text-danger">{bp.missing_required_count} missing</span>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            {selectedBlueprint ? (
              <>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[16px] font-bold">{selectedBlueprint.template_name}</h2>
                      <p className="text-[12px] text-text-secondary mt-1">
                        Aggregates and quality signals for this blueprint.
                      </p>
                    </div>
                    <Badge variant="gray">{selectedBlueprint.documents_processed} documents</Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {selectedBlueprint.aggregates.length > 0 ? (
                      selectedBlueprint.aggregates.map((item) => (
                        <div key={item.key} className="p-3 rounded-lg border border-border bg-surface-secondary">
                          <p className="text-[11px] text-text-muted uppercase tracking-wide">{item.label}</p>
                          <p className="text-[18px] font-bold mt-1">{item.value.toLocaleString()}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-[12px] text-text-muted col-span-3">No numeric aggregates available yet.</p>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="text-[13px] font-bold">Top Issues</h3>
                  <div className="mt-3 space-y-2">
                    {selectedBlueprint.top_issues.length === 0 && (
                      <p className="text-[12px] text-text-muted">No major issues detected.</p>
                    )}
                    {selectedBlueprint.top_issues.map((issue, index) => (
                      <button
                        key={`${issue.extraction_id}-${index}`}
                        className="w-full text-left p-3 rounded-lg border border-border bg-surface-secondary hover:border-atlas-300"
                        onClick={() => {
                          setSelectedEvidenceId(issue.extraction_id);
                        }}
                      >
                        <p className="text-[12px] font-semibold">{issue.document_filename}</p>
                        <p className="text-[11px] text-text-secondary mt-1">{issue.field} - {issue.detail}</p>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-bold">Evidence Explorer</h3>
                    <Badge variant="gray">{blueprintEvidence.length} docs</Badge>
                  </div>

                  <div className="grid grid-cols-[260px_1fr] gap-4 mt-3">
                    <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                      {blueprintEvidence.map((doc) => (
                        <button
                          key={doc.extraction_id}
                          className={`w-full text-left p-2.5 rounded-lg border transition ${
                            selectedEvidence?.extraction_id === doc.extraction_id
                              ? "bg-atlas-500/5 border-atlas-500"
                              : "bg-surface border-border"
                          }`}
                          onClick={() => setSelectedEvidenceId(doc.extraction_id)}
                        >
                          <p className="text-[12px] font-semibold truncate">{doc.document_filename}</p>
                          <div className="mt-1 flex items-center justify-between">
                            <StatusBadge status={doc.status} />
                            <ConfidenceBar value={doc.confidence_score} size="sm" className="w-14" />
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="rounded-lg border border-border bg-surface-secondary p-3">
                      {selectedEvidence ? (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[12px] font-semibold">{selectedEvidence.document_filename}</p>
                            <Button
                              variant="ghost"
                              className="text-[11px]"
                              onClick={() =>
                                void handleDownloadSource(
                                  selectedEvidence.document_id,
                                  selectedEvidence.document_filename
                                )
                              }
                            >
                              Open Source
                            </Button>
                          </div>
                          <pre className="text-[11px] max-h-[250px] overflow-auto whitespace-pre-wrap">
                            {JSON.stringify(selectedEvidence.payload || {}, null, 2)}
                          </pre>
                        </>
                      ) : (
                        <p className="text-[12px] text-text-muted">Select an evidence document to inspect extracted fields.</p>
                      )}
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-16 text-center text-text-muted">No blueprint insights yet.</Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
