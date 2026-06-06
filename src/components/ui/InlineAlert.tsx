export function InlineAlert({
  variant = "info",
  children,
  onDismiss,
}: {
  variant?: "info" | "success" | "warning" | "danger";
  children: React.ReactNode;
  onDismiss?: () => void;
}) {
  const styles = {
    info: "bg-info-bg border-info-border text-info",
    success: "bg-success-bg border-success-border text-success",
    warning: "bg-warning-bg border-warning-border text-warning",
    danger: "bg-danger-bg border-danger-border text-danger",
  };
  const icons = {
    info: "info",
    success: "check_circle",
    warning: "warning",
    danger: "error",
  };

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-[13px] animate-slide-up ${styles[variant]}`}>
      <span className="material-symbols-outlined text-[18px] shrink-0">{icons[variant]}</span>
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 opacity-70 hover:opacity-100" aria-label="Dismiss">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      )}
    </div>
  );
}
