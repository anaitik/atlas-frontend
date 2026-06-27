import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../lib/api-client";
import { Button } from "../../components/ui/Button";
import { InlineAlert } from "../../components/ui/InlineAlert";

// ─── Types ────────────────────────────────────────────────────────────────────

type ConfigMap = Record<string, Record<string, unknown>>;

// ─── Namespace metadata ───────────────────────────────────────────────────────

const NS_META: Record<string, { label: string; icon: string; blurb: string; renderer: string }> = {
  "scoring.rubric": {
    label: "ESG scoring weights",
    icon: "tune",
    blurb: "Pillar weights and sub-score weights that drive the Atlas ESG performance score.",
    renderer: "rubric",
  },
  "extraction.thresholds": {
    label: "Extraction thresholds",
    icon: "rule",
    blurb: "Confidence thresholds for document extraction and auto-approval.",
    renderer: "thresholds",
  },
  "interview.generation": {
    label: "AI generation settings",
    icon: "auto_awesome",
    blurb: "AI model, temperature, max questions and the system prompt for interview question generation.",
    renderer: "generation",
  },
  "interview.metric_aliases": {
    label: "Document → question mapping",
    icon: "sync_alt",
    blurb: "Maps extracted metric codes to interview questions so uploads auto-fill answers.",
    renderer: "aliases",
  },
  "interview.grounding": {
    label: "AI grounding sources",
    icon: "menu_book",
    blurb: "Standards and text the AI grounds generated questions in.",
    renderer: "grounding",
  },
  "company_profile.fields": {
    label: "Company intake fields",
    icon: "badge",
    blurb: "Company info fields shown during onboarding and which are mandatory.",
    renderer: "profile_fields",
  },
  "scoring.sector_benchmarks": {
    label: "Sector benchmarks",
    icon: "leaderboard",
    blurb: "Per-NACE carbon-intensity medians used to benchmark against peers.",
    renderer: "raw",
  },
  "interview.default_blueprint": {
    label: "Default interview questions",
    icon: "quiz",
    blurb: "The canonical VSME question set seeded into every new interview.",
    renderer: "raw",
  },
};

// ─── Save toast ───────────────────────────────────────────────────────────────

function SaveToast({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-atlas-700 text-white rounded-xl px-4 py-3 shadow-pop animate-slide-up text-[13px] font-semibold">
      <span className="material-symbols-outlined text-[18px] text-atlas-300">check_circle</span>
      Changes saved
    </div>
  );
}

// ─── Weight slider row ────────────────────────────────────────────────────────

function WeightRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-4">
      <div className="w-40 shrink-0">
        <p className="text-[13px] font-semibold text-text-primary">{label}</p>
        {hint && <p className="text-[11px] text-text-muted">{hint}</p>}
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        onChange={(e) => onChange(parseInt(e.target.value) / 100)}
        className="flex-1 accent-atlas-500 h-1.5"
      />
      <div className="w-14 text-right">
        <span className="text-[14px] font-bold text-atlas-600">{pct}%</span>
      </div>
    </div>
  );
}

// ─── Percentage input ─────────────────────────────────────────────────────────

function PctInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-start gap-4 p-4 bg-surface-secondary rounded-xl border border-border-light">
      <div className="flex-1">
        <p className="text-[13px] font-semibold text-text-primary">{label}</p>
        {hint && <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={(e) => onChange(parseInt(e.target.value) / 100)}
          className="w-20 text-center bg-white border border-border rounded-lg px-3 py-2 text-[14px] font-bold text-atlas-600 focus:outline-none focus:ring-2 focus:ring-atlas-500/30 focus:border-atlas-500"
        />
        <span className="text-[14px] font-semibold text-text-muted">%</span>
      </div>
    </div>
  );
}

// ─── Rubric form ──────────────────────────────────────────────────────────────

function RubricForm({
  data,
  onSave,
  saving,
}: {
  data: Record<string, unknown>;
  onSave: (updated: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(data);
  const dirty = JSON.stringify(draft) !== JSON.stringify(data);

  const setWeight = (path: string[], val: number) => {
    setDraft((d) => {
      const next = { ...d };
      let cur: any = next;
      for (let i = 0; i < path.length - 1; i++) {
        cur[path[i]] = { ...(cur[path[i]] as object) };
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = val;
      return next;
    });
  };

  const pw = (draft.pillar_weights as Record<string, number>) || {};
  const ew = (draft.environmental_weights as Record<string, number>) || {};
  const sw = (draft.social_weights as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      <div>
        <p className="atlas-eyebrow mb-3">Pillar weights</p>
        <div className="atlas-card p-5 space-y-4">
          <WeightRow label="Environmental" value={pw.environmental ?? 0.4} onChange={(v) => setWeight(["pillar_weights", "environmental"], v)} />
          <WeightRow label="Social" value={pw.social ?? 0.3} onChange={(v) => setWeight(["pillar_weights", "social"], v)} />
          <WeightRow label="Governance" value={pw.governance ?? 0.3} onChange={(v) => setWeight(["pillar_weights", "governance"], v)} />
        </div>
      </div>

      <div>
        <p className="atlas-eyebrow mb-3">Environmental sub-weights</p>
        <div className="atlas-card p-5 space-y-4">
          <WeightRow label="Carbon intensity" value={ew.carbon_intensity ?? 0.45} onChange={(v) => setWeight(["environmental_weights", "carbon_intensity"], v)} />
          <WeightRow label="Renewable energy" value={ew.renewable ?? 0.30} onChange={(v) => setWeight(["environmental_weights", "renewable"], v)} />
          <WeightRow label="Recycling" value={ew.recycling ?? 0.25} onChange={(v) => setWeight(["environmental_weights", "recycling"], v)} />
        </div>
      </div>

      <div>
        <p className="atlas-eyebrow mb-3">Social sub-weights</p>
        <div className="atlas-card p-5 space-y-4">
          <WeightRow label="Minimum wage" value={sw.min_wage ?? 0.35} onChange={(v) => setWeight(["social_weights", "min_wage"], v)} />
          <WeightRow label="Gender balance" value={sw.gender ?? 0.30} onChange={(v) => setWeight(["social_weights", "gender"], v)} />
          <WeightRow label="Health & safety" value={sw.safety ?? 0.35} onChange={(v) => setWeight(["social_weights", "safety"], v)} />
        </div>
      </div>

      <Button disabled={!dirty || saving} onClick={() => onSave(draft)}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

// ─── Thresholds form ──────────────────────────────────────────────────────────

function ThresholdsForm({
  data,
  onSave,
  saving,
}: {
  data: Record<string, unknown>;
  onSave: (updated: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(data);
  const dirty = JSON.stringify(draft) !== JSON.stringify(data);

  return (
    <div className="space-y-4">
      <PctInput
        label="Confidence threshold"
        value={(draft.confidence_threshold as number) ?? 0.9}
        onChange={(v) => setDraft((d) => ({ ...d, confidence_threshold: v }))}
        hint="Extractions below this confidence are flagged for human review."
      />
      <PctInput
        label="Auto-approve minimum"
        value={(draft.auto_approve_min_confidence as number) ?? 0.85}
        onChange={(v) => setDraft((d) => ({ ...d, auto_approve_min_confidence: v }))}
        hint="Extractions above this threshold are automatically approved without review."
      />
      <Button disabled={!dirty || saving} onClick={() => onSave(draft)}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

// ─── Generation form ──────────────────────────────────────────────────────────

const MODELS = [
  { value: "", label: "Auto (use platform default)" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B (Groq)" },
];

function GenerationForm({
  data,
  onSave,
  saving,
}: {
  data: Record<string, unknown>;
  onSave: (updated: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(data);
  const dirty = JSON.stringify(draft) !== JSON.stringify(data);

  const temp = (draft.temperature as number) ?? 0.2;
  const maxQ = (draft.max_questions as number) ?? 25;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="atlas-card p-4">
          <label className="atlas-label">AI Model</label>
          <select
            value={(draft.model as string) ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value || null }))}
            className="atlas-input"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="atlas-card p-4">
          <label className="atlas-label">Max interview questions</label>
          <input
            type="number"
            min={5}
            max={100}
            value={maxQ}
            onChange={(e) => setDraft((d) => ({ ...d, max_questions: parseInt(e.target.value) }))}
            className="atlas-input"
          />
        </div>
      </div>

      <div className="atlas-card p-4">
        <label className="atlas-label">Temperature — {temp.toFixed(1)}</label>
        <p className="text-[11px] text-text-muted mb-3">Lower = more precise and consistent. Higher = more creative and varied.</p>
        <div className="flex items-center gap-4">
          <span className="text-[11px] text-text-muted">Precise</span>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={Math.round(temp * 10)}
            onChange={(e) => setDraft((d) => ({ ...d, temperature: parseInt(e.target.value) / 10 }))}
            className="flex-1 accent-atlas-500 h-1.5"
          />
          <span className="text-[11px] text-text-muted">Creative</span>
        </div>
      </div>

      <div className="atlas-card p-4 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-text-primary">Require metric binding</p>
          <p className="text-[11px] text-text-muted mt-0.5">Every generated question must link to a known metric code.</p>
        </div>
        <button
          type="button"
          onClick={() => setDraft((d) => ({ ...d, require_metric_binding: !d.require_metric_binding }))}
          className={`relative w-11 h-6 rounded-full transition-colors ${draft.require_metric_binding ? "bg-atlas-500" : "bg-gray-200"}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${draft.require_metric_binding ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      <div className="atlas-card p-4">
        <label className="atlas-label">System prompt</label>
        <p className="text-[11px] text-text-muted mb-2">Instructions given to the AI when generating interview questions.</p>
        <textarea
          value={(draft.system_prompt as string) ?? ""}
          onChange={(e) => setDraft((d) => ({ ...d, system_prompt: e.target.value }))}
          rows={6}
          className="atlas-input resize-none font-mono text-[12px] leading-relaxed"
        />
      </div>

      <Button disabled={!dirty || saving} onClick={() => onSave(draft)}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

// ─── Metric aliases form ──────────────────────────────────────────────────────

function AliasesForm({
  data,
  onSave,
  saving,
}: {
  data: Record<string, unknown>;
  onSave: (updated: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<Record<string, unknown>>(data);
  const dirty = JSON.stringify(draft) !== JSON.stringify(data);

  const entries = Object.entries(draft) as [string, { codes: string[]; unit: string; domain: string }][];

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-text-secondary">
        These mappings let uploaded document data auto-fill matching interview question answers.
      </p>
      <div className="atlas-card overflow-hidden">
        <table className="atlas-table">
          <thead>
            <tr>
              <th>Interview metric</th>
              <th>Extraction codes</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, val]) => (
              <tr key={key}>
                <td>
                  <code className="text-[11px] bg-atlas-50 text-atlas-700 px-2 py-0.5 rounded font-mono">{key}</code>
                </td>
                <td>
                  <div className="flex flex-wrap gap-1">
                    {(val.codes || []).map((code) => (
                      <span key={code} className="text-[11px] bg-surface-secondary border border-border rounded px-1.5 py-0.5 font-mono">
                        {code}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className="text-[12px] font-semibold text-text-secondary">{val.unit}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-muted">
        Advanced edits to this mapping require the JSON editor. Use "Show raw JSON" below.
      </p>
      <Button disabled={!dirty || saving} onClick={() => onSave(draft)}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

// ─── Grounding form ───────────────────────────────────────────────────────────

function GroundingForm({
  data,
  onSave,
  saving,
}: {
  data: Record<string, unknown>;
  onSave: (updated: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const sources = (data.sources as Array<{ id: string; label: string; type: string }>) || [];

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-text-secondary">
        These sources ground the AI when generating interview questions. They are read-only reference standards.
      </p>
      <div className="space-y-3">
        {sources.map((src) => (
          <div key={src.id} className="atlas-card p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-atlas-50 border border-atlas-200 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[16px] text-atlas-600">menu_book</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-text-primary">{src.label}</p>
              <span className="inline-block mt-1 text-[11px] bg-info-bg text-info border border-info-border rounded-full px-2 py-0.5 font-medium capitalize">
                {src.type}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-text-muted">
        Source modifications require editing raw JSON below. Incorrect changes may affect question quality.
      </p>
      <Button disabled={saving} onClick={() => onSave(data)} variant="outline">
        {saving ? "Saving…" : "Mark as reviewed"}
      </Button>
    </div>
  );
}

// ─── Company profile fields form ──────────────────────────────────────────────

function ProfileFieldsForm({
  data,
  onSave,
  saving,
}: {
  data: Record<string, unknown>;
  onSave: (updated: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const sections = (data.sections as Array<{
    id: string;
    label: string;
    fields: Array<{ key: string; label: string; type: string; required: boolean }>;
  }>) || [];

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-text-secondary">
        These are the fields collected when a company completes its profile. Required fields must be filled before workspaces can be created.
      </p>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="atlas-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border-light bg-surface-secondary">
              <p className="text-[13px] font-bold text-text-primary">{section.label}</p>
            </div>
            <div className="divide-y divide-border-light">
              {section.fields.map((field) => (
                <div key={field.key} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-text-primary font-medium">{field.label}</p>
                    <p className="text-[11px] text-text-muted">{field.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {field.required && (
                      <span className="text-[10px] font-bold text-danger bg-danger-bg border border-danger-border rounded-full px-2 py-0.5">
                        Required
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-text-muted">
        Field schema edits require the raw JSON editor below.
      </p>
      <Button disabled={saving} onClick={() => onSave(data)} variant="outline">
        {saving ? "Saving…" : "Mark as reviewed"}
      </Button>
    </div>
  );
}

// ─── Raw JSON fallback ────────────────────────────────────────────────────────

function RawJsonForm({
  data,
  onSave,
  saving,
  label,
}: {
  data: Record<string, unknown>;
  onSave: (updated: Record<string, unknown>) => void;
  saving: boolean;
  label: string;
}) {
  const [draft, setDraft] = useState(JSON.stringify(data, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const original = JSON.stringify(data, null, 2);
  const dirty = draft !== original;

  const handleSave = () => {
    try {
      const parsed = JSON.parse(draft);
      setJsonError(null);
      onSave(parsed);
    } catch {
      setJsonError("Invalid JSON. Fix the syntax before saving.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <span className="material-symbols-outlined text-[16px] text-amber-600">code</span>
        <p className="text-[12px] text-amber-700">
          This section uses a raw JSON editor because the data structure is complex. Edit carefully.
        </p>
      </div>
      {jsonError && (
        <div className="p-3 bg-danger-bg border border-danger-border rounded-lg text-[12px] text-danger flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {jsonError}
        </div>
      )}
      <textarea
        value={draft}
        onChange={(e) => { setDraft(e.target.value); setJsonError(null); }}
        spellCheck={false}
        className="w-full h-[400px] font-mono text-[12px] leading-relaxed rounded-xl border border-border bg-surface-secondary p-4 text-text-primary focus:border-atlas-400 focus:ring-1 focus:ring-atlas-300 outline-none resize-none"
        aria-label={`Raw JSON for ${label}`}
      />
      <Button disabled={!dirty || saving} onClick={handleSave}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

// ─── Namespace renderer ───────────────────────────────────────────────────────

function NamespaceForm({
  ns,
  data,
  onSave,
  saving,
}: {
  ns: string;
  data: Record<string, unknown>;
  onSave: (updated: Record<string, unknown>) => void;
  saving: boolean;
}) {
  const meta = NS_META[ns];
  const renderer = meta?.renderer ?? "raw";

  const [showRaw, setShowRaw] = useState(false);

  const shouldShowRawToggle = renderer !== "raw";

  return (
    <div className="space-y-4">
      {renderer === "rubric" && !showRaw && <RubricForm data={data} onSave={onSave} saving={saving} />}
      {renderer === "thresholds" && !showRaw && <ThresholdsForm data={data} onSave={onSave} saving={saving} />}
      {renderer === "generation" && !showRaw && <GenerationForm data={data} onSave={onSave} saving={saving} />}
      {renderer === "aliases" && !showRaw && <AliasesForm data={data} onSave={onSave} saving={saving} />}
      {renderer === "grounding" && !showRaw && <GroundingForm data={data} onSave={onSave} saving={saving} />}
      {renderer === "profile_fields" && !showRaw && <ProfileFieldsForm data={data} onSave={onSave} saving={saving} />}
      {(renderer === "raw" || showRaw) && (
        <RawJsonForm data={data} onSave={onSave} saving={saving} label={meta?.label ?? ns} />
      )}

      {shouldShowRawToggle && (
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-text-secondary transition-colors"
        >
          <span className="material-symbols-outlined text-[14px]">{showRaw ? "view_module" : "code"}</span>
          {showRaw ? "Back to form view" : "Show raw JSON"}
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ConfigurationPage() {
  const [config, setConfig] = useState<ConfigMap>({});
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    apiClient<ConfigMap>("/admin/config")
      .then((c) => {
        setConfig(c || {});
        const namespaces = Object.keys(c || {});
        const ordered = Object.keys(NS_META).filter((k) => namespaces.includes(k));
        const first = ordered[0] || namespaces[0] || "";
        setActive(first);
      })
      .catch((e) => setError(e?.message || "Could not load configuration."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(
    async (updated: Record<string, unknown>) => {
      setSaving(true);
      setError(null);
      try {
        const result = await apiClient<Record<string, unknown>>(`/admin/config/${active}`, {
          method: "PUT",
          body: JSON.stringify({ values: updated }),
        });
        setConfig((prev) => ({ ...prev, [active]: result }));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (e: any) {
        setError(e?.message || "Save failed.");
      } finally {
        setSaving(false);
      }
    },
    [active]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="material-symbols-outlined text-[32px] text-atlas-400 animate-spin">progress_activity</span>
      </div>
    );
  }

  const namespaces = [
    ...Object.keys(NS_META).filter((k) => k in config),
    ...Object.keys(config).filter((k) => !(k in NS_META)),
  ];

  const meta = NS_META[active] || { label: active, icon: "settings", blurb: "", renderer: "raw" };

  return (
    <div className="space-y-6 animate-atlas-in">
      <div>
        <h1 className="atlas-page-title">Platform configuration</h1>
        <p className="atlas-page-subtitle">
          Live control over scoring, interviews, intake fields and AI behaviour. Changes apply immediately.
        </p>
      </div>

      {error && (
        <InlineAlert variant="danger" onDismiss={() => setError(null)}>
          {error}
        </InlineAlert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        {/* Namespace list */}
        <div className="space-y-1">
          {namespaces.map((ns) => {
            const m = NS_META[ns] || { label: ns, icon: "settings" };
            const isActive = active === ns;
            return (
              <button
                key={ns}
                onClick={() => setActive(ns)}
                className={`w-full text-left rounded-xl border p-3 transition-all flex items-center gap-3 ${
                  isActive
                    ? "border-atlas-300 bg-atlas-50 shadow-sm"
                    : "border-border-light bg-surface hover:border-atlas-200 hover:bg-surface-secondary"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-atlas-100" : "bg-surface-secondary"}`}>
                  <span className={`material-symbols-outlined text-[16px] ${isActive ? "text-atlas-600" : "text-text-muted"}`}>
                    {m.icon}
                  </span>
                </div>
                <span className={`text-[13px] font-semibold ${isActive ? "text-atlas-700" : "text-text-secondary"}`}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Editor panel */}
        <div className="atlas-card p-6">
          <div className="flex items-start gap-3 mb-6 pb-4 border-b border-border-light">
            <div className="w-10 h-10 rounded-xl bg-atlas-50 border border-atlas-200 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px] text-atlas-600">{meta.icon}</span>
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-text-primary">{meta.label}</h2>
              <p className="text-[12px] text-text-secondary mt-0.5">{meta.blurb}</p>
            </div>
          </div>

          {active && config[active] && (
            <NamespaceForm
              key={active}
              ns={active}
              data={config[active]}
              onSave={handleSave}
              saving={saving}
            />
          )}
        </div>
      </div>

      <SaveToast visible={saved} />
    </div>
  );
}
