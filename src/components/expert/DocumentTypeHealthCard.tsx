import { copy } from "../../lib/copy";

export function DocumentTypeHealthCard({
  name,
  documentsProcessed,
  averageConfidence,
  pendingCount,
  missingCount,
  selected,
  onClick,
}: {
  name: string;
  documentsProcessed: number;
  averageConfidence: number;
  pendingCount: number;
  missingCount: number;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border transition ${
        selected
          ? "bg-atlas-500/5 border-atlas-500 ring-1 ring-atlas-500/20"
          : "bg-surface border-border hover:border-atlas-300"
      }`}
    >
      <p className="text-[13px] font-semibold truncate">{name}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-text-secondary">
        <span>{documentsProcessed} documents</span>
        <span>{Math.round(averageConfidence * 100)}% avg confidence</span>
        {pendingCount > 0 && <span className="text-warning">{pendingCount} awaiting review</span>}
        {missingCount > 0 && <span className="text-danger">{missingCount} missing fields</span>}
      </div>
    </button>
  );
}

export function DocumentTypeHealthSummary({
  totalDocuments,
  needsReview,
  lowConfidence,
  documentTypeCount,
}: {
  totalDocuments: number;
  needsReview: number;
  lowConfidence: number;
  documentTypeCount: number;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: "Documents", value: totalDocuments },
        { label: "Awaiting review", value: needsReview, warn: needsReview > 0 },
        { label: "Low confidence", value: lowConfidence, danger: lowConfidence > 0 },
        { label: copy.nav.documentTypes, value: documentTypeCount },
      ].map((stat) => (
        <div key={stat.label} className="rounded-lg border border-border bg-surface p-4">
          <p className="text-[11px] text-text-muted uppercase tracking-wide">{stat.label}</p>
          <p
            className={`text-2xl font-bold mt-1 ${
              stat.danger ? "text-danger" : stat.warn ? "text-warning" : "text-text-primary"
            }`}
          >
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
