import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { apiClient } from "../../lib/api-client";
import { Badge } from "../../components/ui/Badge";
import { useAuthStore } from "../../store/auth";
import { useWorkspaceStore } from "../../store/workspace";
import { env } from "../../lib/env";

type FieldType = "string" | "float" | "int" | "date" | "bool";
type SchemaField = { key: string; type: FieldType };
type UploadedDocument = { id: string };
type PreRunResult = {
  payload: Record<string, unknown>;
  confidence_score: number;
  exception_reason: string | null;
  metric_candidates: unknown[];
  metric_recommendation?: { metric_targets?: string[] };
  projected_metrics?: Array<{ metric_key: string; value: number | null; unit: string; status: string; error_detail?: string | null }>;
  readiness_summary?: {
    status?: "ready" | "review" | "blocked";
    headline?: string;
    blockers?: string[];
    suggestions?: string[];
    missing_fields?: string[];
    ok_metric_count?: number;
    failed_metric_count?: number;
  };
};

const DEFAULT_FORM = {
  name: "New ESG Extraction Template",
  system_prompt: "",
  target_metrics_nlp: "Describe the ESG outcomes to compute from this extraction (examples: total electricity use, Scope 1/2 emissions, water withdrawal, headcount, safety rates).",
};

const DEFAULT_SCHEMA_FIELDS: SchemaField[] = [{ key: "value", type: "float" }];

const FIELD_TYPE_OPTIONS: Array<{ value: FieldType; label: string }> = [
  { value: "string", label: "STRING" },
  { value: "float", label: "FLOAT" },
  { value: "int", label: "INTEGER" },
  { value: "date", label: "DATE" },
  { value: "bool", label: "BOOLEAN" },
];

function normalizeFieldType(input: unknown): FieldType {
  const value = String(input || "").trim().toLowerCase();
  if (!value) return "string";
  if (["bool", "boolean", "yesno", "truefalse"].includes(value)) return "bool";
  if (["int", "integer", "long"].includes(value)) return "int";
  if (["float", "number", "decimal", "double", "numeric"].includes(value)) return "float";
  if (["date", "datetime", "timestamp"].includes(value)) return "date";
  return "string";
}

function buildSystemPromptFromLegacyTemplate(template: any, rules: Record<string, any> = {}) {
  const schemaDefinition = Object.fromEntries(
    (Array.isArray(template.fields) ? template.fields : [])
      .filter((field: any) => field?.key)
      .map((field: any) => [field.key, normalizeFieldType(field.type)])
  );

  const ruleNames = Object.keys(rules || {});
  const fallbackIntent = ruleNames.length
    ? `Apply template-specific rules: ${ruleNames.slice(0, 6).join(", ")}.`
    : "Extract the primary ESG values needed for downstream reporting.";

  return [
    `You are extracting structured ESG data for template: ${template.label || template.template_id || "Imported Template"}.`,
    "Return JSON only with this payload shape (exact keys):",
    JSON.stringify(schemaDefinition, null, 2),
    "Extraction rules:",
    "- Use only evidence in the source document.",
    "- If a field is missing, return null.",
    "- Parse localized number formats accurately.",
    "- Normalize dates to YYYY-MM-DD when possible.",
    "- If `value` exists, map the primary measurable ESG quantity to `value`.",
    `Downstream metric intent: ${template.target_metrics_nlp || fallbackIntent}`,
  ].join("\n");
}

function normalizeImportedTemplate(raw: any, workspaceId?: string) {
  // Logic preserved
  const candidate = raw?.template ?? raw;
  const rules = raw?.rules ?? candidate?.rules ?? {};

  if (!candidate || typeof candidate !== "object") {
    throw new Error("Template JSON must be an object.");
  }

  if (candidate.name && candidate.schema_definition) {
    const normalizedSchema = Object.fromEntries(
      Object.entries(candidate.schema_definition || {}).map(([key, type]) => [key, normalizeFieldType(type)])
    );
    return {
      name: candidate.name,
      workspace_id: workspaceId ?? null,
      schema_definition: normalizedSchema,
      system_prompt: candidate.system_prompt || "",
      target_metrics_nlp: candidate.target_metrics_nlp || null,
    };
  }

  if (candidate.template_id && Array.isArray(candidate.fields)) {
    const schemaDefinition = Object.fromEntries(
      candidate.fields
        .filter((field: any) => field?.key)
        .map((field: any) => [field.key, normalizeFieldType(field.type)])
    );

    if (Object.keys(schemaDefinition).length === 0) {
      throw new Error("Legacy template JSON has no usable fields.");
    }

    return {
      name: candidate.label || candidate.template_id,
      workspace_id: workspaceId ?? null,
      schema_definition: schemaDefinition,
      system_prompt: buildSystemPromptFromLegacyTemplate(candidate, rules),
      target_metrics_nlp: candidate.target_metrics_nlp || "Describe the ESG metrics this template should feed.",
    };
  }

  throw new Error("Unsupported template format. Upload a Streamlit legacy template JSON or a current template draft JSON.");
}

export function TemplateManager() {
  const { workspaceId } = useParams();
  const user = useAuthStore((state) => state.user);
  const activeCompanyId = useWorkspaceStore((state) => state.activeCompanyId);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatorFile, setGeneratorFile] = useState<File | null>(null);
  const [generatorHints, setGeneratorHints] = useState("");
  const [, setGeneratedDraft] = useState<any | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdvancedPrompt, setShowAdvancedPrompt] = useState(false);
  const [preRunFile, setPreRunFile] = useState<File | null>(null);
  const [preRunFeedback, setPreRunFeedback] = useState("");
  const [preRunLoading, setPreRunLoading] = useState(false);
  const [preRunDocId, setPreRunDocId] = useState<string | null>(null);
  const [preRunResult, setPreRunResult] = useState<PreRunResult | null>(null);
  const [preRunPrevResult, setPreRunPrevResult] = useState<PreRunResult | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [templateForm, setTemplateForm] = useState(DEFAULT_FORM);
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>(DEFAULT_SCHEMA_FIELDS);

  const fetchTemplates = useCallback(async () => {
    try {
      const path = workspaceId ? `/templates?workspace_id=${workspaceId}` : "/templates";
      const res: any = await apiClient(path);
      setTemplates(res.items || res || []);
    } catch (e) {
      console.error(e);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  const stableStringify = (value: unknown) => {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const computePreRunDiff = (prev?: Record<string, unknown>, next?: Record<string, unknown>) => {
    const previous = prev || {};
    const current = next || {};
    const keys = new Set([...Object.keys(previous), ...Object.keys(current)]);
    const changes: string[] = [];
    for (const key of Array.from(keys).sort()) {
      if (!(key in previous)) {
        changes.push(`${key} (added)`);
      } else if (!(key in current)) {
        changes.push(`${key} (removed)`);
      } else if (stableStringify(previous[key]) !== stableStringify(current[key])) {
        changes.push(`${key} (updated)`);
      }
    }
    return changes;
  };

  const fieldReadiness = (result: PreRunResult | null) => {
    if (!result) {
      return { total: 0, filled: 0, missing: [] as string[], readiness: "not_run" as const };
    }
    const keys = schemaFields.map((f) => f.key.trim()).filter(Boolean);
    const missing = keys.filter((key) => {
      const value = result.payload?.[key];
      return value === null || value === undefined || value === "";
    });
    const filled = Math.max(0, keys.length - missing.length);
    const derivedOk = (result.projected_metrics || []).filter((m) => m.status === "OK").length;
    const readiness =
      keys.length > 0 && missing.length === 0 && derivedOk > 0 ? "ready" :
      keys.length > 0 && filled > 0 ? "partial" :
      "blocked";
    return { total: keys.length, filled, missing, readiness };
  };

  const handleEdit = (t: any) => {
    setEditingId(t.id);
    setTemplateForm({
      name: t.name || "",
      system_prompt: t.system_prompt || "",
      target_metrics_nlp: t.target_metrics_nlp || "",
    });
    setShowAdvancedPrompt(false);
    const fields = Object.entries(t.schema_definition || {}).map(([key, type]) => ({
      key,
      type: normalizeFieldType(type),
    }));
    setSchemaFields(fields.length ? fields : [...DEFAULT_SCHEMA_FIELDS]);
    setPreRunFile(null);
    setPreRunFeedback("");
    setPreRunDocId(null);
    setPreRunResult(null);
    setPreRunPrevResult(null);
    setShowEditor(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreate = async () => {
    try {
      setErrorMessage("");
      const sanitizedFields = schemaFields
        .map((field) => ({ key: field.key.trim(), type: normalizeFieldType(field.type) }))
        .filter((field) => field.key);
      if (sanitizedFields.length === 0) {
        setErrorMessage("Add at least one schema field before saving.");
        return;
      }
      const payload = {
        ...templateForm,
        system_prompt: (templateForm.system_prompt || "").trim() || null,
        schema_definition: Object.fromEntries(sanitizedFields.map((field) => [field.key, field.type])),
        workspace_id: workspaceId ?? null
      };
      
      if (editingId) {
        await apiClient(`/templates/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        setStatusMessage("Template updated. You can run Pre-run below.");
      } else {
        const created: any = await apiClient("/templates", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        if (created?.id) {
          setEditingId(created.id);
        }
        setStatusMessage("Template saved. Now run Pre-run from this editor.");
      }

      void fetchTemplates();
    } catch {
      setErrorMessage("Invalid JSON or server error.");
    }
  };


  const handleImportTemplate = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText);
      const normalized = normalizeImportedTemplate(parsed, workspaceId);

      await apiClient("/templates", {
        method: "POST",
        body: JSON.stringify(normalized),
      });

      setGeneratedDraft(null);
      setEditingId(null);
      setTemplateForm({
        name: normalized.name || "",
        system_prompt: normalized.system_prompt || "",
        target_metrics_nlp: normalized.target_metrics_nlp || "",
      });
      const fields = Object.entries(normalized.schema_definition || {}).map(([key, type]) => ({
        key,
        type: normalizeFieldType(type),
      }));
      setSchemaFields(fields.length ? fields : [...DEFAULT_SCHEMA_FIELDS]);
      setShowAdvancedPrompt(false);
      setShowEditor(true);
      setStatusMessage(`Imported ${file.name} successfully.`);
      void fetchTemplates();
    } catch (error: any) {
      setErrorMessage(error?.message || "Template import failed.");
    } finally {
      event.target.value = "";
      setImporting(false);
    }
  };

  const handleGenerateTemplate = async () => {
    if (!generatorFile) {
      setErrorMessage("Attach a sample PDF or source file first.");
      return;
    }

    setGenerating(true);
    setStatusMessage("");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", generatorFile);
      formData.append("user_hints", generatorHints);
      if (workspaceId) formData.append("workspace_id", workspaceId);

      const draft: any = await apiClient("/templates/generate", {
        method: "POST", body: formData,
      });

      setGeneratedDraft(draft);
      setEditingId(null);
      const normalized = draft.normalized_template;
      setTemplateForm({
        name: normalized.name || "",
        system_prompt: normalized.system_prompt || "",
        target_metrics_nlp: normalized.target_metrics_nlp || "",
      });
      const fields = Object.entries(normalized.schema_definition || {}).map(([key, type]) => ({
        key,
        type: normalizeFieldType(type),
      }));
      setSchemaFields(fields.length ? fields : [...DEFAULT_SCHEMA_FIELDS]);
      setShowAdvancedPrompt(false);
      setShowEditor(true);
      setShowGenerator(false);
      setStatusMessage(`Generated template draft from ${draft.filename}.`);
    } catch (error: any) {
      setErrorMessage(error?.message || "Template generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleTemplatePreRun = async () => {
    const companyId = activeCompanyId || user?.company_id || "platform";
    if (!companyId || !workspaceId) {
      setErrorMessage("Company/workspace context missing.");
      return;
    }
    if (!editingId) {
      setErrorMessage("Save this template first, then run Pre-run.");
      return;
    }
    if (!preRunFile && !preRunDocId) {
      setErrorMessage("Attach a sample document for pre-run.");
      return;
    }

    setErrorMessage("");
    setStatusMessage("");
    setPreRunLoading(true);
    try {
      let documentId = preRunDocId;
      if (!documentId && preRunFile) {
        const formData = new FormData();
        formData.append("file", preRunFile);
        formData.append("company_id", companyId);
        formData.append("workspace_id", workspaceId);
        const doc = await apiClient<UploadedDocument>("/documents", { method: "POST", body: formData });
        documentId = doc.id;
        setPreRunDocId(doc.id);
      }

      const result = await apiClient<PreRunResult>("/extraction/prerun", {
        method: "POST",
        body: JSON.stringify({
          document_id: documentId,
          template_id: editingId,
          feedback_nlp: preRunFeedback || null,
        }),
      });
      setPreRunPrevResult(preRunResult);
      setPreRunResult(result);
      setStatusMessage("Pre-run completed. Review output and tweak feedback if needed.");
    } catch (error: any) {
      setErrorMessage(error?.message || "Template pre-run failed.");
    } finally {
      setPreRunLoading(false);
    }
  };

  const buildAutoFeedback = (result: PreRunResult | null) => {
    if (!result?.readiness_summary) return "";
    const missing = result.readiness_summary.missing_fields || [];
    const hints: string[] = [];
    if (missing.length > 0) {
      hints.push(`Prioritize extracting these missing fields: ${missing.slice(0, 6).join(", ")}.`);
    }
    if ((result.readiness_summary.failed_metric_count || 0) > 0) {
      hints.push("Prefer source values with explicit units and avoid finance-only amounts as primary ESG values.");
    }
    hints.push("Return null for unavailable fields; do not guess.");
    return hints.join(" ");
  };

  const applyGuidanceAndRerun = async () => {
    const nextFeedback = buildAutoFeedback(preRunResult);
    if (nextFeedback) {
      setPreRunFeedback(nextFeedback);
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    await handleTemplatePreRun();
  };

  return (
    <div className="space-y-6">
      {env.DEMO_MODE && (
        <div className="rounded-lg border border-atlas-200 bg-atlas-50 px-3 py-2 text-[12px] text-atlas-800">
          <strong>Act 3 cue:</strong> Blueprints define extraction schema, units, and standards mapping before AI runs.
        </div>
      )}
      <header className="flex items-start justify-between mb-8">
        <div>
          <h1 className="atlas-page-title text-atlas-600">Template Library</h1>
          <p className="atlas-page-subtitle">Configure AI extraction schemas and metric derivations.</p>
        </div>
        <div className="flex gap-2 text-[12px]">
           <Button variant="ghost" onClick={() => setShowGenerator(v => !v)}>
             <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
             {showGenerator ? "Hide AI Wizard" : "AI Template Wizard"}
           </Button>
           <input
             ref={importInputRef}
             type="file"
             accept=".json,application/json"
             className="hidden"
             onChange={handleImportTemplate}
           />
           <Button variant="ghost" onClick={() => importInputRef.current?.click()} disabled={importing}>
             <span className="material-symbols-outlined text-[16px]">upload_file</span>
             {importing ? "Importing..." : "Import JSON"}
           </Button>
           <Button onClick={() => {
              setEditingId(null);
              setTemplateForm(DEFAULT_FORM);
              setSchemaFields([...DEFAULT_SCHEMA_FIELDS]);
              setShowAdvancedPrompt(false);
              setShowEditor(true);
            }}>Create Custom</Button>
        </div>
      </header>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-success-bg border border-success-border text-success text-[13px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-danger-bg border border-danger-border text-danger text-[13px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {errorMessage}
        </div>
      )}

      {showGenerator && (
        <Card className="border-atlas-400">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-6">
            <div className="max-w-2xl">
              <h2 className="text-[16px] font-bold text-text-primary">Generate Template from Evidence</h2>
              <p className="text-[13px] text-text-secondary mt-1">
                Upload a bill or receipt and AI will infer the schema and extraction logic.
              </p>
            </div>
            <Button disabled={!generatorFile || generating} onClick={handleGenerateTemplate}>
              {generating ? "Generating..." : "Generate Template Draft"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-border">
            <div>
              <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                Sample Evidence Document
              </label>
              <div className="atlas-dropzone py-6" onClick={() => document.getElementById('gen-file')?.click()}>
                 <span className="material-symbols-outlined text-[32px] text-text-muted mb-2 block">description</span>
                 <p className="text-[13px] font-semibold text-text-primary">
                    {generatorFile ? generatorFile.name : "Click to select a sample file"}
                 </p>
              </div>
              <input
                id="gen-file"
                type="file"
                className="hidden"
                onChange={(e) => setGeneratorFile(e.target.files?.[0] || null)}
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-2">
                Guidance (Optional)
              </label>
              <textarea
                className="atlas-input h-[120px] resize-none"
                placeholder="Example: This is a German electricity bill. Focus on total kWh..."
                value={generatorHints}
                onChange={(e) => setGeneratorHints(e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      {showEditor && (
        <Card className="border-atlas-600 relative border-2 shadow-lg">
          <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
             <h2 className="text-[18px] font-bold text-text-primary">{editingId ? "Edit Template" : "New Template Editor"}</h2>
             <Button variant="ghost" onClick={() => { setShowEditor(false); setEditingId(null); }}>
                <span className="material-symbols-outlined text-[18px]">close</span>
             </Button>
          </div>
          
          <div className="flex flex-col gap-6">
            <div>
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 block">Template Name</label>
              <input className="atlas-input py-2 bg-surface" value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} />
            </div>

            <div>
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 block">Target Metrics (NLP)</label>
              <textarea
                className="atlas-input h-[110px] py-2 bg-surface text-[12px] leading-relaxed resize-none"
                placeholder="Examples: Calculate total Scope 2 emissions, water consumption intensity per employee, waste diversion rate, and TRIR."
                value={templateForm.target_metrics_nlp}
                onChange={e => setTemplateForm({...templateForm, target_metrics_nlp: e.target.value})}
              />
              <p className="text-[11px] text-text-secondary mt-2">
                Keep this focused on business outcomes. The extraction prompt is auto-generated unless you override it in advanced settings.
              </p>
            </div>

            <details
              className="border border-border rounded-xl bg-surface"
              onToggle={(event) => {
                const details = event.currentTarget as HTMLDetailsElement;
                setShowAdvancedPrompt(details.open);
              }}
            >
              <summary
                className="cursor-pointer list-none px-4 py-3 text-[12px] font-semibold text-atlas-700 flex items-center justify-between"
              >
                <span>Advanced: AI Extraction Prompt Override</span>
                <span className="material-symbols-outlined text-[16px]">{showAdvancedPrompt ? "expand_less" : "expand_more"}</span>
              </summary>
              <div className="px-4 pb-4">
                <p className="text-[11px] text-text-secondary mb-2">
                  Optional. Leave blank to let Atlas generate and maintain a compact prompt from schema + metric intent.
                </p>
                <textarea
                  className="atlas-input h-[120px] py-2 bg-surface font-mono text-[12px] leading-relaxed resize-none"
                  placeholder="Custom system prompt override (advanced teams only)"
                  value={templateForm.system_prompt}
                  onChange={e => setTemplateForm({...templateForm, system_prompt: e.target.value})}
                />
              </div>
            </details>

            <div className="border border-border rounded-xl bg-surface p-3">
              <p className="text-[11px] text-text-secondary">
                Tip: For broad ESG coverage, keep schema minimal and stable (`value`, `unit`, `period_start`, `period_end`, context fields), then derive complex KPIs in the metric layer.
              </p>
            </div>

            <div className="border border-border rounded-xl bg-surface p-5 shadow-sm">
              <div className="flex justify-between items-start mb-5">
                <div>
                  <label className="text-[13px] font-bold text-text-primary tracking-wide block">Extraction Schema Definition</label>
                  <p className="text-[11px] text-text-secondary mt-0.5">Define the JSON keys the AI should look for in documents.</p>
                </div>
                <Button variant="ghost" className="px-3 py-1.5 text-[11px] bg-atlas-50 text-atlas-700 hover:bg-atlas-100 border border-atlas-200 font-bold" onClick={() => setSchemaFields([...schemaFields, {key: "", type: "string"}])}>
                  <span className="material-symbols-outlined text-[16px] mr-1">add_circle</span> Add New Field
                </Button>
              </div>

              <div className="hidden md:grid grid-cols-[1fr,140px] gap-4 px-4 mb-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Field Identifier (JSON Key)</span>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Data Type</span>
              </div>

              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1 pb-2">
                {schemaFields.map((field, idx) => (
                  <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr,140px] gap-3 items-center bg-surface-secondary p-2.5 rounded-xl border border-border group relative transition-all hover:bg-white hover:shadow-sm">
                     <button className="absolute -left-2 -top-2 w-[24px] h-[24px] bg-white border border-danger/20 text-danger hover:bg-danger hover:text-white transition-all rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-md z-10" onClick={() => setSchemaFields(schemaFields.filter((_, i) => i !== idx))}>
                        <span className="material-symbols-outlined text-[14px] font-bold">close</span>
                     </button>
                     <div className="relative flex-1">
                       <input 
                         type="text" 
                         className="w-full bg-white border border-border rounded-lg outline-none focus:ring-2 focus:ring-atlas-500/20 focus:border-atlas-500 transition-all px-4 py-2.5 font-mono text-[13px] font-semibold text-slate-900 placeholder:text-slate-300 shadow-sm" 
                         placeholder="e.g. total_kwh_consumption" 
                         value={field.key} 
                         onChange={e => {
                           const newFields = [...schemaFields];
                           newFields[idx].key = e.target.value;
                           setSchemaFields(newFields);
                         }} 
                       />
                     </div>
                     <select 
                       className="bg-white border border-border rounded-lg outline-none focus:ring-2 focus:ring-atlas-500/20 focus:border-atlas-500 transition-all px-3 py-2.5 w-full md:w-[140px] text-[13px] cursor-pointer font-bold text-slate-700 shadow-sm appearance-none text-center" 
                       value={field.type} 
                       onChange={e => {
                         const newFields = [...schemaFields];
                         newFields[idx].type = normalizeFieldType(e.target.value);
                         setSchemaFields(newFields);
                       }}
                     >
                        {FIELD_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                     </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-border rounded-xl bg-surface p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <label className="text-[13px] font-bold text-text-primary tracking-wide block">Template Pre-run</label>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Validate extraction + metric candidates directly from this template editor using a sample document.
                  </p>
                </div>
                <Button onClick={handleTemplatePreRun} disabled={preRunLoading || (!preRunFile && !preRunDocId)}>
                  {preRunLoading ? "Running..." : "Run Pre-run"}
                </Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">Sample Document</label>
                  <input
                    type="file"
                    className="atlas-input py-2"
                    onChange={(e) => {
                      setPreRunFile(e.target.files?.[0] || null);
                      setPreRunDocId(null);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">Feedback NLP (Optional)</label>
                  <textarea
                    className="atlas-input h-[72px] py-2 resize-none"
                    placeholder="Example: treat gross amount as finance context only; prioritize primary consumption value."
                    value={preRunFeedback}
                    onChange={(e) => setPreRunFeedback(e.target.value)}
                  />
                </div>
              </div>
              {preRunResult && (
                <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="p-2 bg-surface-secondary rounded border border-border lg:col-span-2">
                    {(() => {
                      const readiness = fieldReadiness(preRunResult);
                      const summary = preRunResult.readiness_summary || {};
                      const displayStatus = summary.status || readiness.readiness;
                      const displayHeadline =
                        summary.headline ||
                        (displayStatus === "ready" ? "Ready to Use" : displayStatus === "review" ? "Needs Quick Review" : "Blocked");
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[12px] font-semibold text-text-primary">{displayHeadline}</p>
                              <p className="text-[11px] text-text-secondary">
                                Confidence {Math.round((preRunResult.confidence_score || 0) * 100)}% •
                                Fields filled {readiness.filled}/{readiness.total} •
                                Metrics OK {summary.ok_metric_count ?? (preRunResult.projected_metrics || []).filter((m) => m.status === "OK").length}
                              </p>
                            </div>
                            <Badge variant={displayStatus === "ready" ? "blue" : displayStatus === "review" ? "amber" : "gray"}>
                              {String(displayStatus).toUpperCase()}
                            </Badge>
                          </div>
                          {(summary.blockers || []).length > 0 && (
                            <div className="p-2 rounded bg-white border border-border">
                              <p className="text-[11px] font-semibold text-text-secondary mb-1">What to fix</p>
                              <ul className="text-[11px] text-danger list-disc pl-4">
                                {(summary.blockers || []).slice(0, 3).map((item) => (
                                  <li key={item}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {(summary.suggestions || []).length > 0 && (
                            <div className="p-2 rounded bg-white border border-border">
                              <p className="text-[11px] font-semibold text-text-secondary mb-1">Suggested next step</p>
                              <p className="text-[11px] text-text-primary mb-2">
                                {(summary.suggestions || [])[0]}
                              </p>
                              <Button
                                className="text-[11px] px-3 py-1.5"
                                onClick={applyGuidanceAndRerun}
                                disabled={preRunLoading}
                              >
                                {preRunLoading ? "Re-running..." : "Apply guidance and re-run"}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="p-2 bg-surface-secondary rounded border border-border">
                    <p className="text-[11px] font-semibold text-text-secondary mb-1">Extracted Fields</p>
                    <div className="max-h-[220px] overflow-auto space-y-1">
                      {schemaFields.map((field) => {
                        const value = preRunResult.payload?.[field.key];
                        const missing = value === null || value === undefined || value === "";
                        return (
                          <div key={field.key} className="flex items-center justify-between text-[11px]">
                            <span className="font-mono">{field.key}</span>
                            <span className={missing ? "text-danger" : "text-success"}>
                              {missing ? "Missing" : "Present"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[10px] text-atlas-700">Debug JSON</summary>
                      <pre className="text-[10px] max-h-[120px] overflow-auto whitespace-pre-wrap mt-1">
                        {JSON.stringify(preRunResult.payload || {}, null, 2)}
                      </pre>
                    </details>
                  </div>
                  <div className="p-2 bg-surface-secondary rounded border border-border">
                    <p className="text-[11px] font-semibold text-text-secondary mb-1">Projected Metrics</p>
                    <div className="max-h-[220px] overflow-auto space-y-1">
                      {(preRunResult.projected_metrics || []).map((metric) => (
                        <div key={`${metric.metric_key}-${metric.unit}`} className="p-1 rounded bg-white border border-border text-[11px]">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{metric.metric_key}</span>
                            <span className={metric.status === "OK" ? "text-success" : "text-warning"}>{metric.status}</span>
                          </div>
                          <div className="text-text-secondary">
                            {metric.value ?? "n/a"} {metric.unit}
                          </div>
                          {metric.error_detail ? <div className="text-danger text-[10px]">{metric.error_detail}</div> : null}
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] font-semibold text-text-secondary mt-2 mb-1">Recommended Targets</p>
                    <div className="flex flex-wrap gap-1">
                      {(preRunResult.metric_recommendation?.metric_targets || []).map((target) => (
                        <span key={target} className="text-[10px] px-2 py-0.5 bg-white border border-border rounded">{target}</span>
                      ))}
                    </div>
                  </div>
                  {preRunPrevResult && (
                    <div className="lg:col-span-2 p-2 bg-surface-secondary rounded border border-border">
                      <p className="text-[11px] font-semibold text-text-secondary mb-1">Changes Since Previous Pre-run</p>
                      <div className="max-h-[100px] overflow-auto text-[10px]">
                        {computePreRunDiff(preRunPrevResult.payload, preRunResult.payload).length === 0 ? (
                          <p className="text-text-muted">No changes detected.</p>
                        ) : (
                          computePreRunDiff(preRunPrevResult.payload, preRunResult.payload).map((line) => (
                            <p key={line}>{line}</p>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex justify-end gap-3">
             <Button variant="ghost" onClick={() => { setShowEditor(false); setEditingId(null); }}>Cancel</Button>
             <Button onClick={handleCreate}>{editingId ? "Update Template" : "Save Template Library"}</Button>
          </div>
        </Card>
      )}

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(t => (
          <Card key={t.id} variant="interactive" onClick={() => handleEdit(t)}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-surface-secondary border border-border flex items-center justify-center">
                <span className="material-symbols-outlined text-atlas-600 text-[20px]">account_tree</span>
              </div>
              <Badge variant={t.workspace_id ? "amber" : "blue"}>
                {t.workspace_id ? "WORKSPACE" : "GLOBAL"}
              </Badge>
            </div>
            
            <h3 className="text-[16px] font-bold text-text-primary mb-1 line-clamp-1" title={t.name}>{t.name}</h3>
            <p className="text-[11px] font-mono text-text-muted mb-3">{t.id}</p>
            <p className="text-[12px] text-text-secondary line-clamp-2 mb-4 h-9">
              {t.target_metrics_nlp || "No metric intent provided yet."}
            </p>
            
            <div className="pt-3 border-t border-border flex items-center justify-between mt-auto">
               <div className="flex gap-1.5 flex-wrap flex-1 max-h-6 overflow-hidden">
                 <span className="text-[10px] font-bold uppercase text-text-muted mr-1 mt-0.5">Fields:</span>
                 {Object.keys(t.schema_definition).slice(0,3).map(k => (
                   <span key={k} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[80px]">{k}</span>
                 ))}
               </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
