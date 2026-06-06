import { Button } from "./Button";

export function EmptyState({
  icon = "inbox",
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="py-16 text-center">
      <span className="material-symbols-outlined text-[48px] text-text-muted mb-4 block">{icon}</span>
      <h3 className="text-[16px] font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-[13px] text-text-secondary mb-6 max-w-md mx-auto leading-relaxed">{description}</p>
      {actionLabel && onAction && <Button onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}
