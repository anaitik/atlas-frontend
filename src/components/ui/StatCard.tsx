interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  variant?: "default" | "success" | "warning" | "danger" | "muted";
  delta?: string;
  className?: string;
}

const variantStyles = {
  default: { value: "text-text-primary", icon: "text-atlas-600 bg-atlas-300/20" },
  success: { value: "text-success", icon: "text-success bg-success-bg" },
  warning: { value: "text-warning", icon: "text-warning bg-warning-bg" },
  danger: { value: "text-danger", icon: "text-danger bg-danger-bg" },
  muted: { value: "text-text-muted", icon: "text-text-muted bg-gray-100" },
};

export function StatCard({ label, value, subtitle, icon, variant = "default", delta, className = "" }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`bg-surface border border-border-light rounded-2xl shadow-card p-5 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">
          {label}
        </div>
        {icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${styles.icon}`}>
            <span className="material-symbols-outlined text-[18px]">{icon}</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`text-[28px] font-bold leading-none ${styles.value}`}>
          {value}
        </span>
        {delta && (
          <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${
            delta.startsWith("+") || delta.startsWith("↑") ? "text-success bg-success-bg" :
            delta.startsWith("-") || delta.startsWith("↓") ? "text-danger bg-danger-bg" :
            "text-text-muted bg-gray-100"
          }`}>
            {delta}
          </span>
        )}
      </div>
      {subtitle && (
        <div className="mt-1.5 text-[12px] text-text-secondary leading-relaxed">
          {subtitle}
        </div>
      )}
    </div>
  );
}
