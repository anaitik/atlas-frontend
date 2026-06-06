import { Dialog } from "../ui/Dialog";
import { copy } from "../../lib/copy";

export type EvidenceItem = {
  id: string;
  label: string;
  source?: string;
  approvedBy?: string;
  date?: string;
  status: "verified" | "pending" | "missing";
};

export function EvidenceDrawer({
  open,
  onClose,
  title,
  items,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  items: EvidenceItem[];
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title || copy.trust.howWeGotThis}>
      <ul className="space-y-3">
        {items.length === 0 ? (
          <p className="text-text-muted">No evidence trail available yet.</p>
        ) : (
          items.map((item) => (
            <li key={item.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-text-primary">{item.label}</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    item.status === "verified"
                      ? "bg-atlas-100 text-atlas-700"
                      : item.status === "pending"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-surface-secondary text-text-muted"
                  }`}
                >
                  {item.status === "verified" ? copy.trust.verified : item.status === "pending" ? copy.trust.pending : "Missing"}
                </span>
              </div>
              {item.source && <p className="text-[12px] text-text-secondary mt-1">Source: {item.source}</p>}
              {(item.approvedBy || item.date) && (
                <p className="text-[11px] text-text-muted mt-0.5">
                  {[item.approvedBy && `Approved by ${item.approvedBy}`, item.date].filter(Boolean).join(" · ")}
                </p>
              )}
            </li>
          ))
        )}
      </ul>
    </Dialog>
  );
}
