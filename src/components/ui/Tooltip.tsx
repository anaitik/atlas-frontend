import { useId, useState } from "react";

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span tabIndex={0} aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`absolute z-50 max-w-[220px] rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[11px] leading-snug text-text-secondary shadow-lg ${
            side === "top" ? "bottom-full left-1/2 mb-1.5 -translate-x-1/2" : "top-full left-1/2 mt-1.5 -translate-x-1/2"
          }`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
