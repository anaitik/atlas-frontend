import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatCard } from "../../components/ui/StatCard";
import { Badge, StatusBadge } from "../../components/ui/Badge";
import { BlockchainBadge } from "../../components/ui/BlockchainBadge";
import { PipelineTracker, getDefaultPipelineStages } from "../../components/ui/PipelineTracker";
import { apiClient, ApiError } from "../../lib/api-client";
import { useAuthStore } from "../../store/auth";
import { useWorkspaceStore } from "../../store/workspace";
import { env } from "../../lib/env";

type UploadStatus = "queued" | "uploading" | "extracting" | "complete" | "error";

type UploadedDocument = {
  id: string;
  filename: string;
  content_type: string;
  file_size_bytes: number;
  sha256_hash: string;
  status: string;
  blockchain_tx_id: string | null;
  uploaded_by_id: string;
  created_at: string;
};

type DocumentVerification = {
  document_id: string;
  sha256_hash: string;
  blockchain_enabled: boolean;
  chain_id: number | null;
  contract_address: string | null;
  verified_on_chain: boolean;
  verification_status: "verified" | "not_found" | "not_configured";
  blockchain_tx_id: string | null;
};

type UploadItem = {
  id: string;
  file: File;
  templateId: string;
  status: UploadStatus;
  error: string | null;
  extractionId: string | null;
  documentId: string | null;
  sha256Hash: string | null;
  blockchainTxId: string | null;
  verification: DocumentVerification | null;
  verificationError: string | null;
  feedbackNlp: string;
  prerun: ExtractionPreRunResult | null;
  previousPrerun: ExtractionPreRunResult | null;
};

type MetricCandidate = {
  metric_code: string;
  name: string;
  unit: string;
  pillar: string;
  value: number;
  metadata: Record<string, unknown>;
  source_extracted_data_ids: string[];
};

type MetricRecommendation = {
  metric_targets: string[];
  explanation: string;
};

type ExtractionPreRunResult = {
  document_id: string;
  template_id: string;
  payload: Record<string, unknown>;
  confidence_score: number;
  exception_reason: string | null;
  status: string;
  feedback_nlp_applied: string | null;
  metric_candidates: MetricCandidate[];
  metric_recommendation: MetricRecommendation;
};

type PayloadDiffEntry = {
  key: string;
  changeType: "added" | "removed" | "updated";
  previousValue: unknown;
  currentValue: unknown;
};

function createUploadId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

function stableStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function diffDeep(
  previousValue: unknown,
  currentValue: unknown,
  path: string,
  changes: PayloadDiffEntry[]
) {
  if (isPlainObject(previousValue) && isPlainObject(currentValue)) {
    const keys = new Set([...Object.keys(previousValue), ...Object.keys(currentValue)]);
    for (const key of Array.from(keys).sort()) {
      const hasPrev = Object.prototype.hasOwnProperty.call(previousValue, key);
      const hasCurr = Object.prototype.hasOwnProperty.call(currentValue, key);
      const nextPath = path ? `${path}.${key}` : key;
      if (!hasPrev && hasCurr) {
        changes.push({
          key: nextPath,
          changeType: "added",
          previousValue: null,
          currentValue: currentValue[key],
        });
        continue;
      }
      if (hasPrev && !hasCurr) {
        changes.push({
          key: nextPath,
          changeType: "removed",
          previousValue: previousValue[key],
          currentValue: null,
        });
        continue;
      }
      diffDeep(previousValue[key], currentValue[key], nextPath, changes);
    }
    return;
  }

  if (Array.isArray(previousValue) && Array.isArray(currentValue)) {
    const max = Math.max(previousValue.length, currentValue.length);
    for (let index = 0; index < max; index += 1) {
      const hasPrev = index < previousValue.length;
      const hasCurr = index < currentValue.length;
      const nextPath = `${path}[${index}]`;
      if (!hasPrev && hasCurr) {
        changes.push({
          key: nextPath,
          changeType: "added",
          previousValue: null,
          currentValue: currentValue[index],
        });
        continue;
      }
      if (hasPrev && !hasCurr) {
        changes.push({
          key: nextPath,
          changeType: "removed",
          previousValue: previousValue[index],
          currentValue: null,
        });
        continue;
      }
      diffDeep(previousValue[index], currentValue[index], nextPath, changes);
    }
    return;
  }

  if (stableStringify(previousValue) !== stableStringify(currentValue)) {
    changes.push({
      key: path || "(root)",
      changeType: "updated",
      previousValue,
      currentValue,
    });
  }
}

function computePayloadDiff(
  previousPayload: Record<string, unknown> | null | undefined,
  currentPayload: Record<string, unknown> | null | undefined
): PayloadDiffEntry[] {
  const changes: PayloadDiffEntry[] = [];
  diffDeep(previousPayload || {}, currentPayload || {}, "", changes);
  return changes;
}

export function ExtractionDashboard() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const activeCompanyId = useWorkspaceStore((state) => state.activeCompanyId);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  const [activeTemplateId, setActiveTemplateId] = useState("");
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [runs, setRuns] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const companyId = activeCompanyId || user?.company_id || "platform";
  const queuedCount = uploadItems.filter((item) => item.status === "queued").length;
  const completedCount = uploadItems.filter((item) => item.status === "complete").length;
  const totalDocuments = completedCount + runs.length;

  const fetchRuns = useCallback(async () => {
    try {
      const res: any = await apiClient(`/extraction?workspace_id=${workspaceId}`);
      setRuns(res.items || res || []);
    } catch (error) {
      console.error(error);
    }
  }, [workspaceId]);

  useEffect(() => {
    const templatePath = workspaceId ? `/templates?workspace_id=${workspaceId}` : "/templates";
    apiClient(templatePath)
      .then((res: any) => {
        const items = res.items || res || [];
        setTemplates(items);
        if (items.length > 0) {
          setActiveTemplateId(items[0].id);
        }
      })
      .catch(console.error);
    void fetchRuns();
  }, [workspaceId, fetchRuns]);

  const updateUploadItem = (id: string, patch: Partial<UploadItem>) => {
    setUploadItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const refreshDocumentVerification = async (itemId: string, documentId: string) => {
    updateUploadItem(itemId, { verificationError: null });
    try {
      const verification = await apiClient<DocumentVerification>(`/documents/${documentId}/verification`);
      updateUploadItem(itemId, {
        verification,
        sha256Hash: verification.sha256_hash,
        blockchainTxId: verification.blockchain_tx_id,
        verificationError: null,
      });
    } catch (error) {
      updateUploadItem(itemId, {
        verificationError: resolveErrorMessage(error, "Unable to refresh verification."),
      });
    }
  };

  const handleAddFiles = (files: FileList | null, overrideTemplateId?: string) => {
    if (!files) return;
    const targetTemplateId = overrideTemplateId || activeTemplateId;
    
    if (!targetTemplateId) {
      setErrorMessage("Set up at least one blueprint in Template Manager before uploading evidence.");
      return;
    }

    const nextItems = Array.from(files).map((file) => ({
      id: createUploadId(file),
      file,
      templateId: targetTemplateId,
      status: "queued" as UploadStatus,
      error: null,
      extractionId: null,
      documentId: null,
      sha256Hash: null,
      blockchainTxId: null,
      verification: null,
      verificationError: null,
      feedbackNlp: "",
      prerun: null,
      previousPrerun: null,
    }));
    
    setUploadItems((current) => {
      const seen = new Set(current.map((item) => item.id));
      return [...current, ...nextItems.filter((item) => !seen.has(item.id))];
    });
  };

  const handleRemoveItem = (id: string) => {
    setUploadItems((current) => current.filter((item) => item.id !== id));
  };

  const handlePreRunItem = async (item: UploadItem) => {
    if (!companyId || !workspaceId) {
      setErrorMessage("Company context missing. Re-enter the workspace from the company page.");
      return;
    }
    if (!item.templateId) {
      setErrorMessage("Assign a template before running pre-run.");
      return;
    }

    setErrorMessage("");
    setStatusMessage("");
    updateUploadItem(item.id, { status: "extracting", error: null });

    try {
      let documentId = item.documentId;
      if (!documentId) {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("company_id", companyId);
        formData.append("workspace_id", workspaceId);
        const doc = await apiClient<UploadedDocument>("/documents", { method: "POST", body: formData });
        documentId = doc.id;
        updateUploadItem(item.id, {
          documentId: doc.id,
          sha256Hash: doc.sha256_hash,
          blockchainTxId: doc.blockchain_tx_id,
        });
        await refreshDocumentVerification(item.id, doc.id);
      }

      const preRun = await apiClient<ExtractionPreRunResult>("/extraction/prerun", {
        method: "POST",
        body: JSON.stringify({
          document_id: documentId,
          template_id: item.templateId,
          feedback_nlp: item.feedbackNlp || null,
        }),
      });

      updateUploadItem(item.id, {
        status: "queued",
        previousPrerun: item.prerun,
        prerun: preRun,
        error: null,
      });
      setStatusMessage(`Pre-run generated for ${item.file.name}. Review output and finalize when ready.`);
    } catch (error: unknown) {
      updateUploadItem(item.id, {
        status: "error",
        error: resolveErrorMessage(error, "Pre-run failed."),
      });
    }
  };

  const handleFinalizeItem = async (item: UploadItem) => {
    if (!item.documentId) {
      setErrorMessage("Run pre-run or upload first to create a document.");
      return;
    }
    if (!item.templateId) {
      setErrorMessage("Assign a template before finalizing.");
      return;
    }
    updateUploadItem(item.id, { status: "extracting", error: null });
    try {
      const extraction = await apiClient<any>("/extraction/run", {
        method: "POST",
        body: JSON.stringify({ document_id: item.documentId, template_id: item.templateId }),
      });
      updateUploadItem(item.id, { status: "complete", extractionId: extraction.id, error: null });
      setStatusMessage(`Finalized extraction for ${item.file.name}.`);
      await fetchRuns();
    } catch (error: unknown) {
      updateUploadItem(item.id, {
        status: "error",
        error: resolveErrorMessage(error, "Finalize failed."),
      });
    }
  };

  const handleRunPipeline = async () => {
    if (!companyId || !workspaceId) {
      setErrorMessage("Company context missing. Re-enter the workspace from the company page.");
      return;
    }
    if (uploadItems.length === 0) {
      setErrorMessage("Attach at least one file before starting extraction.");
      return;
    }
    const runnableItems = uploadItems.filter((item) => item.status !== "complete");
    if (runnableItems.length === 0) {
      setErrorMessage("All files have already been processed.");
      return;
    }
    if (runnableItems.some((item) => !item.templateId)) {
      setErrorMessage("Every file needs an assigned template before extraction can start.");
      return;
    }

    setLoading(true);
    setStatusMessage("");
    setErrorMessage("");
    let successCount = 0;
    let failureCount = 0;

    for (const item of runnableItems) {
      updateUploadItem(item.id, { status: "uploading", error: null, extractionId: null, verificationError: null });

      try {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("company_id", companyId);
        formData.append("workspace_id", workspaceId);

        const doc = await apiClient<UploadedDocument>("/documents", { method: "POST", body: formData });
        updateUploadItem(item.id, {
          status: "extracting",
          documentId: doc.id,
          sha256Hash: doc.sha256_hash,
          blockchainTxId: doc.blockchain_tx_id,
        });

        await refreshDocumentVerification(item.id, doc.id);

        const extraction: any = await apiClient("/extraction/run", {
          method: "POST",
          body: JSON.stringify({ document_id: doc.id, template_id: item.templateId }),
        });

        updateUploadItem(item.id, { status: "complete", extractionId: extraction.id, error: null });
        successCount += 1;
      } catch (error: unknown) {
        updateUploadItem(item.id, {
          status: "error",
          error: resolveErrorMessage(error, "Pipeline initialization failed."),
        });
        failureCount += 1;
      }
    }

    await fetchRuns();
    setLoading(false);

    if (failureCount > 0) {
      setErrorMessage(`${failureCount} file(s) failed. Review the queue for details.`);
    }
    if (successCount > 0) {
      setStatusMessage(`${successCount} file(s) uploaded and sent to extraction successfully.`);
    }
  };

  return (
    <div className="space-y-6">
      {env.DEMO_MODE && (
        <div className="rounded-lg border border-atlas-200 bg-atlas-50 px-3 py-2 text-[12px] text-atlas-800">
          <strong>Act 4-5 cue:</strong> Upload - hash - anchor - extract - human review. Show tx hash after first document.
        </div>
      )}
      <header className="flex items-start justify-between">
        <div>
          <h1 className="atlas-page-title text-atlas-600">Document Collection</h1>
          <p className="atlas-page-subtitle">
            Upload source evidence into defined data scopes. AI will automatically execute the corresponding extraction blueprint.
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigate(`/w/${workspaceId}/review`)}>
          Continue to Review →
        </Button>
      </header>

      {statusMessage && (
        <div className="p-4 rounded-lg bg-success-bg border border-success-border text-success text-[13px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-danger-bg border border-danger-border text-danger text-[13px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {errorMessage}
        </div>
      )}

      {/* ── Pipeline Tracker ─────────────────────────── */}
      <PipelineTracker
        stages={(() => {
          const hasUploads = uploadItems.length > 0;
          const hasHashed = uploadItems.some(i => i.sha256Hash);
          const hasAnchored = uploadItems.some(i => i.verification?.verified_on_chain);
          const hasExtracted = uploadItems.some(i => i.prerun || i.extractionId);
          const hasCompleted = uploadItems.some(i => i.status === "complete");
          const isProcessing = loading || uploadItems.some(i => i.status === "uploading" || i.status === "extracting");

          return getDefaultPipelineStages({
            upload: hasUploads ? "done" : isProcessing ? "processing" : "idle",
            fingerprint: hasHashed ? "done" : (hasUploads && isProcessing) ? "processing" : "idle",
            anchor: hasAnchored ? "done" : (hasHashed && isProcessing) ? "processing" : "idle",
            extract: hasExtracted ? "done" : (hasAnchored && isProcessing) ? "processing" : "idle",
            review: hasCompleted ? "done" : (hasExtracted && isProcessing) ? "processing" : "idle",
          });
        })()}
        className="animate-atlas-in"
      />

      {/* ── Stat Bar ────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 stagger-fade">
        <StatCard label="Collected" value={totalDocuments} subtitle="Verified documents" icon="description" variant="default" />
        <StatCard label="Review Queue" value={runs.filter(r => r.status === "needs_review" || r.confidence_score < 0.85).length || queuedCount} subtitle="Items pending attention" icon="rate_review" variant="warning" />
        <StatCard label="Configured Blueprints" value={templates.length} subtitle="Active extraction rules" icon="account_tree" variant="muted" />
        <StatCard label="Report Status" value="—" subtitle="Step 4/4" icon="assignment" variant="muted" />
      </div>

      {/* ── Dynamic Template Scopes ──────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[15px] font-bold text-text-primary">Data Scopes</h2>
          <Button variant="ghost" onClick={() => navigate(`/w/${workspaceId}/templates`)}>Manage Blueprints</Button>
        </div>

        {templates.length === 0 ? (
           <div className="bg-surface-secondary border border-dashed border-border rounded-xl flex flex-col items-center justify-center p-12 text-center">
              <span className="material-symbols-outlined text-text-muted text-[42px] mb-3">account_tree</span>
              <p className="text-[16px] font-bold text-text-primary mb-1">No Data Blueprints Configured</p>
              <p className="text-[13px] text-text-secondary mb-4">Please create at least one extraction template before uploading files.</p>
              <Button onClick={() => navigate(`/w/${workspaceId}/templates`)}>Configure Blueprint</Button>
           </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {templates.map((tpl) => {
              const isActive = activeTemplateId === tpl.id;
              const scopedItems = uploadItems.filter(i => i.templateId === tpl.id);
              const queuedItems = scopedItems.filter(i => i.status !== "complete").length;
              const completeItems = scopedItems.filter(i => i.status === "complete").length;
              
              const extractionDocs = runs.filter((r) => r.template_id === tpl.id).length + completeItems;

              return (
                <Card
                  key={tpl.id}
                  variant="interactive"
                  className={isActive ? "border-atlas-500 ring-1 ring-atlas-400/20" : ""}
                  onClick={() => setActiveTemplateId(tpl.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="blue">SCOPE</Badge>
                      <span className="text-[11px] text-text-muted font-mono">{tpl.id.slice(0,8)}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-[15px] font-bold text-text-primary truncate" title={tpl.name}>{tpl.name}</h3>
                    <p className="text-[12px] text-text-secondary mt-1 line-clamp-2">{(tpl.schema_json && Object.keys(tpl.schema_json).length) || 0} fields mapped to this scope.</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-medium text-text-secondary mb-3">
                    <span>{extractionDocs} Processed Data Points</span>
                    {queuedItems > 0 && <span className="text-warning">{queuedItems} Pending Queue</span>}
                  </div>

                  <div className="atlas-dropzone py-4"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setActiveTemplateId(tpl.id);
                      fileInputRef.current?.click(); 
                    }}
                  >
                    <span className="material-symbols-outlined text-text-muted text-[24px] mb-1 block">upload_file</span>
                    <p className="text-[12px] font-semibold text-text-secondary">Upload Evidence</p>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        id="file-upload"
        type="file"
        multiple
        className="hidden"
        onChange={(event) => { handleAddFiles(event.target.files); event.target.value = ""; }}
      />

      {/* ── Document Queue ─────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-text-primary">Extraction Pipeline Queue</h3>
            <p className="text-[12px] text-text-secondary mt-0.5">
              Review assigned scopes and execute blockchain registration + LLM extraction.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="gray">{uploadItems.length} Uploads</Badge>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {uploadItems.length > 0 ? uploadItems.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-3 bg-surface-secondary rounded-lg border border-border-light">
              <span className="material-symbols-outlined text-text-muted text-[20px]">
                {item.status === "complete" ? "check_circle" : item.status === "error" ? "error" : "draft"}
              </span>
              <div className="flex-1 min-w-0 flex items-center">
                <div className="min-w-0 mr-4">
                   <div className="flex items-center gap-2 pr-4 mb-0.5">
                     <p className="text-[13px] font-medium text-text-primary truncate">{item.file.name}</p>
                     <BlockchainBadge
                       verification={item.verification}
                       onRefresh={() => {
                         if (item.documentId) refreshDocumentVerification(item.id, item.documentId);
                       }}
                     />
                   </div>
                   <p className="text-[11px] text-text-muted">
                     {(item.file.size / 1024 / 1024).toFixed(2)} MB
                   </p>
                </div>
                
                <div className="w-1/3">
                   <select
                      className="atlas-input py-1 text-[11px] h-auto w-full max-w-[200px]"
                      value={item.templateId}
                      onChange={(e) => updateUploadItem(item.id, { templateId: e.target.value })}
                      disabled={item.status !== "queued" && item.status !== "error"}
                   >
                     {templates.map((t: any) => (
                       <option key={t.id} value={t.id}>{t.name}</option>
                     ))}
                   </select>
                </div>
              </div>

              <StatusBadge status={item.status} />
              <Button
                variant="ghost"
                className="text-[11px] px-2 py-1"
                onClick={() => handlePreRunItem(item)}
                disabled={item.status === "uploading" || item.status === "extracting"}
              >
                Pre-run
              </Button>
              <Button
                className="text-[11px] px-2 py-1"
                onClick={() => handleFinalizeItem(item)}
                disabled={!item.prerun || item.status === "uploading" || item.status === "extracting"}
              >
                Finalize
              </Button>
              {item.extractionId && (
                <Button variant="ghost" className="text-[11px] px-2 py-1" onClick={() => navigate(`/w/${workspaceId}/review`)}>
                  Review
                </Button>
              )}
              <button 
                onClick={() => handleRemoveItem(item.id)} 
                className="text-text-muted hover:text-danger transition-colors"
                disabled={item.status === "uploading" || item.status === "extracting"}
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )) : (
            <div className="py-8 text-center bg-surface-secondary border border-dashed border-border rounded-lg text-text-muted">
               <span className="material-symbols-outlined text-[24px] mb-2 block">task</span>
               <p className="text-[13px]">No files queued. Select a data scope above to upload evidence.</p>
            </div>
          )}
        </div>

        {uploadItems.some((item) => item.prerun) && (
          <div className="space-y-3 mb-4">
            <h4 className="text-[13px] font-bold text-text-primary">Pre-run Preview</h4>
            {uploadItems.filter((item) => item.prerun).map((item) => (
              <div key={`${item.id}-preview`} className="p-3 rounded-lg border border-border-light bg-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-semibold text-text-primary">{item.file.name}</p>
                  <p className="text-[11px] text-text-secondary">
                    Confidence: {Math.round((item.prerun?.confidence_score || 0) * 100)}%
                  </p>
                </div>
                {(() => {
                  const changes = computePayloadDiff(item.previousPrerun?.payload, item.prerun?.payload);
                  if (!item.previousPrerun) return null;
                  return (
                    <div className="mb-2 p-2 rounded border border-border-light bg-surface-secondary">
                      <p className="text-[11px] font-semibold text-text-secondary mb-1">
                        Changes Since Last Pre-run ({changes.length})
                      </p>
                      {changes.length === 0 ? (
                        <p className="text-[11px] text-text-muted">No payload changes detected.</p>
                      ) : (
                        <div className="max-h-[110px] overflow-auto space-y-1">
                          {changes.map((change) => (
                            <div key={change.key} className="text-[10px]">
                              <span className="font-semibold">{change.key}</span>
                              <span className="mx-1 text-text-muted">•</span>
                              <span className="uppercase text-[9px] font-bold text-atlas-700">{change.changeType}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
                <textarea
                  className="atlas-input h-[70px] text-[12px] mb-2 resize-none"
                  placeholder="Add feedback (NLP), then click Pre-run again."
                  value={item.feedbackNlp}
                  onChange={(e) => updateUploadItem(item.id, { feedbackNlp: e.target.value })}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="p-2 bg-surface-secondary rounded border border-border-light">
                    <p className="text-[11px] font-semibold text-text-secondary mb-1">Extracted Payload</p>
                    <pre className="text-[10px] max-h-[180px] overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(item.prerun?.payload || {}, null, 2)}
                    </pre>
                  </div>
                  <div className="p-2 bg-surface-secondary rounded border border-border-light">
                    <p className="text-[11px] font-semibold text-text-secondary mb-1">Metric Candidates</p>
                    <pre className="text-[10px] max-h-[180px] overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(item.prerun?.metric_candidates || [], null, 2)}
                    </pre>
                    <p className="text-[11px] font-semibold text-text-secondary mt-2 mb-1">Recommended Targets</p>
                    <pre className="text-[10px] max-h-[120px] overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(item.prerun?.metric_recommendation?.metric_targets || [], null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 pt-4 border-t border-border-light">
          <Button disabled={uploadItems.filter(i => i.status !== "complete").length === 0 || loading || templates.length === 0} onClick={handleRunPipeline}>
            {loading ? "Processing..." : "Start Pipeline"}
          </Button>
          <Button variant="ghost" disabled={completedCount === 0 || loading} onClick={() => setUploadItems(c => c.filter(i => i.status !== "complete"))}>
            Clear Completed
          </Button>
        </div>
      </Card>
      
    </div>
  );
}
