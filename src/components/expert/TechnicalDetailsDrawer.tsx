import { Dialog } from "../ui/Dialog";
import { copy } from "../../lib/copy";

export function TechnicalDetailsDrawer({
  open,
  onClose,
  title,
  json,
  fieldKeys,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  json?: Record<string, unknown> | unknown[] | null;
  fieldKeys?: { key: string; label: string }[];
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title || copy.expert.technicalDetails}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {fieldKeys && fieldKeys.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-text-secondary mb-2">{copy.expert.fieldKeys}</p>
            <ul className="space-y-1 text-[12px]">
              {fieldKeys.map((f) => (
                <li key={f.key} className="flex justify-between gap-2 border-b border-border-light py-1">
                  <span className="text-text-primary">{f.label}</span>
                  <code className="text-[10px] text-text-muted">{f.key}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
        {json != null && (
          <div>
            <p className="text-[11px] font-semibold text-text-secondary mb-2">{copy.expert.rawExport}</p>
            <pre className="text-[11px] max-h-[320px] overflow-auto whitespace-pre-wrap bg-surface-secondary border border-border rounded-lg p-3">
              {JSON.stringify(json, null, 2)}
            </pre>
          </div>
        )}
        {!json && (!fieldKeys || fieldKeys.length === 0) && (
          <p className="text-[13px] text-text-muted">No technical details available.</p>
        )}
      </div>
    </Dialog>
  );
}
