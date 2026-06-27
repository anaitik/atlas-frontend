import { useEffect, useState } from "react";
import { Button } from "./Button";

export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface shadow-xl overflow-hidden animate-atlas-in">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="dialog-title" className="text-[15px] font-bold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text-muted hover:bg-surface-secondary hover:text-text-primary"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="px-5 py-4 text-[13px] text-text-secondary leading-relaxed">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border bg-surface-secondary px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function PromptDialog({
  open,
  title,
  message,
  placeholder,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  required = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  required?: boolean;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>{cancelLabel}</Button>
          <Button disabled={required && !value.trim()} onClick={() => { if (value.trim() || !required) onConfirm(value.trim()); }}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <p className="mb-3">{message}</p>}
      <textarea
        autoFocus
        rows={3}
        className="w-full bg-white border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-atlas-500/30 focus:border-atlas-500 resize-none"
        placeholder={placeholder || "Enter your notes…"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey && (value.trim() || !required)) onConfirm(value.trim()); }}
      />
      {required && <p className="text-[11px] text-text-muted mt-1">Required to proceed.</p>}
    </Dialog>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant === "danger" ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message}
    </Dialog>
  );
}
