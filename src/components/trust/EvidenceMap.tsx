import { useState } from "react";
import { copy } from "../../lib/copy";
import { EvidenceDrawer, type EvidenceItem } from "./EvidenceDrawer";

export type EvidenceMapRow = {
  id: string;
  metricLabel: string;
  value?: string;
  status: "verified" | "pending" | "missing";
  source?: string;
  approvedBy?: string;
  date?: string;
};

export function EvidenceMap({ rows, title }: { rows: EvidenceMapRow[]; title?: string }) {
  const [selected, setSelected] = useState<EvidenceMapRow | null>(null);

  if (rows.length === 0) {
    return (
      <p className="text-[13px] text-text-muted py-4">No metrics with evidence yet. Upload documents and complete review first.</p>
    );
  }

  const drawerItems: EvidenceItem[] = selected
    ? [
        {
          id: selected.id,
          label: selected.metricLabel,
          source: selected.source,
          approvedBy: selected.approvedBy,
          date: selected.date,
          status: selected.status,
        },
      ]
    : [];

  return (
    <>
      <div className="rounded-xl border border-border overflow-hidden">
        {title && (
          <div className="px-4 py-3 border-b border-border bg-surface-secondary">
            <h4 className="text-[12px] font-bold text-text-primary">{title || copy.trust.verificationSummary}</h4>
          </div>
        )}
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => setSelected(row)}
                className="w-full text-left px-4 py-3 hover:bg-surface-secondary transition-colors flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-text-primary">{row.metricLabel}</p>
                  {row.value && <p className="text-[12px] text-text-secondary mt-0.5">{row.value}</p>}
                  {row.source && (
                    <p className="text-[11px] text-text-muted mt-1 truncate">Source: {row.source}</p>
                  )}
                </div>
                <span
                  className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full ${
                    row.status === "verified"
                      ? "bg-atlas-100 text-atlas-700"
                      : row.status === "pending"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-danger-bg text-danger"
                  }`}
                >
                  {row.status === "verified" ? copy.trust.verified : row.status === "pending" ? copy.trust.pending : "Missing source"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <EvidenceDrawer open={!!selected} onClose={() => setSelected(null)} items={drawerItems} />
    </>
  );
}
