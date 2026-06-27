import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { InlineAlert } from "../../components/ui/InlineAlert";
import { apiClient } from "../../lib/api-client";

const NACE_SECTORS = [
  { code: "A", label: "Agriculture, Forestry & Fishing" },
  { code: "B", label: "Mining & Quarrying" },
  { code: "C", label: "Manufacturing" },
  { code: "D", label: "Electricity, Gas & Steam" },
  { code: "E", label: "Water Supply, Sewerage & Waste" },
  { code: "F", label: "Construction" },
  { code: "G", label: "Wholesale & Retail Trade" },
  { code: "H", label: "Transport & Storage" },
  { code: "I", label: "Accommodation & Food Service" },
  { code: "J", label: "Information & Communication" },
  { code: "K", label: "Financial & Insurance" },
  { code: "L", label: "Real Estate" },
  { code: "M", label: "Professional, Scientific & Technical" },
  { code: "N", label: "Administrative & Support" },
  { code: "Q", label: "Human Health & Social Work" },
  { code: "OTHER", label: "Other" },
];

const EMPLOYEE_RANGES = [
  { value: "50-249", label: "50 – 249" },
  { value: "250-499", label: "250 – 499" },
  { value: "500-1999", label: "500 – 1,999" },
  { value: "2000+", label: "2,000+" },
];

const TURNOVER_RANGES = [
  { value: "<40M", label: "Under €40M" },
  { value: "40M-150M", label: "€40M – €150M" },
  { value: "150M-1B", label: "€150M – €1B" },
  { value: "1B+", label: "Over €1B" },
];

interface WorkspaceOut {
  id: string;
  name: string;
  reporting_year: number | null;
  nace_sector: string | null;
  employee_count_range: string | null;
  turnover_range_eur: string | null;
  is_listed: boolean;
  is_first_time_reporter: boolean;
  scope2_method: string;
  region: string;
}

export function WorkspaceProfilePage() {
  const { companyId, workspaceId } = useParams<{ companyId: string; workspaceId: string }>();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState<WorkspaceOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Form state
  const [naceSector, setNaceSector] = useState("");
  const [employeeRange, setEmployeeRange] = useState("");
  const [turnoverRange, setTurnoverRange] = useState("");
  const [isListed, setIsListed] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [reportingYear, setReportingYear] = useState("");
  const [scope2Method, setScope2Method] = useState("location_based");
  const [region, setRegion] = useState("EU");

  useEffect(() => {
    if (!companyId || !workspaceId) return;
    setLoading(true);
    apiClient<WorkspaceOut[]>(`/companies/${companyId}/workspaces`)
      .then((list) => {
        const ws = list.find((w) => w.id === workspaceId);
        if (!ws) { setError("Reporting period not found."); return; }
        setWorkspace(ws);
        setNaceSector(ws.nace_sector || "");
        setEmployeeRange(ws.employee_count_range || "");
        setTurnoverRange(ws.turnover_range_eur || "");
        setIsListed(ws.is_listed ?? false);
        setIsFirstTime(ws.is_first_time_reporter ?? true);
        setReportingYear(ws.reporting_year ? String(ws.reporting_year) : "");
        setScope2Method(ws.scope2_method || "location_based");
        setRegion(ws.region || "EU");
      })
      .catch((err) => setError(err.message || "Failed to load profile."))
      .finally(() => setLoading(false));
  }, [companyId, workspaceId]);

  const handleSave = async () => {
    if (!companyId || !workspaceId) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await apiClient(`/companies/${companyId}/workspaces/${workspaceId}/profile`, {
        method: "PATCH",
        body: JSON.stringify({
          nace_sector: naceSector || null,
          employee_count_range: employeeRange || null,
          turnover_range_eur: turnoverRange || null,
          is_listed: isListed,
          is_first_time_reporter: isFirstTime,
          reporting_year: reportingYear ? parseInt(reportingYear, 10) : null,
          scope2_method: scope2Method,
          region,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted text-[13px]">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Loading profile…
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-atlas-in">
      <header className="mb-2">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 px-2 -ml-2 text-text-secondary">
          <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span> Back
        </Button>
        <h1 className="atlas-page-title text-atlas-600">Company Profile</h1>
        <p className="atlas-page-subtitle">
          {workspace?.name ? `Profile settings for "${workspace.name}".` : ""}
          {" "}Your profile determines which ESRS disclosures are required and how your compliance map is generated.
        </p>
      </header>

      {error && <InlineAlert variant="danger" onDismiss={() => setError(null)}>{error}</InlineAlert>}
      {saved && (
        <InlineAlert variant="success">
          Profile saved. Your compliance map will update automatically.
        </InlineAlert>
      )}

      <Card className="p-6 space-y-6">
        {/* Reporting year */}
        <div>
          <label className="atlas-label">Reporting year</label>
          <input
            type="number"
            className="atlas-input w-40"
            placeholder={String(new Date().getFullYear())}
            value={reportingYear}
            onChange={(e) => setReportingYear(e.target.value)}
          />
        </div>

        {/* NACE sector */}
        <div>
          <label className="atlas-label">Industry sector (NACE)</label>
          <p className="text-[11px] text-text-muted mb-2">Used to determine your material topics and applicable ESRS standards.</p>
          <select
            className="atlas-input"
            value={naceSector}
            onChange={(e) => setNaceSector(e.target.value)}
          >
            <option value="">Select your sector…</option>
            {NACE_SECTORS.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Employees */}
        <div>
          <label className="atlas-label">Number of employees</label>
          <p className="text-[11px] text-text-muted mb-2">Determines CSRD applicability threshold.</p>
          <div className="grid grid-cols-2 gap-2">
            {EMPLOYEE_RANGES.map((r) => (
              <label
                key={r.value}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors text-[13px] font-medium ${
                  employeeRange === r.value
                    ? "border-atlas-500 bg-atlas-50 text-atlas-700"
                    : "border-border hover:border-atlas-300 text-text-secondary"
                }`}
              >
                <input
                  type="radio"
                  name="employees"
                  checked={employeeRange === r.value}
                  onChange={() => setEmployeeRange(r.value)}
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>

        {/* Turnover */}
        <div>
          <label className="atlas-label">Annual turnover (EUR)</label>
          <p className="text-[11px] text-text-muted mb-2">Used with employee count to determine reporting obligation level.</p>
          <div className="grid grid-cols-2 gap-2">
            {TURNOVER_RANGES.map((r) => (
              <label
                key={r.value}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors text-[13px] font-medium ${
                  turnoverRange === r.value
                    ? "border-atlas-500 bg-atlas-50 text-atlas-700"
                    : "border-border hover:border-atlas-300 text-text-secondary"
                }`}
              >
                <input
                  type="radio"
                  name="turnover"
                  checked={turnoverRange === r.value}
                  onChange={() => setTurnoverRange(r.value)}
                />
                {r.label}
              </label>
            ))}
          </div>
        </div>

        {/* Flags */}
        <div className="flex flex-wrap gap-6 pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isListed}
              onChange={(e) => setIsListed(e.target.checked)}
              className="w-4 h-4 accent-atlas-600"
            />
            <span className="text-[13px] text-text-primary">Listed on a regulated exchange</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFirstTime}
              onChange={(e) => setIsFirstTime(e.target.checked)}
              className="w-4 h-4 accent-atlas-600"
            />
            <span className="text-[13px] text-text-primary">First-time CSRD reporter</span>
          </label>
        </div>

        {/* Advanced */}
        <div className="border-t border-border pt-5 space-y-4">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide">Advanced settings</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="atlas-label">Region</label>
              <select
                className="atlas-input"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
              >
                <option value="EU">EU (European Union)</option>
                <option value="UK">UK</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="atlas-label">Scope 2 method</label>
              <select
                className="atlas-input"
                value={scope2Method}
                onChange={(e) => setScope2Method(e.target.value)}
              >
                <option value="location_based">Location-based</option>
                <option value="market_based">Market-based</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border flex justify-end gap-3">
          <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                Saving…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">save</span>
                Save profile
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
