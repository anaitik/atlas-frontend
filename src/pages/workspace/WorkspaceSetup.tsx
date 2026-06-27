import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { InlineAlert } from "../../components/ui/InlineAlert";
import { Stepper } from "../../components/ui/Stepper";
import { apiClient } from "../../lib/api-client";

const FRAMEWORK_OPTIONS = [
  { value: "csrd", label: "CSRD / ESRS", hint: "EU mandatory — 50,000+ companies" },
  { value: "gri", label: "GRI Standards", hint: "Global voluntary & regulatory baseline" },
  { value: "tcfd", label: "TCFD", hint: "Climate-focused financial disclosures" },
  { value: "integrated", label: "Integrated (CSRD + GRI + TCFD)", hint: "Comprehensive multi-framework" },
];

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

export function WorkspaceSetup() {
  const { companyId } = useParams();
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState(0);

  // Step 0 — Name, year, framework
  const [name, setName] = useState("");
  const [reportingYear, setReportingYear] = useState(String(new Date().getFullYear()));
  const [framework, setFramework] = useState("csrd");

  // Step 1 — Company profile
  const [naceSector, setNaceSector] = useState("");
  const [employeeRange, setEmployeeRange] = useState("");
  const [turnoverRange, setTurnoverRange] = useState("");
  const [isListed, setIsListed] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Gate: redirect to company-info intake if mandatory fields aren't complete.
  useEffect(() => {
    if (!companyId) return;
    apiClient(`/companies/${companyId}`)
      .then((c: any) => {
        if (c && c.profile_complete === false) navigate(`/c/${companyId}/profile`, { replace: true });
      })
      .catch(() => {});
  }, [companyId, navigate]);

  const STEPS = [
    { id: "s1", label: "Basics", status: step > 0 ? "complete" : step === 0 ? "current" : "upcoming" },
    { id: "s2", label: "Profile", status: step > 1 ? "complete" : step === 1 ? "current" : "upcoming" },
    { id: "s3", label: "Create", status: step === 2 ? "current" : "upcoming" },
  ] as const;

  const step0Valid = name.trim().length > 0;
  const step1Valid = naceSector !== "" && employeeRange !== "" && turnoverRange !== "";

  const handleCreate = async () => {
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      const created: any = await apiClient(`/companies/${companyId}/workspaces`, {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          reporting_year: parseInt(reportingYear, 10) || undefined,
          region: "EU",
          scope2_method: "location_based",
          require_extraction_review: true,
          require_metric_approval: true,
          require_publish_approval: true,
          output_format: framework,
          // Profile
          nace_sector: naceSector || null,
          employee_count_range: employeeRange || null,
          turnover_range_eur: turnoverRange || null,
          is_listed: isListed,
          is_first_time_reporter: isFirstTime,
        }),
      });
      navigate(created?.id ? `/w/${created.id}/collect` : `/c/${companyId}`);
    } catch (err: any) {
      setError(err?.message || "Could not create reporting period. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <header className="mb-4">
        <Button variant="ghost" onClick={() => navigate(`/c/${companyId}`)} className="mb-4 px-2 -ml-2 text-text-secondary">
          <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span> Back
        </Button>
        <h1 className="atlas-page-title text-atlas-600">New Reporting Period</h1>
        <p className="atlas-page-subtitle">Set up your workspace in 3 steps — your compliance map is generated automatically.</p>
      </header>

      {error && <InlineAlert variant="danger">{error}</InlineAlert>}

      <Card className="p-6">
        <div className="mb-8">
          <Stepper steps={[...STEPS]} />
        </div>

        {/* Step 0 — Basics */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="atlas-label">Period name</label>
              <input
                type="text"
                className="atlas-input"
                placeholder="e.g. FY 2025 Sustainability Report"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="atlas-label">Reporting year</label>
              <input
                type="number"
                className="atlas-input w-40"
                value={reportingYear}
                onChange={(e) => setReportingYear(e.target.value)}
              />
            </div>
            <div>
              <label className="atlas-label">Reporting framework</label>
              <div className="space-y-2 mt-1">
                {FRAMEWORK_OPTIONS.map((f) => (
                  <label
                    key={f.value}
                    className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                      framework === f.value
                        ? "border-atlas-500 bg-atlas-50"
                        : "border-border hover:border-atlas-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="framework"
                      checked={framework === f.value}
                      onChange={() => setFramework(f.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-[13px] font-semibold text-text-primary">{f.label}</span>
                      <p className="text-[11px] text-text-muted mt-0.5">{f.hint}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1 — Company Profile */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="p-3 bg-atlas-50 rounded-lg border border-atlas-200 text-[12px] text-atlas-700">
              <span className="material-symbols-outlined text-[14px] mr-1 align-middle">info</span>
              Your profile determines which ESRS disclosures are required for your company. Takes 1 minute.
            </div>

            <div>
              <label className="atlas-label">Industry sector (NACE)</label>
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

            <div>
              <label className="atlas-label">Number of employees</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
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

            <div>
              <label className="atlas-label">Annual turnover (EUR)</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
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

            <div className="flex gap-6">
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
          </div>
        )}

        {/* Step 2 — Review & Create */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="text-[15px] font-bold text-text-primary">Ready to create</h3>
            <div className="bg-surface-secondary rounded-xl border border-border divide-y divide-border-light text-[13px]">
              <div className="flex justify-between px-4 py-3">
                <span className="text-text-muted font-medium">Period name</span>
                <span className="font-semibold text-text-primary">{name}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-text-muted font-medium">Reporting year</span>
                <span className="font-semibold text-text-primary">{reportingYear}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-text-muted font-medium">Framework</span>
                <span className="font-semibold text-text-primary">
                  {FRAMEWORK_OPTIONS.find((f) => f.value === framework)?.label}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-text-muted font-medium">Sector</span>
                <span className="font-semibold text-text-primary">
                  {NACE_SECTORS.find((s) => s.code === naceSector)?.label || "—"}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-text-muted font-medium">Employees</span>
                <span className="font-semibold text-text-primary">{employeeRange || "—"}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-text-muted font-medium">Annual turnover</span>
                <span className="font-semibold text-text-primary">{turnoverRange || "—"}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-text-muted font-medium">Listed / First-time</span>
                <span className="font-semibold text-text-primary">
                  {isListed ? "Listed" : "Non-listed"} · {isFirstTime ? "First-time reporter" : "Prior reporter"}
                </span>
              </div>
            </div>
            <p className="text-[12px] text-text-muted">
              Atlas will generate your personalised compliance map immediately after creation.
            </p>
          </div>
        )}

        <div className="pt-6 mt-6 border-t border-border flex justify-between items-center">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back
          </Button>
          {step < 2 ? (
            <Button
              disabled={(step === 0 && !step0Valid) || (step === 1 && !step1Valid)}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Button>
          ) : (
            <Button disabled={loading || !name} onClick={() => void handleCreate()}>
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                  Creating…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                  Create reporting period
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
