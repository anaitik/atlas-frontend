import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "success" | "outline";
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

  const variants = {
    primary: "bg-atlas-600 hover:bg-atlas-700 text-white shadow-sm hover:shadow-md active:scale-[0.98]",
    ghost: "bg-transparent text-text-secondary hover:text-text-primary active:scale-[0.98]",
    outline: "bg-transparent border border-border hover:bg-surface-secondary text-text-secondary hover:text-text-primary active:scale-[0.98]",
    danger: "bg-danger hover:bg-red-700 text-white shadow-sm active:scale-[0.98]",
    success: "bg-success hover:bg-green-700 text-white shadow-sm active:scale-[0.98]",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
