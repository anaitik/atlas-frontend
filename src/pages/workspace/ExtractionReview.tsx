import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Badge, StatusBadge } from "../../components/ui/Badge";
import { ConfidenceBar } from "../../components/ui/ConfidenceBar";
import { ConfirmDialog, PromptDialog } from "../../components/ui/Dialog";
import { apiClient } from "../../lib/api-client";
import { copy } from "../../lib/copy";
import {
  displayDocumentLabel,
  displayRecordTitle,
  displayTemplateLabel,
  resolveActorName,
  formatEntityTable,
  formatEventType,
  formatFieldPath,
} from "../../lib/display-labels";
import { env } from "../../lib/env";
import { useAuthStore } from "../../store/auth";
import { usePersonaMode } from "../../hooks/usePersonaMode";
import {
  DocumentTypeHealthCard,
  DocumentTypeHealthSummary,
  FieldValueTable,
  SourceTrail,
  TechnicalDetailsDrawer,
} from "../../components/expert";

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
  actor_name?: string | null;
  actor_email?: string | null;
  entity_table?: string | null;
  entity_id?: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

type ViewMode = "exceptions" | "insights";

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
  const { isLead, showTechnicalDetails } = usePersonaMode();
  const [technicalDrawerOpen, setTechnicalDrawerOpen] = useState(false);
  const [technicalDrawerPayload, setTechnicalDrawerPayload] = useState<Record<string, unknown> | null>(null);
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
  const [overrideDialog, setOverrideDialog] = useState<{ record: ExtractionRecord } | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ record: ExtractionRecord } | null>(null);
  const [bulkApproveDialog, setBulkApproveDialog] = useState(false);

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
    const recordHasEdits =
      !isBulk &&
      selectedRecord?.id === record.id &&
      JSON.stringify(localPayload || {}) !== JSON.stringify(record.payload || {});

    if (recordHasEdits) {
      setOverrideDialog({ record });
      return;
    }

    setApproving(true);
    try {
      await apiClient(`/extraction/${record.id}/review`, {
        method: "POST",
        body: JSON.stringify({ action: "approve", notes: "Approved from review queue", overrides: null }),
      });
      setStatusMessage(`Approved ${displayDocumentLabel(record.document_filename)}.`);
      await loadData();
    } finally {
      setApproving(false);
    }
  };

  const handleApproveWithOverride = async (record: ExtractionRecord, notes: string) => {
    setOverrideDialog(null);
    setApproving(true);
    try {
      await apiClient(`/extraction/${record.id}/review`, {
        method: "POST",
        body: JSON.stringify({ action: "approve", notes: `Override: ${notes}`, overrides: localPayload }),
      });
      setStatusMessage(`Approved ${displayDocumentLabel(record.document_filename)}.`);
      await loadData();
    } finally {
      setApproving(false);
    }
  };

  const handleBulkApprove = () => {
    const pending = records.filter((item) => item.status !== "approved");
    if (pending.length === 0) return;
    setBulkApproveDialog(true);
  };

  const handleBulkApproveConfirm = async () => {
    setBulkApproveDialog(false);
    const pending = records.filter((item) => item.status !== "approved");
    setApproving(true);
    try {
      for (const record of pending) {
        await apiClient(`/extraction/${record.id}/review`, {
          method: "POST",
          body: JSON.stringify({ action: "approve", notes: "Bulk approve from review queue", overrides: null }),
        });
      }
      setStatusMessage("All documents approved.");
      await loadData();
      navigate(`/w/${workspaceId}/metrics`);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = (record: ExtractionRecord) => {
    setRejectDialog({ record });
  };

  const handleRejectConfirm = async (record: ExtractionRecord, rationale: string) => {
    setRejectDialog(null);
    await apiClient(`/extraction/${record.id}/review`, {
      method: "POST",
      body: JSON.stringify({ action: "reject", notes: rationale }),
    });
    setStatusMessage(`Rejected ${displayDocumentLabel(record.document_filename)}.`);
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
        <p className="text-[14px] font-medium">Loading approval queue…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto w-full animate-atlas-in">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="atlas-page-title">{copy.review.title}</h1>
          <p className="atlas-page-subtitle">{copy.review.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => navigate(isLead ? `/w/${workspaceId}/documents` : `/w/${workspaceId}/extraction`)}
          >
            Back to documents
          </Button>
          <Button
            disabled={records.filter((item) => item.status !== "approved").length === 0 || approving}
            onClick={handleBulkApprove}
          >
            {copy.expert.approveAllContinue}
          </Button>
        </div>
      </header>

      {statusMessage && (
        <div className="atlas-annotation flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {statusMessage}
        </div>
      )}

      <DocumentTypeHealthSummary
        totalDocuments={insights?.total_documents || 0}
        needsReview={insights?.needs_review_count || 0}
        lowConfidence={insights?.low_confidence_count || 0}
        documentTypeCount={insights?.total_blueprints || 0}
      />

      <div className="flex items-center gap-2">
        <Button variant={viewMode === "exceptions" ? "primary" : "ghost"} onClick={() => setViewMode("exceptions")}>
          {copy.expert.needsAttention}
        </Button>
        <Button variant={viewMode === "insights" ? "primary" : "ghost"} onClick={() => setViewMode("insights")}>
          {copy.expert.documentTypeHealth}
        </Button>
      </div>

      {viewMode === "exceptions" && (
        <div className="grid grid-cols-[320px_1fr] gap-6">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="atlas-eyebrow">{copy.expert.needsAttention}</h3>
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
                  <p className="text-[13px] font-semibold truncate">
                    {displayRecordTitle(record.document_filename, record.created_at)}
                  </p>
                  <p className="text-[11px] text-text-muted truncate mt-0.5">
                    {displayTemplateLabel(record.template_name)}
                  </p>
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
                    {displayRecordTitle(selectedRecord.document_filename, selectedRecord.created_at)}
                  </h2>
                  <p className="text-[12px] text-text-secondary mt-1 flex items-center gap-2">
                    <span>{displayTemplateLabel(selectedRecord.template_name)}</span>
                    <span className="text-border">|</span>
                    <span>{new Date(selectedRecord.created_at).toLocaleString()}</span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() =>
                    void handleDownloadSource(
                      selectedRecord.document_id,
                      selectedRecord.document_filename || "source-document.pdf"
                    )
                  }
                >
                  Source File
                </Button>
              </div>

              {deepLinkFieldPath && (
                <div className="px-4 py-3 border-b border-border bg-atlas-50/70 flex items-center justify-between gap-3">
                  <div className="text-[12px] text-atlas-800">
                    Highlighted field: <span className="font-medium">{formatFieldPath(deepLinkFieldPath)}</span>
                  </div>
                  <Button variant="ghost" className="text-[11px]" onClick={() => setEvidenceOpen((open) => !open)}>
                    {evidenceOpen ? "Hide source trail" : "Show source trail"}
                  </Button>
                </div>
              )}

              {evidenceOpen && deepLinkFieldPath && (
                <div className="p-4 border-b border-border bg-white space-y-3">
                  <SourceTrail
                    metric={deepLinkMetricCode}
                    document={selectedRecord.document_filename}
                    field={deepLinkFieldPath}
                  />
                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div className="p-3 rounded border border-border-light bg-surface-secondary">
                      <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Extracted value</p>
                      <p className="break-all text-text-primary">
                        {deepLinkedValue === null ? "Value not found." : String(deepLinkedValue)}
                      </p>
                    </div>
                    <div className="p-3 rounded border border-border-light bg-surface-secondary">
                      <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">Confidence</p>
                      <p className="text-text-primary">{Math.round((selectedRecord.confidence_score || 0) * 100)}%</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      className="text-[11px] h-8"
                      onClick={() =>
                        void handleDownloadSource(
                          selectedRecord.document_id,
                          selectedRecord.document_filename || "source-document.pdf"
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
                              <p className="text-[11px] font-semibold text-text-primary">{formatEventType(event.event_type)}</p>
                              <p className="text-[10px] text-text-muted">
                                {new Date(event.created_at).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-[10px] text-text-muted mt-1">
                              {resolveActorName(event.actor_user_id, event.actor_name)} · {formatEntityTable(event.entity_table)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <FieldValueTable
                fields={localPayload || {}}
                editable
                showTechnicalKeys={showTechnicalDetails}
                highlightKey={deepLinkFieldKey}
                onChange={(key, value) => setLocalPayload((current) => ({ ...current, [key]: value }))}
                onRemove={(key) => {
                  const next = { ...localPayload };
                  delete next[key];
                  setLocalPayload(next);
                }}
              />

              <SourceTrail
                className="mx-4 mb-2"
                metric={deepLinkMetricCode}
                document={selectedRecord.document_filename}
                field={deepLinkFieldPath}
              />

              <div className="p-4 border-t border-border bg-surface-secondary flex items-center justify-between">
                <div className="text-[12px] text-text-secondary">
                  {hasEdits ? "Your edits will be saved when you approve." : "Showing values extracted from the source file."}
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
                      {copy.expert.clearHighlight}
                    </Button>
                  )}
                  <Button variant="ghost" className="text-danger" onClick={() => void handleReject(selectedRecord)}>
                    Reject
                  </Button>
                  <Button disabled={approving} onClick={() => void handleApprove(selectedRecord)}>
                    {approving ? "Saving…" : "Approve"}
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
            <h3 className="atlas-eyebrow">{copy.expert.documentTypeHealth}</h3>
            <div className="space-y-2 max-h-[70vh] overflow-auto pr-1">
              {(insights?.blueprints || []).map((bp) => (
                <DocumentTypeHealthCard
                  key={bp.template_id}
                  name={displayTemplateLabel(bp.template_name)}
                  documentsProcessed={bp.documents_processed}
                  averageConfidence={bp.average_confidence}
                  pendingCount={bp.pending_count}
                  missingCount={bp.missing_required_count}
                  selected={selectedBlueprintId === bp.template_id}
                  onClick={() => setSelectedBlueprintId(bp.template_id)}
                />
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            {selectedBlueprint ? (
              <>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[16px] font-bold">{displayTemplateLabel(selectedBlueprint.template_name)}</h2>
                      <p className="text-[12px] text-text-secondary mt-1">
                        Quality overview for this document type.
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
                        <p className="text-[12px] font-semibold">
                          {displayDocumentLabel(issue.document_filename)}
                        </p>
                        <p className="text-[11px] text-text-secondary mt-1">
                          {formatFieldPath(issue.field)} — {issue.detail}
                        </p>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[13px] font-bold">Extracted fields</h3>
                    {selectedEvidence && (
                      <Button
                        variant="ghost"
                        className="text-[11px]"
                        onClick={() => {
                          setTechnicalDrawerPayload(selectedEvidence.payload || {});
                          setTechnicalDrawerOpen(true);
                        }}
                      >
                        {copy.expert.viewDetails}
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-[260px_1fr] gap-4">
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
                          <p className="text-[12px] font-semibold truncate">
                            {displayRecordTitle(doc.document_filename, doc.created_at)}
                          </p>
                          <div className="mt-1 flex items-center justify-between">
                            <StatusBadge status={doc.status} />
                            <ConfidenceBar value={doc.confidence_score} size="sm" className="w-14" />
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="rounded-lg border border-border bg-surface-secondary p-3">
                      {selectedEvidence ? (
                        <FieldValueTable fields={selectedEvidence.payload || {}} />
                      ) : (
                        <p className="text-[12px] text-text-muted">Select a document to review extracted fields.</p>
                      )}
                    </div>
                  </div>
                </Card>
              </>
            ) : (
              <Card className="p-16 text-center text-text-muted">Select a document type to see health details.</Card>
            )}
          </div>
        </div>
      )}

      <TechnicalDetailsDrawer
        open={technicalDrawerOpen}
        onClose={() => setTechnicalDrawerOpen(false)}
        title={copy.expert.technicalDetails}
        json={technicalDrawerPayload}
      />

      {/* Override rationale dialog */}
      <PromptDialog
        open={!!overrideDialog}
        title="Reason for override"
        message="You've edited values in this extraction. Provide a brief reason for the changes."
        placeholder="e.g. Corrected unit from kWh to MWh based on original invoice…"
        confirmLabel="Approve with override"
        onConfirm={(notes) => overrideDialog && handleApproveWithOverride(overrideDialog.record, notes)}
        onCancel={() => setOverrideDialog(null)}
      />

      {/* Reject rationale dialog */}
      <PromptDialog
        open={!!rejectDialog}
        title="Reason for rejection"
        message="Describe why this extraction is being rejected so the team can re-upload or fix the issue."
        placeholder="e.g. Wrong document type, numbers don't match original invoice…"
        confirmLabel="Reject extraction"
        onConfirm={(notes) => rejectDialog && handleRejectConfirm(rejectDialog.record, notes)}
        onCancel={() => setRejectDialog(null)}
      />

      {/* Bulk approve confirmation */}
      <ConfirmDialog
        open={bulkApproveDialog}
        title="Approve all pending?"
        message={`This will approve all ${records.filter((r) => r.status !== "approved").length} pending documents at once. You can still review individual metrics afterwards.`}
        confirmLabel="Approve all"
        variant="primary"
        onConfirm={handleBulkApproveConfirm}
        onCancel={() => setBulkApproveDialog(false)}
      />
    </div>
  );
}
