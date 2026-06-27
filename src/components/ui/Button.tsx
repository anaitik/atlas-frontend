import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "success" | "outline";
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-atlas-500/40 focus-visible:ring-offset-1 active:scale-[0.97]";

  const variants = {
    primary: "bg-gradient-to-b from-atlas-500 to-atlas-600 hover:from-atlas-500 hover:to-atlas-700 text-white shadow-[0_1px_2px_rgba(5,46,22,0.2),0_4px_12px_rgba(22,101,52,0.25)] hover:shadow-[0_2px_4px_rgba(5,46,22,0.2),0_8px_20px_rgba(22,101,52,0.3)]",
    ghost: "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-secondary",
    outline: "bg-white border border-border hover:bg-surface-secondary hover:border-atlas-400/50 text-text-secondary hover:text-text-primary shadow-[0_1px_2px_rgba(15,29,21,0.04)]",
    danger: "bg-gradient-to-b from-red-500 to-red-600 hover:to-red-700 text-white shadow-[0_4px_12px_rgba(220,38,38,0.25)]",
    success: "bg-gradient-to-b from-atlas-500 to-atlas-600 hover:to-atlas-700 text-white shadow-[0_4px_12px_rgba(22,101,52,0.25)]",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
