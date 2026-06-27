import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { apiClient, ApiError } from "../../lib/api-client";
import { useAuthStore } from "../../store/auth";
import { useWorkspaceStore } from "../../store/workspace";

// ─── Types ────────────────────────────────────────────────────────────────────

type FileStatus = "queued" | "uploading" | "extracting" | "done" | "error";

type QueuedFile = {
  id: string;
  file: File;
  templateId: string;
  status: FileStatus;
  error: string | null;
  extractionId: string | null;
};

type Template = {
  id: string;
  name: string;
  schema_json?: Record<string, unknown>;
  schema_definition?: Record<string, unknown>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileId(f: File) {
  return `${f.name}-${f.size}-${f.lastModified}`;
}

function resolveError(e: unknown, fallback: string): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Status icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: FileStatus }) {
  if (status === "done") {
    return <span className="material-symbols-outlined text-[20px] text-success">check_circle</span>;
  }
  if (status === "error") {
    return <span className="material-symbols-outlined text-[20px] text-danger">error</span>;
  }
  if (status === "uploading" || status === "extracting") {
    return <span className="material-symbols-outlined text-[20px] text-info animate-spin">progress_activity</span>;
  }
  return <span className="material-symbols-outlined text-[20px] text-text-muted">draft</span>;
}

function statusLabel(status: FileStatus): string {
  if (status === "queued") return "Ready";
  if (status === "uploading") return "Uploading…";
  if (status === "extracting") return "Extracting…";
  if (status === "done") return "Done";
  if (status === "error") return "Failed";
  return status;
}

// ─── Drop zone ────────────────────────────────────────────────────────────────

function DropZone({
  onFiles,
  disabled,
}: {
  onFiles: (files: File[]) => void;
  disabled: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type === "application/pdf" || f.name.endsWith(".pdf") || f.name.endsWith(".xlsx") || f.name.endsWith(".csv")
    );
    if (files.length) onFiles(files);
  };

  return (
    <div
      className={`rounded-2xl border-2 border-dashed transition-all p-10 text-center cursor-pointer ${
        dragging
          ? "border-atlas-400 bg-atlas-50"
          : disabled
          ? "border-gray-200 bg-gray-50 cursor-not-allowed"
          : "border-gray-300 hover:border-atlas-400 hover:bg-atlas-50/40"
      }`}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <span className="material-symbols-outlined text-[40px] text-text-muted block mb-3">
        {dragging ? "download" : "upload_file"}
      </span>
      <p className="text-[15px] font-bold text-text-primary mb-1">
        {disabled ? "Select a document type first" : "Drop files here or click to browse"}
      </p>
      <p className="text-[13px] text-text-secondary">
        PDF, Excel, or CSV files
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.xlsx,.csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─── Template chip ────────────────────────────────────────────────────────────

function TemplateChip({
  tpl,
  active,
  count,
  onClick,
}: {
  tpl: Template;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  const fieldCount =
    Object.keys(tpl.schema_json || {}).length ||
    Object.keys(tpl.schema_definition || {}).length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left transition-all ${
        active
          ? "border-atlas-400 bg-atlas-50 shadow-sm"
          : "border-border-light bg-surface hover:border-atlas-300 hover:bg-atlas-50/30"
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-atlas-100" : "bg-surface-secondary"}`}>
        <span className={`material-symbols-outlined text-[18px] ${active ? "text-atlas-600" : "text-text-muted"}`}>
          description
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-bold truncate ${active ? "text-atlas-700" : "text-text-primary"}`}>
          {tpl.name}
        </p>
        <p className="text-[11px] text-text-muted">{fieldCount} fields</p>
      </div>
      {count > 0 && (
        <span className="text-[11px] font-bold text-atlas-600 bg-atlas-100 rounded-full px-2 py-0.5 shrink-0">
          {count}
        </span>
      )}
      {active && (
        <span className="material-symbols-outlined text-[18px] text-atlas-500 shrink-0">check_circle</span>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ExtractionDashboard() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const activeCompanyId = useWorkspaceStore((s) => s.activeCompanyId);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState("");
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [completedRuns, setCompletedRuns] = useState<any[]>([]);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const companyId = activeCompanyId || user?.company_id || "";

  const update = (id: string, patch: Partial<QueuedFile>) =>
    setQueue((q) => q.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const fetchRuns = useCallback(async () => {
    try {
      const res: any = await apiClient(`/extraction?workspace_id=${workspaceId}`);
      setCompletedRuns(res.items || res || []);
    } catch {}
  }, [workspaceId]);

  useEffect(() => {
    const path = workspaceId ? `/templates?workspace_id=${workspaceId}` : "/templates";
    apiClient(path)
      .then((res: any) => {
        const items = res.items || res || [];
        setTemplates(items);
        if (items.length === 1) setActiveTemplateId(items[0].id);
      })
      .catch(console.error);
    void fetchRuns();
  }, [workspaceId, fetchRuns]);

  const handleFiles = (files: File[]) => {
    if (!activeTemplateId) return;
    const newItems: QueuedFile[] = files
      .filter((f) => !queue.some((q) => q.id === fileId(f)))
      .map((f) => ({
        id: fileId(f),
        file: f,
        templateId: activeTemplateId,
        status: "queued",
        error: null,
        extractionId: null,
      }));
    setQueue((q) => [...q, ...newItems]);
  };

  const processAll = async () => {
    if (!companyId || !workspaceId) {
      setBanner({ type: "error", text: "Company context missing. Return to your company home and re-enter this workspace." });
      return;
    }
    const pending = queue.filter((f) => f.status !== "done");
    if (!pending.length) return;

    setProcessing(true);
    setBanner(null);
    let ok = 0;
    let fail = 0;

    for (const item of pending) {
      update(item.id, { status: "uploading", error: null });
      try {
        const form = new FormData();
        form.append("file", item.file);
        form.append("company_id", companyId);
        form.append("workspace_id", workspaceId);
        const doc: any = await apiClient("/documents", { method: "POST", body: form });

        update(item.id, { status: "extracting" });
        const extraction: any = await apiClient("/extraction/run", {
          method: "POST",
          body: JSON.stringify({ document_id: doc.id, template_id: item.templateId }),
        });

        update(item.id, { status: "done", extractionId: extraction.id });
        ok++;
      } catch (e) {
        update(item.id, { status: "error", error: resolveError(e, "Processing failed.") });
        fail++;
      }
    }

    await fetchRuns();
    setProcessing(false);

    if (ok > 0 && fail === 0) {
      setBanner({ type: "success", text: `${ok} file${ok > 1 ? "s" : ""} processed successfully. Review the extracted data.` });
    } else if (fail > 0) {
      setBanner({ type: "error", text: `${fail} file${fail > 1 ? "s" : ""} failed. Check the list below for details.` });
    }
  };

  const queued = queue.filter((f) => f.status === "queued").length;
  const done = queue.filter((f) => f.status === "done").length;
  const failed = queue.filter((f) => f.status === "error").length;
  const active = queue.filter((f) => f.status === "uploading" || f.status === "extracting").length;
  const canProcess = queue.some((f) => f.status !== "done") && !!activeTemplateId && !processing;

  return (
    <div className="space-y-6 animate-atlas-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="atlas-page-title">Upload documents</h1>
          <p className="atlas-page-subtitle">Upload your sustainability documents. Atlas will extract data automatically.</p>
        </div>
        {done > 0 && (
          <Button variant="outline" onClick={() => navigate(`/w/${workspaceId}/review`)}>
            Review extracted data →
          </Button>
        )}
      </div>

      {/* Banner */}
      {banner && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border text-[13px] ${
          banner.type === "success"
            ? "bg-success-bg border-success-border text-success"
            : "bg-danger-bg border-danger-border text-danger"
        }`}>
          <span className="material-symbols-outlined text-[20px] shrink-0">
            {banner.type === "success" ? "check_circle" : "error"}
          </span>
          <div className="flex-1">{banner.text}</div>
          <button onClick={() => setBanner(null)} className="opacity-50 hover:opacity-100 shrink-0">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Step 1: Choose document type */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-atlas-500 text-white text-[11px] font-bold flex items-center justify-center">1</span>
            <h2 className="text-[15px] font-bold text-text-primary">Choose document type</h2>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/w/${workspaceId}/templates`)}
            className="text-[12px] text-text-muted hover:text-atlas-600 transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">edit</span>
            Manage types
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <span className="material-symbols-outlined text-[36px] text-text-muted mb-3 block">account_tree</span>
            <p className="text-[14px] font-bold text-text-primary mb-1">No document types set up</p>
            <p className="text-[13px] text-text-secondary mb-4">
              Document types tell Atlas how to extract data from your files.
            </p>
            <Button onClick={() => navigate(`/w/${workspaceId}/templates`)}>Set up document types</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {templates.map((tpl) => {
              const scopedCount = queue.filter((f) => f.templateId === tpl.id && f.status === "done").length
                + completedRuns.filter((r) => r.template_id === tpl.id).length;
              return (
                <TemplateChip
                  key={tpl.id}
                  tpl={tpl}
                  active={activeTemplateId === tpl.id}
                  count={scopedCount}
                  onClick={() => setActiveTemplateId(tpl.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Step 2: Drop files */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${activeTemplateId ? "bg-atlas-500 text-white" : "bg-gray-200 text-gray-500"}`}>2</span>
          <h2 className={`text-[15px] font-bold ${activeTemplateId ? "text-text-primary" : "text-text-muted"}`}>
            {activeTemplateId
              ? `Drop files for: ${templates.find((t) => t.id === activeTemplateId)?.name}`
              : "Drop files (select a document type first)"}
          </h2>
        </div>
        <DropZone onFiles={handleFiles} disabled={!activeTemplateId} />
      </div>

      {/* Queue */}
      {queue.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-atlas-500 text-white text-[11px] font-bold flex items-center justify-center">3</span>
              <h2 className="text-[15px] font-bold text-text-primary">Process files</h2>
            </div>
            <div className="flex items-center gap-2">
              {done > 0 && <Badge variant="green">{done} done</Badge>}
              {failed > 0 && <Badge variant="red">{failed} failed</Badge>}
              {queued > 0 && <Badge variant="gray">{queued} waiting</Badge>}
              {active > 0 && <Badge variant="blue">{active} processing</Badge>}
            </div>
          </div>

          <div className="atlas-card overflow-hidden">
            <div className="divide-y divide-border-light">
              {queue.map((item) => (
                <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                  <StatusIcon status={item.status} />

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">{item.file.name}</p>
                    <p className="text-[11px] text-text-muted">
                      {formatBytes(item.file.size)}
                      {" · "}
                      {templates.find((t) => t.id === item.templateId)?.name || "Unknown type"}
                    </p>
                    {item.error && (
                      <p className="text-[11px] text-danger mt-0.5">{item.error}</p>
                    )}
                  </div>

                  <span className={`text-[12px] font-semibold shrink-0 ${
                    item.status === "done" ? "text-success"
                    : item.status === "error" ? "text-danger"
                    : item.status === "uploading" || item.status === "extracting" ? "text-info"
                    : "text-text-muted"
                  }`}>
                    {statusLabel(item.status)}
                  </span>

                  {item.status === "done" && item.extractionId && (
                    <button
                      onClick={() => navigate(`/w/${workspaceId}/review`)}
                      className="text-[11px] font-bold text-atlas-600 hover:text-atlas-700 transition-colors shrink-0"
                    >
                      Review →
                    </button>
                  )}

                  {(item.status === "queued" || item.status === "error") && (
                    <button
                      onClick={() => setQueue((q) => q.filter((f) => f.id !== item.id))}
                      className="text-text-muted hover:text-danger transition-colors shrink-0"
                      disabled={processing}
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 px-4 py-4 border-t border-border-light bg-surface-secondary">
              <Button
                onClick={processAll}
                disabled={!canProcess}
              >
                {processing
                  ? "Processing…"
                  : `Extract data from ${queue.filter((f) => f.status !== "done").length} file${queue.filter((f) => f.status !== "done").length !== 1 ? "s" : ""}`}
              </Button>
              {done > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => setQueue((q) => q.filter((f) => f.status !== "done"))}
                  disabled={processing}
                >
                  Clear completed
                </Button>
              )}
              {done > 0 && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/w/${workspaceId}/review`)}
                >
                  <span className="material-symbols-outlined text-[16px]">rate_review</span>
                  Review extracted data
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Previous runs */}
      {completedRuns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-text-primary">Previously extracted</h2>
            <Button variant="ghost" onClick={() => navigate(`/w/${workspaceId}/review`)}>
              View all in review →
            </Button>
          </div>
          <div className="atlas-card overflow-hidden">
            <div className="divide-y divide-border-light">
              {completedRuns.slice(0, 5).map((run) => (
                <div key={run.id} className="flex items-center gap-4 px-4 py-3">
                  <span className="material-symbols-outlined text-[20px] text-text-muted">description</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">
                      {run.document_filename || run.document_id}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {templates.find((t) => t.id === run.template_id)?.name || "Unknown type"}
                      {run.confidence_score != null && ` · ${Math.round(run.confidence_score * 100)}% confidence`}
                    </p>
                  </div>
                  <span className={`text-[12px] font-semibold ${
                    run.status === "approved" ? "text-success"
                    : run.status === "rejected" ? "text-danger"
                    : "text-warning"
                  }`}>
                    {run.status === "approved" ? "Approved"
                     : run.status === "rejected" ? "Rejected"
                     : "Needs review"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
