import { formatLineageBreadcrumb } from "../../lib/display-labels";
import { copy } from "../../lib/copy";

export function SourceTrail({
  metric,
  document,
  field,
  className = "",
}: {
  metric?: string | null;
  document?: string | null;
  field?: string | null;
  className?: string;
}) {
  const trail = formatLineageBreadcrumb({ metric, document, field });
  if (trail === "Trace not available") return null;

  return (
    <div className={`rounded-lg border border-border-light bg-surface-secondary px-3 py-2 ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted mb-1">
        {copy.expert.sourceTrail}
      </p>
      <p className="text-[12px] text-text-primary">{trail}</p>
    </div>
  );
}
