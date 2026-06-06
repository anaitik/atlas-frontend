import React from "react";

type BadgeVariant = "green" | "amber" | "red" | "blue" | "gray" | "outline";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  green: "bg-success-bg text-success border border-success-border",
  amber: "bg-warning-bg text-warning border border-warning-border",
  red: "bg-danger-bg text-danger border border-danger-border",
  blue: "bg-info-bg text-info border border-info-border",
  gray: "bg-gray-100 text-gray-600 border border-gray-200",
  outline: "bg-transparent text-text-secondary border border-border",
};

export function Badge({ variant = "gray", children, className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide whitespace-nowrap ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

/** Convenience wrappers for common status patterns */
export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/[_\s]+/g, "_");

  const statusMap: Record<string, { variant: BadgeVariant; label: string }> = {
    active: { variant: "green", label: "Active" },
    complete: { variant: "green", label: "Complete" },
    completed: { variant: "green", label: "Completed" },
    approved: { variant: "green", label: "Approved" },
    verified: { variant: "green", label: "Verified" },
    aligned: { variant: "green", label: "Aligned" },
    clean: { variant: "green", label: "Clean" },
    ok: { variant: "green", label: "OK" },
    published: { variant: "green", label: "Published" },
    in_progress: { variant: "blue", label: "In Progress" },
    processing: { variant: "blue", label: "Processing" },
    extracting: { variant: "blue", label: "Extracting" },
    pending: { variant: "amber", label: "Pending" },
    pending_approval: { variant: "amber", label: "Awaiting Approval" },
    review_required: { variant: "amber", label: "Review Req" },
    needs_review: { variant: "amber", label: "Needs Review" },
    pending_review: { variant: "amber", label: "Awaiting Review" },
    manual_required: { variant: "amber", label: "Manual Req" },
    suspect: { variant: "amber", label: "Suspect" },
    urgent: { variant: "red", label: "Urgent" },
    rejected: { variant: "red", label: "Rejected" },
    failed: { variant: "red", label: "Failed" },
    error: { variant: "red", label: "Error" },
    missing: { variant: "red", label: "Missing" },
    neutral: { variant: "gray", label: "Neutral" },
    draft: { variant: "gray", label: "Draft" },
    not_started: { variant: "gray", label: "Not Started" },
  };

  const mapped = statusMap[normalized] || { variant: "gray" as BadgeVariant, label: status.replace(/_/g, " ") };

  return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
}
