import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "interactive" | "flush";
}

export function Card({ variant = "default", className = "", children, ...props }: CardProps) {
  const base = "bg-surface border border-border rounded-xl";

  const variants = {
    default: "p-5 shadow-sm",
    interactive: "p-5 shadow-sm hover:shadow-md hover:border-atlas-400/30 transition-all duration-200 cursor-pointer",
    flush: "p-0 shadow-sm overflow-hidden",
  };

  return (
    <div className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
