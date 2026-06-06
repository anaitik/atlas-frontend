import { formatStatusLabel } from "../../lib/display-labels";

export function MetricValueCard({
  name,
  value,
  unit,
  status,
  source,
  compact = false,
}: {
  name: string;
  value?: string | number;
  unit?: string;
  status?: string;
  source?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border border-border bg-surface-secondary ${
        compact ? "p-2.5" : "p-3"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`font-semibold text-text-primary ${compact ? "text-[11px]" : "text-[12px]"}`}>{name}</p>
        {status && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-atlas-100 text-atlas-700 shrink-0">
            {formatStatusLabel(status)}
          </span>
        )}
      </div>
      {value != null && (
        <p className={`font-bold text-text-primary tabular-nums mt-1 ${compact ? "text-[14px]" : "text-[16px]"}`}>
          {value}
          {unit ? ` ${unit}` : ""}
        </p>
      )}
      {source && (
        <p className="text-[10px] text-text-muted mt-1 truncate" title={source}>
          Source: {source}
        </p>
      )}
    </div>
  );
}
