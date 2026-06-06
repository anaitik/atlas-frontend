import { VerificationBadge } from "../trust/VerificationBadge";
import type { DocumentVerification } from "./BlockchainBadge";

export type DocumentRowStatus = "queued" | "uploading" | "processing" | "needs_review" | "ready" | "error";

const STATUS_LABELS: Record<DocumentRowStatus, string> = {
  queued: "Queued",
  uploading: "Uploading…",
  processing: "Securing & processing…",
  needs_review: "Needs review",
  ready: "Ready",
  error: "Error",
};

const STATUS_CLASS: Record<DocumentRowStatus, string> = {
  queued: "bg-surface-secondary text-text-muted",
  uploading: "bg-info-bg text-info",
  processing: "bg-info-bg text-info",
  needs_review: "bg-warning-bg text-warning",
  ready: "bg-atlas-100 text-atlas-700",
  error: "bg-danger-bg text-danger",
};

export function DocumentRow({
  fileName,
  fileSizeMb,
  evidenceTypeName,
  status,
  verification,
  onViewEvidence,
  onRemove,
  disabled,
}: {
  fileName: string;
  fileSizeMb?: number;
  evidenceTypeName?: string;
  status: DocumentRowStatus;
  verification?: DocumentVerification | null;
  onViewEvidence?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface hover:bg-surface-secondary/80 transition-colors">
      <span className="material-symbols-outlined text-text-muted text-[22px]">description</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-primary truncate">{fileName}</p>
        <p className="text-[11px] text-text-muted mt-0.5">
          {evidenceTypeName || "Document"}
          {fileSizeMb != null && ` · ${fileSizeMb.toFixed(2)} MB`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {verification && <VerificationBadge verification={verification} showExpertProof={false} />}
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${STATUS_CLASS[status]}`}>
          {STATUS_LABELS[status]}
        </span>
        {onViewEvidence && status !== "queued" && (
          <button
            type="button"
            onClick={onViewEvidence}
            className="text-[11px] font-semibold text-atlas-700 hover:underline"
          >
            View evidence
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="p-1 text-text-muted hover:text-danger disabled:opacity-40"
            aria-label="Remove"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>
    </div>
  );
}
