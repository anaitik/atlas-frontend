import { humanizeKey } from "../../lib/display-labels";
import { copy } from "../../lib/copy";

export type FieldRow = { key: string; value: string };

export function FieldValueTable({
  fields,
  editable = false,
  showTechnicalKeys = false,
  highlightKey,
  onChange,
  onRemove,
}: {
  fields: Record<string, unknown> | FieldRow[];
  editable?: boolean;
  showTechnicalKeys?: boolean;
  highlightKey?: string | null;
  onChange?: (key: string, value: string) => void;
  onRemove?: (key: string) => void;
}) {
  const entries: FieldRow[] = Array.isArray(fields)
    ? fields
    : Object.entries(fields || {}).map(([key, value]) => ({
        key,
        value: typeof value === "object" ? JSON.stringify(value) : String(value ?? ""),
      }));

  if (entries.length === 0) {
    return <p className="text-[13px] text-text-muted py-4">No extracted fields yet.</p>;
  }

  return (
    <div className="overflow-auto max-h-[62vh]">
      <table className="atlas-table">
        <thead>
          <tr>
            <th className="w-[40%]">Field</th>
            <th>{editable ? "Value (editable)" : "Value"}</th>
            {editable && onRemove && <th className="w-12" />}
          </tr>
        </thead>
        <tbody>
          {entries.map(({ key, value }) => (
            <tr key={key} className={highlightKey === key ? "bg-atlas-50" : undefined}>
              <td>
                <span className="font-semibold text-text-primary">{humanizeKey(key)}</span>
                {showTechnicalKeys && (
                  <code className="text-[10px] text-text-muted mt-0.5 block">{key}</code>
                )}
              </td>
              <td>
                {editable && onChange ? (
                  <input
                    className="atlas-input h-10 py-1"
                    data-field-key={key}
                    value={value}
                    onChange={(e) => onChange(key, e.target.value)}
                  />
                ) : (
                  <span className="text-[13px] text-text-primary break-all">{value || "—"}</span>
                )}
              </td>
              {editable && onRemove && (
                <td className="text-right pr-3">
                  <button
                    type="button"
                    className="text-text-muted hover:text-danger"
                    onClick={() => onRemove(key)}
                    aria-label={`Remove ${humanizeKey(key)}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FieldValueTableEmpty({ message }: { message?: string }) {
  return (
    <p className="text-[13px] text-text-muted py-6 text-center">
      {message || copy.review.subtitle}
    </p>
  );
}
