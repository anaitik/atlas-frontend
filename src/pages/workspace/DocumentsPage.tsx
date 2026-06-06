import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { InlineAlert } from "../../components/ui/InlineAlert";
import { DocumentRow, type DocumentRowStatus } from "../../components/ui/DocumentRow";
import { apiClient, ApiError } from "../../lib/api-client";
import { copy } from "../../lib/copy";
import { useAuthStore } from "../../store/auth";
import { useWorkspaceStore } from "../../store/workspace";
import { usePersonaMode } from "../../hooks/usePersonaMode";

type TemplateOption = { id: string; name: string };

type UploadItem = {
  id: string;
  file: File;
  status: DocumentRowStatus;
  error: string | null;
  documentId: string | null;
  templateId: string;
  templateName: string | null;
  verification: import("../../components/ui/BlockchainBadge").DocumentVerification | null;
};

function createUploadId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function resolveError(error: unknown, fallback: string) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function DocumentsPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { isLead } = usePersonaMode();
  const user = useAuthStore((s) => s.user);
  const activeCompanyId = useWorkspaceStore((s) => s.activeCompanyId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const companyId = activeCompanyId || user?.company_id || "";
  const selectedTemplate = templates.find((t) => t.id === templateId);

  useEffect(() => {
    if (!workspaceId) return;
    apiClient(`/templates?workspace_id=${workspaceId}`)
      .then((res: any) => {
        const list = (res.items || res || []) as TemplateOption[];
        setTemplates(list);
      })
      .catch(() => {});
  }, [workspaceId]);

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  const processItem = useCallback(
    async (item: UploadItem) => {
      if (!companyId || !workspaceId || !item.templateId) return;
      updateItem(item.id, { status: "uploading", error: null });
      try {
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("company_id", companyId);
        formData.append("workspace_id", workspaceId);
        const doc: any = await apiClient("/documents", { method: "POST", body: formData });
        updateItem(item.id, { status: "processing", documentId: doc.id });

        await apiClient("/extraction/run", {
          method: "POST",
          body: JSON.stringify({ document_id: doc.id, template_id: item.templateId }),
        });

        let verification: UploadItem["verification"] = null;
        try {
          verification = await apiClient<NonNullable<UploadItem["verification"]>>(
            `/documents/${doc.id}/verification`
          );
        } catch {
          /* optional */
        }

        updateItem(item.id, {
          status: "needs_review",
          documentId: doc.id,
          verification,
        });
      } catch (e) {
        updateItem(item.id, { status: "error", error: resolveError(e, "Upload failed.") });
      }
    },
    [companyId, workspaceId]
  );

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    if (templates.length === 0) {
      setError(copy.documents.noTemplates);
      return;
    }
    if (!templateId) {
      setError(copy.documents.chooseTypeFirst);
      return;
    }
    setError(null);
    const templateName = selectedTemplate?.name || null;
    const next: UploadItem[] = Array.from(files).map((file) => ({
      id: createUploadId(file),
      file,
      status: "queued",
      error: null,
      documentId: null,
      templateId,
      templateName,
      verification: null,
    }));
    setItems((cur) => {
      const seen = new Set(cur.map((i) => i.id));
      return [...cur, ...next.filter((i) => !seen.has(i.id))];
    });
    next.forEach((item) => void processItem(item));
  };

  const canUpload = templates.length > 0 && !!templateId;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-atlas-in">
      <header>
        <h1 className="atlas-page-title text-atlas-600">{copy.documents.title}</h1>
        <p className="atlas-page-subtitle">{copy.documents.subtitle}</p>
        {!isLead && (
          <Button variant="ghost" className="mt-2 px-0" onClick={() => navigate(`/w/${workspaceId}/extraction`)}>
            Open expert extraction dashboard
          </Button>
        )}
      </header>

      {error && <InlineAlert variant="danger">{error}</InlineAlert>}

      <Card className="p-5">
        <label className="block text-[12px] font-semibold text-text-primary mb-2">{copy.expert.chooseDocumentType}</label>
        {templates.length === 0 ? (
          <p className="text-[13px] text-text-muted">{copy.documents.noTemplates}</p>
        ) : (
          <select
            className="atlas-input w-full max-w-md"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">Select document type…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}
      </Card>

      <Card
        className={`p-10 border-dashed border-2 text-center transition-colors ${
          canUpload ? "cursor-pointer hover:border-atlas-400" : "opacity-60 cursor-not-allowed"
        }`}
        onClick={() => canUpload && fileInputRef.current?.click()}
        onDragOver={(e) => canUpload && e.preventDefault()}
        onDrop={(e) => {
          if (!canUpload) return;
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
      >
        <span className="material-symbols-outlined text-[40px] text-atlas-600 mb-3">cloud_upload</span>
        <p className="text-[15px] font-semibold text-text-primary">{copy.documents.dropHint}</p>
        <p className="text-[12px] text-text-muted mt-1">{copy.documents.dropSubhint}</p>
        {!canUpload && templates.length > 0 && (
          <p className="text-[11px] text-text-muted mt-3">{copy.documents.chooseTypeFirst}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          disabled={!canUpload}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </Card>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <DocumentRow
              key={item.id}
              fileName={item.file.name}
              fileSizeMb={item.file.size / (1024 * 1024)}
              evidenceTypeName={item.templateName || undefined}
              status={item.status}
              verification={item.verification}
              onViewEvidence={
                item.documentId
                  ? () => navigate(`/w/${workspaceId}/evidence`)
                  : undefined
              }
              onRemove={() => setItems((cur) => cur.filter((i) => i.id !== item.id))}
              disabled={item.status === "uploading" || item.status === "processing"}
            />
          ))}
        </div>
      )}

      {items.some((i) => i.status === "needs_review") && (
        <div className="flex justify-end">
          <Button onClick={() => navigate(`/w/${workspaceId}/review`)}>{copy.period.continueReview}</Button>
        </div>
      )}
    </div>
  );
}
