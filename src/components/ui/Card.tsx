import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "interactive" | "flush";
}

export function Card({ variant = "default", className = "", children, ...props }: CardProps) {
  const base = "bg-surface border border-border-light rounded-2xl shadow-card";

  const variants = {
    default: "p-5",
    interactive:
      "p-5 transition-all duration-300 hover:shadow-card-hover hover:border-atlas-400/40 hover:-translate-y-0.5 cursor-pointer",
    flush: "p-0 overflow-hidden",
  };

  return (
    <div className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
