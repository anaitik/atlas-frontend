export type StepStatus = "complete" | "current" | "upcoming";

export type StepperStep = {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
};

export function Stepper({ steps }: { steps: StepperStep[] }) {
  return (
    <ol className="flex flex-wrap items-start gap-2 sm:gap-0 sm:flex-nowrap">
      {steps.map((step, i) => (
        <li key={step.id} className="flex items-center flex-1 min-w-[120px] sm:min-w-0">
          <div className="flex flex-col items-center flex-1 text-center px-1">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[13px] font-bold transition-colors ${
                step.status === "complete"
                  ? "border-atlas-500 bg-atlas-500 text-white"
                  : step.status === "current"
                  ? "border-atlas-500 bg-atlas-50 text-atlas-700"
                  : "border-border bg-surface-secondary text-text-muted"
              }`}
            >
              {step.status === "complete" ? (
                <span className="material-symbols-outlined text-[18px]">check</span>
              ) : (
                i + 1
              )}
            </div>
            <p
              className={`mt-2 text-[12px] font-semibold ${
                step.status === "upcoming" ? "text-text-muted" : "text-text-primary"
              }`}
            >
              {step.label}
            </p>
            {step.detail && <p className="text-[10px] text-text-muted mt-0.5">{step.detail}</p>}
          </div>
          {i < steps.length - 1 && (
            <div
              className={`hidden sm:block h-[2px] flex-1 mx-1 mb-6 rounded-full ${
                step.status === "complete" ? "bg-atlas-400" : "bg-border"
              }`}
              aria-hidden
            />
          )}
        </li>
      ))}
    </ol>
  );
}
