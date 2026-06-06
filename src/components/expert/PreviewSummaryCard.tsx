import { copy } from "../../lib/copy";
import { formatProjectedMetric, humanizeKey } from "../../lib/display-labels";

export function PreviewSummaryCard({
  fileName,
  confidence,
  payload,
  metricCandidates,
  metricTargets,
  onViewDetails,
}: {
  fileName: string;
  confidence?: number;
  payload?: Record<string, unknown> | null;
  metricCandidates?: Array<{ metric_code?: string; name?: string }>;
  metricTargets?: string[];
  onViewDetails?: () => void;
}) {
  const fields = Object.entries(payload || {});
  const filled = fields.filter(([, v]) => v != null && String(v).length > 0).length;
  const missing = fields.length - filled;

  return (
    <div className="p-4 rounded-lg border border-border bg-surface">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[13px] font-semibold text-text-primary">{fileName}</p>
          {confidence != null && (
            <p className="text-[11px] text-text-secondary mt-0.5">
              Confidence: {Math.round(confidence * 100)}%
            </p>
          )}
        </div>
        {onViewDetails && (
          <button type="button" className="text-[11px] font-semibold text-atlas-700 hover:underline" onClick={onViewDetails}>
            {copy.expert.viewDetails}
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-[12px] mb-3">
        <div className="rounded-md bg-surface-secondary p-2">
          <p className="text-text-muted text-[10px] uppercase">{copy.expert.fieldsFound}</p>
          <p className="font-bold text-text-primary">{filled}</p>
        </div>
        <div className="rounded-md bg-surface-secondary p-2">
          <p className="text-text-muted text-[10px] uppercase">{copy.expert.fieldsMissing}</p>
          <p className="font-bold text-text-primary">{missing}</p>
        </div>
      </div>
      {(metricCandidates?.length || metricTargets?.length) ? (
        <div>
          <p className="text-[11px] font-semibold text-text-secondary mb-1">{copy.expert.projectedMetrics}</p>
          <div className="flex flex-wrap gap-1">
            {(metricCandidates || []).slice(0, 4).map((m, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-atlas-100 text-atlas-700">
                {formatProjectedMetric(m.metric_code, m.name)}
              </span>
            ))}
            {(metricTargets || []).slice(0, 4).map((t, i) => (
              <span key={`t-${i}`} className="text-[10px] px-2 py-0.5 rounded-full bg-atlas-100 text-atlas-700">
                {humanizeKey(t)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
