import { ConfidenceBar } from "./ConfidenceBar";

interface FieldCardProps {
  label: string;
  value: string;
  confidence: number; // 0–1
  flagged?: boolean;
  onFix?: () => void;
  className?: string;
}

export function FieldCard({ label, value, confidence, flagged = false, onFix, className = "" }: FieldCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${
      flagged
        ? "bg-warning-bg border-warning-border"
        : "bg-surface-secondary border-border"
    } ${className}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted mb-1">
        {label}
      </div>
      <div className="text-[14px] font-medium text-text-primary mb-3">
        {value}
      </div>
      <ConfidenceBar value={confidence} />
      {flagged && onFix && (
        <button
          onClick={onFix}
          className="mt-3 text-[11px] font-semibold text-warning border border-warning-border bg-white hover:bg-warning-bg rounded px-3 py-1 transition-colors cursor-pointer"
        >
          Check and Correct →
        </button>
      )}
    </div>
  );
}
