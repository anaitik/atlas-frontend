import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { Button } from "../../components/ui/Button";
import { InlineAlert } from "../../components/ui/InlineAlert";

// Field definitions are config-driven (backend: company_profile.fields).
type FieldDef = {
  key: string;
  label: string;
  type: "text" | "select" | "boolean";
  required?: boolean;
  help?: string;
  options?: { value: string; label: string }[];
};
type Section = { id: string; label: string; fields: FieldDef[] };
type ProfileResponse = {
  company_id: string;
  sections: Section[];
  profile_data: Record<string, unknown>;
  profile_complete: boolean;
  missing_required: string[];
};

function sectionComplete(section: Section, data: Record<string, unknown>) {
  return section.fields
    .filter((f) => f.required)
    .every((f) => {
      const v = data[f.key];
      return v !== undefined && v !== null && String(v).trim() !== "";
    });
}

export function CompanyProfile() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [sections, setSections] = useState<Section[]>([]);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [activeTab, setActiveTab] = useState(0);
  const [complete, setComplete] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    apiClient<ProfileResponse>(`/companies/${companyId}/profile`)
      .then((p) => {
        setSections(p.sections || []);
        setData(p.profile_data || {});
        setComplete(p.profile_complete);
        setMissing(p.missing_required || []);
      })
      .catch((e) => setError(e?.message || "Could not load company information."))
      .finally(() => setLoading(false));
  }, [companyId]);

  const setField = (key: string, value: unknown) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    if (!companyId) return;
    setSaving(true);
    setError(null);
    try {
      const p = await apiClient<ProfileResponse>(`/companies/${companyId}/profile`, {
        method: "PUT",
        body: JSON.stringify({ profile_data: data }),
      });
      setComplete(p.profile_complete);
      setMissing(p.missing_required || []);
      setData(p.profile_data || {});
      setSaved(true);
    } catch (e: any) {
      setError(e?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <span className="material-symbols-outlined text-[32px] text-atlas-400 animate-spin">progress_activity</span>
      </div>
    );
  }

  const allRequired = sections.flatMap((s) => s.fields.filter((f) => f.required));
  const filledRequired = allRequired.filter((f) => {
    const v = data[f.key];
    return v !== undefined && v !== null && String(v).trim() !== "";
  }).length;
  const pct = allRequired.length ? Math.round((filledRequired / allRequired.length) * 100) : 100;

  return (
    <div className="space-y-6 animate-atlas-in max-w-3xl mx-auto">
      <div>
        <Button variant="ghost" onClick={() => navigate(`/c/${companyId}`)} className="mb-3 px-2 -ml-2 text-text-secondary">
          <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span> Back
        </Button>
        <h1 className="text-[22px] font-extrabold text-text-primary tracking-tight">Company information</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          We tailor your ESG interview to this profile. Required fields must be complete before you create a reporting period.
        </p>
      </div>

      {/* Progress + status */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-semibold text-gray-600">Required information</span>
            <span className="text-[12px] font-bold text-gray-700">{filledRequired}/{allRequired.length}</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${complete ? "bg-emerald-500" : "bg-atlas-500"}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
        {complete ? (
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 shrink-0">
            <span className="material-symbols-outlined text-[15px]">check_circle</span> Complete
          </span>
        ) : (
          <span className="text-[12px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5 shrink-0">
            {allRequired.length - filledRequired} required left
          </span>
        )}
      </div>

      {error && <InlineAlert variant="danger">{error}</InlineAlert>}

      {/* Tabs */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {sections.map((s, i) => {
            const done = sectionComplete(s, data);
            return (
              <button
                key={s.id}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-1.5 px-5 py-3.5 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === i ? "border-atlas-500 text-atlas-700" : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                {done && <span className="material-symbols-outlined text-[15px] text-emerald-500">check_circle</span>}
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="p-6 space-y-5">
          {sections[activeTab]?.fields.map((f) => (
            <div key={f.key}>
              <label className="block text-[12px] font-semibold text-gray-700 mb-1.5">
                {f.label} {f.required && <span className="text-red-400">*</span>}
              </label>
              {f.type === "select" ? (
                <select
                  value={(data[f.key] as string) ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 focus:border-atlas-400 focus:ring-1 focus:ring-atlas-300 outline-none bg-white"
                >
                  <option value="">Select…</option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : f.type === "boolean" ? (
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(data[f.key])}
                    onChange={(e) => setField(f.key, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-atlas-600 focus:ring-atlas-400"
                  />
                  <span className="text-[13px] text-gray-600">Yes</span>
                </label>
              ) : (
                <input
                  type="text"
                  value={(data[f.key] as string) ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 focus:border-atlas-400 focus:ring-1 focus:ring-atlas-300 outline-none"
                />
              )}
              {f.help && <p className="text-[11px] text-gray-400 mt-1">{f.help}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          {activeTab > 0 && (
            <Button variant="ghost" onClick={() => setActiveTab((t) => t - 1)}>Previous</Button>
          )}
          {activeTab < sections.length - 1 && (
            <Button variant="ghost" onClick={() => setActiveTab((t) => t + 1)}>Next</Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {saved && !error && <span className="text-[12px] font-semibold text-emerald-600">Saved</span>}
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          {complete && (
            <Button
              onClick={() => navigate(`/c/${companyId}/workspaces/new`)}
              className="bg-atlas-600 hover:bg-atlas-500 text-white"
            >
              Create reporting period
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Button>
          )}
        </div>
      </div>

      {!complete && missing.length > 0 && (
        <p className="text-[12px] text-amber-600 text-right">
          Complete all required fields to unlock reporting periods.
        </p>
      )}
    </div>
  );
}
