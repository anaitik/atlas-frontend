import { glossary } from "../../lib/copy";
import { useUiPreferencesStore } from "../../store/uiPreferences";

export function HelpPanel() {
  const { helpPanelOpen, setHelpPanelOpen } = useUiPreferencesStore();

  if (!helpPanelOpen) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[90] bg-black/30"
        aria-label="Close help"
        onClick={() => setHelpPanelOpen(false)}
      />
      <aside className="fixed top-0 right-0 z-[95] h-full w-full max-w-md border-l border-border bg-surface shadow-2xl flex flex-col animate-atlas-in">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[16px] font-bold text-text-primary">Help</h2>
          <button
            type="button"
            onClick={() => setHelpPanelOpen(false)}
            className="rounded-lg p-1 text-text-muted hover:bg-surface-secondary"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <section>
            <h3 className="text-[13px] font-bold text-text-primary mb-2">How reporting works</h3>
            <ol className="list-decimal list-inside space-y-2 text-[13px] text-text-secondary leading-relaxed">
              <li>Create a reporting period for your organization.</li>
              <li>Upload source documents (utility bills, emissions data, etc.).</li>
              <li>Your team reviews extracted values.</li>
              <li>Build and export your sustainability report.</li>
            </ol>
          </section>
          <section>
            <h3 className="text-[13px] font-bold text-text-primary mb-3">Glossary</h3>
            <dl className="space-y-3">
              {glossary.map((item) => (
                <div key={item.term}>
                  <dt className="text-[12px] font-semibold text-text-primary">{item.term}</dt>
                  <dd className="text-[12px] text-text-secondary mt-0.5 leading-relaxed">{item.definition}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="rounded-lg border border-border bg-surface-secondary p-4">
            <p className="text-[12px] text-text-secondary leading-relaxed">
              Need more help? Contact your organization administrator or Atlas support.
            </p>
          </section>
        </div>
      </aside>
    </>
  );
}
