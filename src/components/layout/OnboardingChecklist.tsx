import { copy } from "../../lib/copy";
import { useUiPreferencesStore } from "../../store/uiPreferences";

type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  actionLabel?: string;
  onAction?: () => void;
};

export function OnboardingChecklist({
  companyId,
  items,
}: {
  companyId: string;
  items: ChecklistItem[];
}) {
  const { isOnboardingDismissed, dismissOnboarding } = useUiPreferencesStore();

  if (isOnboardingDismissed(companyId)) return null;

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;

  if (allDone) return null;

  return (
    <div className="rounded-xl border border-atlas-200 bg-atlas-50/80 p-5 animate-atlas-in">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-[14px] font-bold text-atlas-900">Getting started</h3>
          <p className="text-[12px] text-atlas-800/80 mt-0.5">
            {doneCount} of {items.length} complete — finish these steps to publish your first report.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dismissOnboarding(companyId)}
          className="text-[11px] font-medium text-atlas-700 hover:text-atlas-900 shrink-0"
        >
          Dismiss
        </button>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/60 border border-atlas-100 px-3 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`material-symbols-outlined text-[20px] shrink-0 ${
                  item.done ? "text-atlas-600" : "text-text-muted"
                }`}
              >
                {item.done ? "check_circle" : "radio_button_unchecked"}
              </span>
              <span className={`text-[13px] ${item.done ? "text-text-muted line-through" : "text-text-primary font-medium"}`}>
                {item.label}
              </span>
            </div>
            {!item.done && item.actionLabel && item.onAction && (
              <button
                type="button"
                onClick={item.onAction}
                className="text-[12px] font-semibold text-atlas-700 hover:text-atlas-900 shrink-0"
              >
                {item.actionLabel}
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-atlas-700/70 mt-3">{copy.period.readiness}</p>
    </div>
  );
}
