import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { BlockchainBadge } from "../../components/ui/BlockchainBadge";
// ── Types ────────────────────────────────────────────────────────────────────
interface Question {
  id: string;
  pillar: string;
  category: string;
  text: string;
  hint: string;
}

interface ReportSection {
  pillar: string;
  title: string;
  content: string;
  data_caveats: string[];
  framework_tags: string[];
  model_used: string;
  generated_at: string;
}

interface Report {
  id: string;
  reporting_year: number;
  version: number;
  output_format: string;
  status: string;
  exec_summary: string;
  sections: Record<string, ReportSection>;
  data_lineage: any[];
  interview_answers: any[];
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  published_at?: string;
  sha256_hash?: string | null;
  blockchain_tx_id?: string | null;
}

// ── Constants ────────────────────────────────────────────────────────────────
const PILLAR_META: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  environmental: { label: "Environmental", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", icon: "eco" },
  social:        { label: "Social",         color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", icon: "group" },
  governance:    { label: "Governance",     color: "#9333ea", bg: "#fdf4ff", border: "#e9d5ff", icon: "account_balance" },
  strategy:      { label: "Strategy",       color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", icon: "trending_up" },
  materiality:   { label: "Materiality",    color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", icon: "balance" },
};

const FRAMEWORKS = [
  { value: "csrd",       label: "CSRD / ESRS",   desc: "Corporate Sustainability Reporting Directive" },
  { value: "gri",        label: "GRI Standards",  desc: "Global Reporting Initiative 2021" },
  { value: "tcfd",       label: "TCFD",           desc: "Task Force on Climate-related Financial Disclosures" },
  { value: "integrated", label: "Integrated",     desc: "CSRD + GRI + TCFD combined" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; step: number }> = {
  draft:     { label: "Draft",     color: "#d97706", bg: "#fffbeb", border: "#fde68a", step: 1 },
  review:    { label: "In Review", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", step: 2 },
  approved:  { label: "Approved",  color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", step: 3 },
  rejected:  { label: "Rejected",  color: "#dc2626", bg: "#fef2f2", border: "#fecaca", step: 0 },
  published: { label: "Published", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", step: 4 },
};

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear, currentYear - 1, currentYear - 2];

// ── Helper Components ────────────────────────────────────────────────────────
function PillarBadge({ pillar }: { pillar: string }) {
  const m = PILLAR_META[pillar] || { label: pillar, color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", icon: "label" };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      padding: "2px 8px", borderRadius: 4, textTransform: "uppercase",
    }}>
      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>{m.icon}</span>
      {m.label}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" };
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
      padding: "3px 10px", borderRadius: 20, textTransform: "uppercase",
    }}>
      {cfg.label}
    </span>
  );
}

function FrameworkTag({ tag }: { tag: string }) {
  return (
    <span style={{
      display: "inline-block", background: "#f8fafc", color: "#475569",
      border: "1px solid #e2e8f0", fontSize: 10, fontWeight: 600,
      padding: "2px 6px", borderRadius: 4, letterSpacing: "0.04em",
    }}>
      {tag}
    </span>
  );
}

function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return null;
  const paragraphs = text.split(/\n\n+/);
  return (
    <>
      {paragraphs.map((p, i) => {
        const cleanText = p.replace(/^#+\s+/g, "");
        const parts = cleanText.split(/(\*\*.*?\*\*|\*.*?\*)/g);
        
        return (
          <p key={i} style={{ marginBottom: 14, whiteSpace: "pre-wrap" }}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} style={{ color: "#0f2d17" }}>{part.slice(2, -2)}</strong>;
              }
              if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={j}>{part.slice(1, -1)}</em>;
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </>
  );
}

// ── Workflow Status Bar ───────────────────────────────────────────────────────
function WorkflowBar({ status }: { status: string }) {
  const steps = [
    { key: "draft", label: "Draft", icon: "edit_note" },
    { key: "review", label: "In Review", icon: "rate_review" },
    { key: "approved", label: "Approved", icon: "verified" },
    { key: "published", label: "Published", icon: "public" },
  ];
  const currentStep = STATUS_CONFIG[status]?.step ?? 0;
  const isRejected = status === "rejected";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {steps.map((step, idx) => {
        const done = currentStep > idx + 1;
        const active = currentStep === idx + 1;
        const rejected = isRejected && idx === 1;
        const color = rejected ? "#dc2626" : (done || active) ? "#16a34a" : "#cbd5e1";
        return (
          <div key={step.key} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: (done || active) ? (rejected ? "#fef2f2" : "#f0fdf4") : "#f8fafc",
                border: `2px solid ${color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color }}>
                  {rejected ? "cancel" : (done ? "check" : step.icon)}
                </span>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {rejected && idx === 1 ? "Rejected" : step.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div style={{ width: 40, height: 2, background: done ? "#16a34a" : "#e2e8f0", margin: "0 4px", marginBottom: 14 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Question Card ────────────────────────────────────────────────────────────
function QuestionCard({
  q, answer, onChange, disabled
}: { q: Question; answer: string; onChange: (v: string) => void; disabled: boolean }) {
  const m = PILLAR_META[q.pillar] || PILLAR_META.governance;
  const hasAnswer = answer.trim().length > 0;
  return (
    <div style={{
      background: "white", border: `1px solid ${hasAnswer ? m.border : "#e2e8f0"}`,
      borderRadius: 10, padding: "14px 16px", transition: "all 0.2s",
      borderLeft: `3px solid ${hasAnswer ? m.color : "#e2e8f0"}`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <PillarBadge pillar={q.pillar} />
          {q.category && (
            <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", padding: "2px 8px", background: "#f8fafc", borderRadius: 4, border: "1px solid #e2e8f0" }}>
              {q.category}
            </span>
          )}
        </div>
        {hasAnswer && <span className="material-symbols-outlined" style={{ fontSize: 16, color: m.color }}>check_circle</span>}
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", lineHeight: 1.5, marginBottom: 6 }}>{q.text}</p>
      {q.hint && (
        <p style={{ fontSize: 10, color: "#94a3b8", marginBottom: 8, fontStyle: "italic" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 10, verticalAlign: "middle" }}>info</span>{" "}
          {q.hint}
        </p>
      )}
      <textarea
        disabled={disabled}
        value={answer}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add management commentary or evidence…"
        style={{
          width: "100%", minHeight: 72, resize: "vertical",
          background: "#f8fafc", border: `1px solid ${hasAnswer ? m.border : "#e2e8f0"}`,
          borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "#1e293b",
          fontFamily: "inherit", lineHeight: 1.5, outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => (e.target.style.borderColor = m.color)}
        onBlur={(e) => (e.target.style.borderColor = hasAnswer ? m.border : "#e2e8f0")}
      />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ReportStudio() {
  const { workspaceId } = useParams();

  const activeCompanyId = (() => {
    try { return JSON.parse(localStorage.getItem("atlas-workspace") || "{}").state?.activeCompanyId || null; }
    catch { return null; }
  })();

  // State
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [framework, setFramework] = useState<string>("csrd");
  const [reportingYear, setReportingYear] = useState<number>(currentYear);
  const [generating, setGenerating] = useState(false);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [regenPillar, setRegenPillar] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showLineage, setShowLineage] = useState(false);
  const [activePillarFilter, setActivePillarFilter] = useState<string>("all");
  const [reportVerifications, setReportVerifications] = useState<Record<string, any>>({});
  const docRef = useRef<HTMLDivElement>(null);

  const activeReport = selectedReportId
    ? reports.find((r) => r.id === selectedReportId) || reports[0]
    : reports[0];

  // ── Data Fetching ────────────────────────────────────────────────────────
  const fetchReports = async () => {
    if (!activeCompanyId) return;
    try {
      const res: any = await apiClient(`/reports?company_id=${activeCompanyId}&workspace_id=${workspaceId}`);
      const list: Report[] = res || [];
      setReports(list);
      if (list.length > 0 && !selectedReportId) setSelectedReportId(list[0].id);
    } catch { /* silent */ }
  };

  const fetchQuestions = async () => {
    try {
      const res: any = await apiClient(`/reports/questions`);
      setQuestions(res || []);
    } catch { /* silent */ }
  };

  const fetchReportVerification = async (reportId: string) => {
    try {
      const res: any = await apiClient(`/reports/${reportId}/verification`);
      setReportVerifications((prev) => ({ ...prev, [reportId]: res }));
    } catch { /* silent */ }
  };

  useEffect(() => { fetchQuestions(); fetchReports(); }, [workspaceId, activeCompanyId]);

  useEffect(() => {
    if (activeReport?.id && activeReport.sha256_hash && !reportVerifications[activeReport.id]) {
      fetchReportVerification(activeReport.id);
    }
  }, [activeReport?.id, activeReport?.sha256_hash]);

  // ── Progress Calculation ─────────────────────────────────────────────────
  const pillarGroups = questions.reduce((acc, q) => {
    if (!acc[q.pillar]) acc[q.pillar] = [];
    acc[q.pillar].push(q);
    return acc;
  }, {} as Record<string, Question[]>);

  const pillarCompletion = Object.entries(pillarGroups).map(([pillar, qs]) => {
    const answered = qs.filter((q) => answers[q.id]?.trim()).length;
    return { pillar, total: qs.length, answered, pct: Math.round((answered / qs.length) * 100) };
  });

  const totalAnswered = questions.filter((q) => answers[q.id]?.trim()).length;
  const overallPct = questions.length > 0 ? Math.round((totalAnswered / questions.length) * 100) : 0;

  const filteredQuestions = activePillarFilter === "all"
    ? questions
    : questions.filter((q) => q.pillar === activePillarFilter);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!activeCompanyId) { setError("Company context missing."); return; }
    setGenerating(true);
    setError("");
    try {
      const formattedAnswers = Object.entries(answers)
        .filter(([_, ans]) => ans.trim().length > 0)
        .map(([qId, ans]) => ({ question_id: qId, answer: ans }));

      await apiClient(`/reports/generate?company_id=${activeCompanyId}&workspace_id=${workspaceId}`, {
        method: "POST",
        body: JSON.stringify({
          output_format: framework,
          reporting_year: reportingYear,
          interview_answers: formattedAnswers,
        }),
      });
      await fetchReports();
    } catch (err: any) {
      setError(err.message || "Report generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenSection = async (pillar: string) => {
    if (!activeReport) return;
    setRegenPillar(pillar);
    setError("");
    try {
      const formattedAnswers = Object.entries(answers)
        .filter(([_, ans]) => ans.trim().length > 0)
        .map(([qId, ans]) => ({ question_id: qId, answer: ans }));

      await apiClient(`/reports/${activeReport.id}/regenerate-section`, {
        method: "POST",
        body: JSON.stringify({
          pillar,
          output_format: activeReport.output_format,
          interview_answers: formattedAnswers,
        }),
      });
      await fetchReports();
    } catch (err: any) {
      setError(err.message || `Failed to regenerate ${pillar} section.`);
    } finally {
      setRegenPillar(null);
    }
  };

  const handleWorkflow = async (action: string, payload?: object) => {
    if (!activeReport) return;
    setWorkflowLoading(true);
    setError("");
    try {
      await apiClient(`/reports/${activeReport.id}/${action}`, {
        method: "POST",
        body: payload ? JSON.stringify(payload) : undefined,
      });
      await fetchReports();
    } catch (err: any) {
      setError(err.message || `Failed to ${action}.`);
    } finally {
      setWorkflowLoading(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!activeReport) return;
    try {
      const authStr = localStorage.getItem("atlas-auth");
      const token = authStr ? JSON.parse(authStr).state?.token : null;
      const baseUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:8000/api/v1";
      const url = `${baseUrl}/reports/${activeReport.id}/export?format=${format}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob),
        download: `sustainability_report_${activeReport.reporting_year}_v${activeReport.version}.${format === "xhtml" ? "html" : format}`,
      });
      document.body.appendChild(a); a.click(); a.remove();
    } catch (err: any) {
      setError(err.message || "Export failed.");
    }
  };

  // ── Scroll to section ────────────────────────────────────────────────────
  const scrollToSection = (pillar: string) => {
    setActiveSection(pillar);
    const el = document.getElementById(`section-${pillar}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 6rem)", gap: 0, overflow: "hidden" }}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <header style={{ padding: "0 0 16px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 className="atlas-page-title" style={{ color: "#166534" }}>Report Studio</h1>
            <p className="atlas-page-subtitle">
              Generate investor-grade ESG reports aligned with CSRD, GRI, and TCFD from verified workspace data.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Workflow actions */}
            {activeReport && (
              <div style={{ display: "flex", gap: 8, paddingRight: 12, marginRight: 4, borderRight: "1px solid #e2e8f0" }}>
                {activeReport.status === "draft" && (
                  <button
                    onClick={() => handleWorkflow("submit-for-review")}
                    disabled={workflowLoading}
                    style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>rate_review</span>
                    Submit for Review
                  </button>
                )}
                {activeReport.status === "review" && (
                  <>
                    <button
                      onClick={() => handleWorkflow("approve")}
                      disabled={workflowLoading}
                      style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer", border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#16a34a", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>verified</span>Approve
                    </button>
                    <button
                      onClick={() => { const r = prompt("Rejection reason:"); if (r) handleWorkflow("reject", { reason: r }); }}
                      disabled={workflowLoading}
                      style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer", border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 15 }}>cancel</span>Reject
                    </button>
                  </>
                )}
                {activeReport.status === "approved" && (
                  <button
                    onClick={() => handleWorkflow("publish")}
                    disabled={workflowLoading}
                    style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer", border: "1px solid #bbf7d0", background: "#166534", color: "white", display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>public</span>Publish
                  </button>
                )}
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                padding: "8px 16px", fontSize: 13, fontWeight: 700, borderRadius: 8,
                cursor: generating ? "not-allowed" : "pointer",
                border: "none", background: generating ? "#94a3b8" : "linear-gradient(135deg,#16a34a,#166534)",
                color: "white", display: "flex", alignItems: "center", gap: 6,
                boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16, animation: generating ? "spin 1s linear infinite" : "none" }}>
                {generating ? "progress_activity" : (activeReport ? "refresh" : "auto_awesome")}
              </span>
              {generating ? "Generating Report…" : (activeReport ? "Regenerate Draft" : "Generate First Draft")}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
            {error}
            <button onClick={() => setError("")} style={{ marginLeft: "auto", background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: 16 }}>×</button>
          </div>
        )}
      </header>

      {/* ── Main 3-Column Layout ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "280px 1fr 240px", gap: 16, overflow: "hidden" }}>

        {/* ── LEFT: Interview Panel ────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
          {/* Config panel */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, flexShrink: 0 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 }}>Report Configuration</p>

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Framework</label>
              <select
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                disabled={!!activeReport && activeReport.status !== "draft"}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, color: "#1e293b", background: "white", outline: "none" }}
              >
                {FRAMEWORKS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label} — {f.desc}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#475569", display: "block", marginBottom: 4 }}>Reporting Year</label>
              <select
                value={reportingYear}
                onChange={(e) => setReportingYear(Number(e.target.value))}
                style={{ width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12, color: "#1e293b", background: "white", outline: "none" }}
              >
                {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Progress overview */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase" }}>Context Progress</p>
              <span style={{ fontSize: 16, fontWeight: 800, color: "#16a34a" }}>{overallPct}%</span>
            </div>
            <div style={{ height: 4, background: "#f1f5f9", borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: "100%", width: `${overallPct}%`, background: "linear-gradient(90deg,#22c55e,#16a34a)", borderRadius: 4, transition: "width 0.4s" }} />
            </div>
            {pillarCompletion.map(({ pillar, answered, total, pct }) => {
              const m = PILLAR_META[pillar] || PILLAR_META.governance;
              return (
                <div key={pillar} style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{m.label}</span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{answered}/{total}</span>
                  </div>
                  <div style={{ height: 3, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: m.color, borderRadius: 3, transition: "width 0.4s" }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pillar filter */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", flexShrink: 0 }}>
            <button
              onClick={() => setActivePillarFilter("all")}
              style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, border: "1px solid", cursor: "pointer",
                background: activePillarFilter === "all" ? "#1e293b" : "white",
                color: activePillarFilter === "all" ? "white" : "#475569",
                borderColor: activePillarFilter === "all" ? "#1e293b" : "#e2e8f0" }}
            >All</button>
            {Object.entries(PILLAR_META).map(([p, m]) => (
              <button key={p} onClick={() => setActivePillarFilter(p)}
                style={{ fontSize: 10, fontWeight: 600, padding: "4px 10px", borderRadius: 20, border: "1px solid", cursor: "pointer",
                  background: activePillarFilter === p ? m.color : "white",
                  color: activePillarFilter === p ? "white" : m.color,
                  borderColor: activePillarFilter === p ? m.color : m.border }}
              >{m.label}</button>
            ))}
          </div>

          {/* Questions scroll area */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 16 }}>
            {filteredQuestions.map((q) => (
              <QuestionCard
                key={q.id}
                q={q}
                answer={answers[q.id] || ""}
                onChange={(v) => setAnswers((prev) => ({ ...prev, [q.id]: v }))}
                disabled={!!activeReport && activeReport.status !== "draft"}
              />
            ))}
            {filteredQuestions.length === 0 && (
              <p style={{ color: "#94a3b8", fontSize: 12, textAlign: "center", padding: "24px 0" }}>Loading questions…</p>
            )}
          </div>
        </div>

        {/* ── CENTER: Report Document ──────────────────────────────────── */}
        <div style={{
          display: "flex", flexDirection: "column", background: "white",
          border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)"
        }}>
          {/* Document toolbar */}
          {activeReport && (
            <div style={{ height: 52, borderBottom: "1px solid #f1f5f9", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0, gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#16a34a" }}>description</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                  {activeReport.output_format.toUpperCase()} · {activeReport.reporting_year}
                </span>
                <StatusPill status={activeReport.status} />
                <span style={{ fontSize: 10, background: "#f1f5f9", color: "#64748b", padding: "2px 8px", borderRadius: 4, fontWeight: 700 }}>v{activeReport.version}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* Version selector */}
                {reports.length > 1 && (
                  <select
                    value={selectedReportId || ""}
                    onChange={(e) => setSelectedReportId(e.target.value)}
                    style={{ fontSize: 11, padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 6, color: "#475569", background: "white" }}
                  >
                    {reports.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.reporting_year} · v{r.version} · {STATUS_CONFIG[r.status]?.label || r.status}
                      </option>
                    ))}
                  </select>
                )}
                {/* Export buttons */}
                {(activeReport.status === "approved" || activeReport.status === "published") && (
                  <div style={{ display: "flex", gap: 4, paddingLeft: 8, borderLeft: "1px solid #e2e8f0" }}>
                    {["xhtml", "pdf", "docx"].map((fmt) => (
                      <button key={fmt} onClick={() => handleExport(fmt)}
                        title={`Export ${fmt.toUpperCase()}`}
                        style={{ padding: "5px 8px", border: "1px solid #e2e8f0", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 11, color: "#475569", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {fmt === "xhtml" ? "html" : fmt === "pdf" ? "picture_as_pdf" : "description"}
                        </span>
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Workflow bar */}
          {activeReport && (
            <div style={{ padding: "10px 20px", borderBottom: "1px solid #f1f5f9", background: "white", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <WorkflowBar status={activeReport.status} />
              {activeReport.rejection_reason && (
                <div style={{ fontSize: 11, color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "4px 10px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 12, verticalAlign: "middle" }}>warning</span>{" "}
                  {activeReport.rejection_reason}
                </div>
              )}
              <span style={{ fontSize: 11, color: "#94a3b8" }}>Updated {new Date(activeReport.updated_at).toLocaleString()}</span>
            </div>
          )}

          {/* Document body */}
          <div ref={docRef} style={{ flex: 1, overflowY: "auto", padding: "40px 48px" }}>
            {generating ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  border: "4px solid #e2e8f0", borderTopColor: "#16a34a",
                  animation: "spin 0.9s linear infinite",
                }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>Orchestrating Report</h3>
                <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", maxWidth: 320 }}>
                  Fetching verified metrics, aligning with {FRAMEWORKS.find(f => f.value === framework)?.label} standards,
                  and generating audit-ready narrative…
                </p>
              </div>
            ) : !activeReport ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16 }}>
                <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 40, color: "#16a34a" }}>auto_awesome</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>Ready to Generate</h3>
                <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", maxWidth: 380 }}>
                  Complete management commentary questions for the best results, then click
                  <strong> Generate First Draft</strong> above.
                </p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                  {FRAMEWORKS.map((f) => (
                    <button key={f.value} onClick={() => setFramework(f.value)}
                      style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, border: "1px solid", cursor: "pointer",
                        background: framework === f.value ? "#f0fdf4" : "white",
                        color: framework === f.value ? "#16a34a" : "#475569",
                        borderColor: framework === f.value ? "#bbf7d0" : "#e2e8f0",
                        fontWeight: framework === f.value ? 700 : 400 }}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Executive Summary */}
                <div style={{ marginBottom: 40 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <h2 style={{ fontSize: 26, fontWeight: 800, color: "#0f2d17", letterSpacing: "-0.5px" }}>
                      {activeReport.output_format.toUpperCase()} Sustainability Report {activeReport.reporting_year}
                    </h2>
                    {activeReport.sha256_hash && reportVerifications[activeReport.id] && (
                      <BlockchainBadge 
                        verification={reportVerifications[activeReport.id]} 
                        onRefresh={() => fetchReportVerification(activeReport.id)} 
                      />
                    )}
                  </div>
                  <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "20px 24px", marginTop: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#16a34a", textTransform: "uppercase", marginBottom: 10 }}>Executive Summary</p>
                    <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.75 }}>
                      <SimpleMarkdown text={activeReport.exec_summary} />
                    </div>
                  </div>
                </div>

                {/* Sections */}
                {Object.entries(activeReport.sections).map(([pillar, section]) => {
                  const m = PILLAR_META[pillar] || PILLAR_META.governance;
                  const isRegening = regenPillar === pillar;
                  return (
                    <div key={pillar} id={`section-${pillar}`}
                      style={{ marginBottom: 40, paddingBottom: 32, borderBottom: "1px solid #f1f5f9" }}>
                      {/* Section header */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                        <div>
                          <div style={{ borderLeft: `3px solid ${m.color}`, paddingLeft: 12 }}>
                            <h3 style={{ fontSize: 17, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>{section.title}</h3>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {(section.framework_tags || []).map((tag: string) => (
                                <FrameworkTag key={tag} tag={tag} />
                              ))}
                            </div>
                          </div>
                        </div>
                        {activeReport.status === "draft" && (
                          <button
                            onClick={() => handleRegenSection(pillar)}
                            disabled={!!regenPillar}
                            title="Regenerate this section"
                            style={{ padding: "5px 10px", border: `1px solid ${m.border}`, borderRadius: 6, background: m.bg, color: m.color, cursor: regenPillar ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, flexShrink: 0, marginLeft: 8 }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14, animation: isRegening ? "spin 1s linear infinite" : "none" }}>
                              {isRegening ? "progress_activity" : "refresh"}
                            </span>
                            {isRegening ? "Regenerating…" : "Regen"}
                          </button>
                        )}
                      </div>

                      {/* Content */}
                      <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
                        <SimpleMarkdown text={section.content} />
                      </div>

                      {/* Caveats */}
                      {section.data_caveats?.length > 0 && (
                        <div style={{ marginTop: 12, padding: "10px 14px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, fontSize: 11, color: "#92400e", display: "flex", gap: 6 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, flexShrink: 0 }}>warning</span>
                          <span><strong>Data caveats:</strong> {section.data_caveats.join(" | ")}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* ── RIGHT: Sidebar ───────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>

          {/* Report versions */}
          {reports.length > 0 && (
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 }}>Report History</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {reports.slice(0, 5).map((r) => {
                  const cfg = STATUS_CONFIG[r.status] || { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" };
                  const isActive = r.id === (activeReport?.id || reports[0]?.id);
                  return (
                    <button key={r.id} onClick={() => setSelectedReportId(r.id)}
                      style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${isActive ? "#bbf7d0" : "#f1f5f9"}`, background: isActive ? "#f0fdf4" : "white", cursor: "pointer", textAlign: "left", width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>{r.reporting_year}</span>
                        <span style={{ fontSize: 9, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: "1px 6px", borderRadius: 4, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{STATUS_CONFIG[r.status]?.label || r.status}</span>
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>v{r.version} · {r.output_format.toUpperCase()}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section navigator */}
          {activeReport && (
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 }}>Sections</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {Object.entries(activeReport.sections).map(([pillar, section]) => {
                  const m = PILLAR_META[pillar] || PILLAR_META.governance;
                  return (
                    <button key={pillar} onClick={() => scrollToSection(pillar)}
                      style={{ padding: "6px 8px", borderRadius: 6, border: "none", background: activeSection === pillar ? m.bg : "transparent", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 7 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, color: m.color }}>{m.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{section.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Framework legend */}
          <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 }}>Framework Guide</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {FRAMEWORKS.map((f) => (
                <div key={f.value} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${framework === f.value ? "#bbf7d0" : "#f1f5f9"}`, background: framework === f.value ? "#f0fdf4" : "white" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: framework === f.value ? "#16a34a" : "#334155" }}>{f.label}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Data coverage */}
          {activeReport && (
            <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#94a3b8", textTransform: "uppercase" }}>Data Coverage</p>
                <button onClick={() => setShowLineage(!showLineage)} style={{ fontSize: 10, color: "#16a34a", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                  {showLineage ? "Hide" : "View all"}
                </button>
              </div>
              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 800, color: "#16a34a" }}>{activeReport.data_lineage?.length || 0}</span>
                <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Verified Metrics Included</p>
              </div>
              {showLineage && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflowY: "auto" }}>
                  {activeReport.data_lineage?.map((item: any, i: number) => {
                    const m = PILLAR_META[item.pillar] || PILLAR_META.governance;
                    return (
                      <div key={i} style={{ padding: "6px 8px", background: "#f8fafc", borderRadius: 6, border: "1px solid #f1f5f9" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 10, fontFamily: "monospace", fontWeight: 700, color: m.color }}>{item.metric_code}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#1e293b" }}>{item.value} {item.unit}</span>
                        </div>
                        <p style={{ fontSize: 10, color: "#64748b", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
