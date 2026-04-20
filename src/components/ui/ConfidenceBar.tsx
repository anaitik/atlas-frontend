interface ConfidenceBarProps {
  value: number; // 0–1
  showLabel?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ConfidenceBar({ value, showLabel = true, size = "sm", className = "" }: ConfidenceBarProps) {
  const pct = Math.round(value * 100);
  const width = `${Math.min(100, Math.max(0, pct))}%`;

  const color =
    pct >= 85 ? "bg-success" :
    pct >= 60 ? "bg-warning" :
    "bg-danger";

  const textColor =
    pct >= 85 ? "text-success" :
    pct >= 60 ? "text-warning" :
    "text-danger";

  const trackHeight = size === "sm" ? "h-1" : "h-1.5";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 ${trackHeight} bg-gray-200 rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width }}
        />
      </div>
      {showLabel && (
        <span className={`text-[11px] font-semibold min-w-[32px] text-right ${textColor}`}>
          {pct}%
        </span>
      )}
    </div>
  );
}
