import { Button } from "./Button";
import type { HubBlocker } from "../../lib/workspace-hub";

export function PublishReadinessCard({
  blockers,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: {
  blockers: HubBlocker[];
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      {blockers.length > 0 ? (
        <>
          <h3 className="text-[14px] font-bold text-text-primary mb-3">What's blocking publish?</h3>
          <ul className="space-y-2 mb-4">
            {blockers.map((b) => (
              <li key={b.id} className="flex items-start gap-2 text-[13px] text-text-secondary">
                <span className="material-symbols-outlined text-warning text-[18px] shrink-0 mt-0.5">info</span>
                <span>{b.message}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-[13px] text-success mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          No blockers — you're ready to finalize your report.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onPrimary}>{primaryLabel}</Button>
        {secondaryLabel && onSecondary && (
          <Button variant="outline" onClick={onSecondary}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
