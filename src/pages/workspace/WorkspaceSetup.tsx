import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { InlineAlert } from "../../components/ui/InlineAlert";
import { Stepper } from "../../components/ui/Stepper";
import { apiClient } from "../../lib/api-client";
import { copy } from "../../lib/copy";

const FRAMEWORK_OPTIONS = [
  { value: "csrd", label: "CSRD / ESRS" },
  { value: "gri", label: "GRI Standards" },
  { value: "tcfd", label: "TCFD" },
  { value: "integrated", label: "Integrated (CSRD + GRI + TCFD)" },
];

const MATERIAL_TOPICS = [
  "Climate & energy",
  "Water & biodiversity",
  "Workforce & safety",
  "Governance & ethics",
  "Supply chain",
];

export function WorkspaceSetup() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [reportingYear, setReportingYear] = useState(String(new Date().getFullYear()));
  const [framework, setFramework] = useState("csrd");
  const [dueDate, setDueDate] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    { id: "s1", label: "Name & year", status: step > 0 ? "complete" : step === 0 ? "current" : "upcoming" },
    { id: "s2", label: "Framework", status: step > 1 ? "complete" : step === 1 ? "current" : "upcoming" },
    { id: "s3", label: "Due date", status: step > 2 ? "complete" : step === 2 ? "current" : "upcoming" },
    { id: "s4", label: "Topics", status: step === 3 ? "current" : "upcoming" },
  ] as const;

  const toggleTopic = (topic: string) => {
    setTopics((cur) => (cur.includes(topic) ? cur.filter((t) => t !== topic) : [...cur, topic]));
  };

  const handleSubmit = async () => {
    if (!name) return;
    setLoading(true);
    setError(null);
    const description = [
      `Framework: ${framework}`,
      `Reporting year: ${reportingYear}`,
      dueDate && `Due: ${dueDate}`,
      topics.length > 0 && `Material topics: ${topics.join(", ")}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const created: any = await apiClient(`/companies/${companyId}/workspaces`, {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          reporting_year: parseInt(reportingYear, 10) || undefined,
          region: "EU",
          scope2_method: "location_based",
          require_extraction_review: true,
          require_metric_approval: true,
          require_publish_approval: true,
        }),
      });
      navigate(created?.id ? `/w/${created.id}` : `/c/${companyId}`);
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
        <h1 className="atlas-page-title text-atlas-600">{copy.org.createPeriod}</h1>
        <p className="atlas-page-subtitle">Four quick steps to set up your reporting period.</p>
      </header>

      {error && <InlineAlert variant="danger">{error}</InlineAlert>}

      <Card className="p-6">
        <div className="mb-8">
          <Stepper steps={[...steps]} />
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Period name</label>
              <input
                type="text"
                required
                className="atlas-input"
                placeholder="e.g. FY 2025 Sustainability Report"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Reporting year</label>
              <input
                type="number"
                className="atlas-input"
                value={reportingYear}
                onChange={(e) => setReportingYear(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-[13px] text-text-secondary">Which framework will you report against?</p>
            {FRAMEWORK_OPTIONS.map((f) => (
              <label
                key={f.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                  framework === f.value ? "border-atlas-500 bg-atlas-50" : "border-border"
                }`}
              >
                <input type="radio" name="framework" checked={framework === f.value} onChange={() => setFramework(f.value)} />
                <span className="text-[13px] font-medium">{f.label}</span>
              </label>
            ))}
          </div>
        )}

        {step === 2 && (
          <div>
            <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">Target due date</label>
            <input type="date" className="atlas-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <p className="text-[11px] text-text-muted mt-1">Shown on your period hub to track schedule.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-[13px] text-text-secondary">Select material topics for this period (optional).</p>
            <div className="flex flex-wrap gap-2">
              {MATERIAL_TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition-colors ${
                    topics.includes(topic)
                      ? "bg-atlas-600 text-white border-atlas-600"
                      : "bg-surface border-border text-text-secondary hover:border-atlas-400"
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-6 mt-6 border-t border-border flex justify-between">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
          {step < 3 ? (
            <Button disabled={step === 0 && !name} onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button disabled={loading || !name} onClick={() => void handleSubmit()}>
              {loading ? "Creating…" : copy.org.createPeriod}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
