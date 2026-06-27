import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { BASE_URL } from "../../lib/api-client";

interface BankMetric {
  metric_code: string;
  metric_name: string;
  pillar: string;
  value: number;
  unit: string;
  status: string;
}

interface UnansweredQuestion {
  id: string;
  category: string;
  metric_name: string;
  pillar: string;
  bank_relevance: string;
}

interface ScoreFlag {
  severity: "critical" | "warn" | "info";
  code: string;
  message: string;
}

interface SubScore {
  key: string;
  label: string;
  score: number | null;
  weight: number;
  detail: string;
  value: unknown;
  scored: boolean;
}

interface CarbonBenchmark {
  intensity_tco2e_per_eur_m: number;
  sector_median: number;
  ratio_to_peers: number;
  sector_label: string | null;
  confidence: string | null;
  turnover_basis: string;
}

interface AtlasScore {
  performance_score: number | null;
  grade: string;
  completeness_score: number;
  data_trust_score: number;
  provisional: boolean;
  pillar_performance: Record<string, number | null>;
  pillar_completeness: Record<string, number>;
  carbon_benchmark: CarbonBenchmark | null;
  flags: ScoreFlag[];
  breakdown: Record<string, SubScore[]>;
  trust_components: Record<string, number>;
  methodology: Record<string, unknown>;
}

interface BankPortal {
  company_name: string;
  workspace_name: string;
  reporting_year: number | null;
  nace_sector: string | null;
  employee_count_range: string | null;
  turnover_range_eur: string | null;
  interview_completion_pct: number;
  total_approved: number;
  total_questions: number;
  pillar_scores: Record<string, number>;
  overall_esg_score: number;
  data_quality_score: number;
  atlas_score: AtlasScore | null;
  metrics: BankMetric[];
  unanswered_questions: UnansweredQuestion[];
  blockchain_verified: boolean;
  blockchain_tx_id: string | null;
  report_id: string | null;
  sha256_hash: string | null;
  institution_name: string;
  generated_at: string;
  atlas_verified: boolean;
}

const PILLAR_COLORS: Record<string, string> = {
  environmental: "bg-emerald-50 border-emerald-200 text-emerald-700",
  social: "bg-blue-50 border-blue-200 text-blue-700",
  governance: "bg-purple-50 border-purple-200 text-purple-700",
};

const PILLAR_ICONS: Record<string, string> = {
  environmental: "eco",
  social: "group",
  governance: "balance",
};

const PILLAR_RING_COLORS: Record<string, string> = {
  environmental: "#10b981",
  social: "#3b82f6",
  governance: "#8b5cf6",
};

function scoreGradeClass(score: number) {
  if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 60) return "text-blue-700 bg-blue-50 border-blue-200";
  if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-100";
}

function ScoreRing({ score, pillar, size = 80 }: { score: number; pillar: string; size?: number }) {
  const r = size / 2 - 6;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const color = PILLAR_RING_COLORS[pillar] || "#6b7280";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="5.5" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="5.5"
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={`${offset}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x={cx} y={cy + 5} textAnchor="middle" fill={color} fontSize="15" fontWeight="800" fontFamily="system-ui,sans-serif">
        {score}
      </text>
    </svg>
  );
}

const SEVERITY: Record<string, { cls: string; icon: string; label: string }> = {
  critical: { cls: "bg-red-50 border-red-200 text-red-700", icon: "error", label: "Critical" },
  warn: { cls: "bg-amber-50 border-amber-200 text-amber-700", icon: "warning", label: "Review" },
  info: { cls: "bg-slate-50 border-slate-200 text-slate-600", icon: "info", label: "Note" },
};

function StatTile({ value, label, sublabel, tone = "neutral" }: {
  value: string; label: string; sublabel?: string; tone?: "good" | "warn" | "bad" | "neutral";
}) {
  const toneCls =
    tone === "good" ? "text-emerald-600" :
    tone === "warn" ? "text-amber-600" :
    tone === "bad" ? "text-red-500" : "text-gray-900";
  return (
    <div className="flex flex-col items-center text-center px-3 py-3 rounded-xl bg-gray-50/70 border border-gray-100">
      <span className={`text-[26px] font-black leading-none ${toneCls}`}>{value}</span>
      <span className="text-[11px] font-bold text-gray-600 mt-1.5">{label}</span>
      {sublabel && <span className="text-[10px] text-gray-400 mt-0.5">{sublabel}</span>}
    </div>
  );
}

function toneFor(score: number | null): "good" | "warn" | "bad" | "neutral" {
  if (score === null) return "neutral";
  if (score >= 60) return "good";
  if (score >= 40) return "warn";
  return "bad";
}

function BenchmarkBar({ b }: { b: CarbonBenchmark }) {
  // Position the borrower on a 0–3x peer-median scale.
  const ratio = b.ratio_to_peers;
  const pos = Math.min(100, (ratio / 3) * 100);
  const tone = ratio <= 1 ? "emerald" : ratio <= 2 ? "amber" : "red";
  const toneBar = tone === "emerald" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : "bg-red-500";
  const verdict = ratio <= 0.75 ? "Lower-emitting than peers"
    : ratio <= 1.25 ? "Typical for sector"
    : ratio <= 2 ? "Higher than peers" : "Significantly higher than peers";
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-bold text-gray-800">Carbon intensity vs sector peers</p>
          <p className="text-[10px] text-gray-400">{b.sector_label}</p>
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
          tone === "emerald" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
          : tone === "amber" ? "bg-amber-50 border-amber-200 text-amber-700"
          : "bg-red-50 border-red-200 text-red-700"}`}>
          {ratio.toFixed(1)}× median
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-200 via-amber-200 to-red-200">
        {/* median marker at 1x = 33% */}
        <div className="absolute top-[-3px] h-[14px] w-px bg-gray-400" style={{ left: "33.33%" }} />
        <div className={`absolute -top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow ${toneBar}`}
             style={{ left: `calc(${pos}% - 7px)` }} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-gray-400">
        <span>{b.intensity_tco2e_per_eur_m.toLocaleString()} tCO₂e/€M</span>
        <span>peer median {b.sector_median.toLocaleString()}</span>
      </div>
      <p className="text-[11px] font-semibold text-gray-600">{verdict}</p>
    </div>
  );
}

function FlagsPanel({ flags }: { flags: ScoreFlag[] }) {
  const order = { critical: 0, warn: 1, info: 2 } as const;
  const sorted = [...flags].sort((a, b) => order[a.severity] - order[b.severity]);
  if (sorted.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
        <span className="material-symbols-outlined text-emerald-600 text-[18px]">check_circle</span>
        <p className="text-[12px] font-semibold text-emerald-700">No data-integrity flags — figures are internally consistent.</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {sorted.map((f, i) => {
        const c = SEVERITY[f.severity] || SEVERITY.info;
        return (
          <div key={i} className={`flex items-start gap-2.5 rounded-xl border px-4 py-2.5 ${c.cls}`}>
            <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">{c.icon}</span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">{c.label}</span>
              <p className="text-[12px] font-medium leading-snug">{f.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({ metric }: { metric: BankMetric }) {
  const pillarColor = PILLAR_COLORS[metric.pillar] || "bg-surface-secondary border-border text-text-secondary";
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${pillarColor}`}>
          <span className="material-symbols-outlined text-[11px]">{PILLAR_ICONS[metric.pillar] || "circle"}</span>
          {metric.pillar}
        </span>
        <span className="material-symbols-outlined text-emerald-500 text-[16px]" title="Approved">verified</span>
      </div>
      <p className="text-[11px] text-gray-500 font-medium">{metric.metric_name}</p>
      <p className="text-[22px] font-bold text-gray-900 leading-none">
        {typeof metric.value === "number" ? metric.value.toLocaleString() : metric.value}
        <span className="text-[13px] font-medium text-gray-400 ml-1.5">{metric.unit}</span>
      </p>
    </div>
  );
}

function PillarSection({
  pillar,
  metrics,
  unanswered,
}: {
  pillar: string;
  metrics: BankMetric[];
  unanswered: UnansweredQuestion[];
}) {
  if (metrics.length === 0 && unanswered.length === 0) return null;
  const color = PILLAR_COLORS[pillar] || "";
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className={`inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1 rounded-full border ${color} capitalize`}>
          <span className="material-symbols-outlined text-[14px]">{PILLAR_ICONS[pillar] || "circle"}</span>
          {pillar}
        </div>
        {unanswered.length > 0 && (
          <span className="text-[11px] text-gray-400 font-medium">{unanswered.length} data point{unanswered.length !== 1 ? "s" : ""} pending</span>
        )}
      </div>

      {metrics.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {metrics.map((m) => (
            <MetricCard key={m.metric_code} metric={m} />
          ))}
        </div>
      )}

      {unanswered.length > 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4 space-y-2.5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Not yet reported</p>
          <div className="space-y-2">
            {unanswered.map((q) => (
              <div key={q.id} className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-gray-300 text-[15px] mt-0.5 shrink-0">radio_button_unchecked</span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-gray-500">{q.metric_name}</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed mt-0.5">{q.bank_relevance}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const PRINT_STYLES = `
@media print {
  body { background: white !important; }
  .no-print { display: none !important; }
  .print-break { page-break-before: always; }
  header { box-shadow: none !important; border-bottom: 1px solid #e5e7eb !important; }
  .min-h-screen { min-height: unset !important; background: white !important; }
}
`;

export function BankVerificationPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<BankPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${BASE_URL}/bank/public/portal/${token}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json?.detail || json?.message || "Access denied");
        setData(json?.data || json);
      })
      .catch((e) => setError(e?.message || "Failed to load ESG data"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-atlas-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-atlas-600 flex items-center justify-center mx-auto animate-pulse">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f0fdf4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <p className="text-[14px] text-gray-500">Loading verified ESG data…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-red-500 text-[24px]">error</span>
          </div>
          <h1 className="text-[18px] font-bold text-gray-900">Access Unavailable</h1>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            {error || "This ESG data link is invalid, expired, or has been revoked."}
          </p>
          <p className="text-[12px] text-gray-400">
            Contact the company to request a new access link.
          </p>
        </div>
      </div>
    );
  }

  const byPillar = {
    environmental: data.metrics.filter((m) => m.pillar === "environmental"),
    social: data.metrics.filter((m) => m.pillar === "social"),
    governance: data.metrics.filter((m) => m.pillar === "governance"),
  };

  const unansweredByPillar = {
    environmental: (data.unanswered_questions || []).filter((q) => q.pillar === "environmental"),
    social: (data.unanswered_questions || []).filter((q) => q.pillar === "social"),
    governance: (data.unanswered_questions || []).filter((q) => q.pillar === "governance"),
  };

  const s = data.atlas_score;
  const perf = s?.performance_score ?? null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-atlas-50/30">
      <style>{PRINT_STYLES}</style>
      {/* Header bar */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-atlas-600 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f0fdf4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-bold text-gray-900">Atlas</p>
              <p className="text-[10px] text-gray-400">ESG Verification Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Download button */}
            <button
              onClick={() => window.print()}
              className="no-print flex items-center gap-1.5 text-[12px] font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full px-3 py-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              Download PDF
            </button>
            {/* Verified badge */}
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5">
              <span className="material-symbols-outlined text-emerald-600 text-[14px]">verified_user</span>
              <span className="text-[11px] font-bold text-emerald-700">Verified by Atlas</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Company summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">
                  ESG Report for {data.institution_name}
                </p>
              </div>
              <h1 className="text-[24px] font-bold text-gray-900">{data.company_name}</h1>
              <p className="text-[14px] text-gray-500 mt-0.5">{data.workspace_name}</p>

              <div className="flex flex-wrap gap-2 mt-3">
                {data.reporting_year && (
                  <span className="text-[11px] font-medium text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                    FY {data.reporting_year}
                  </span>
                )}
                {data.nace_sector && (
                  <span className="text-[11px] font-medium text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                    Sector: {data.nace_sector}
                  </span>
                )}
                {data.employee_count_range && (
                  <span className="text-[11px] font-medium text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                    {data.employee_count_range} employees
                  </span>
                )}
                {data.turnover_range_eur && (
                  <span className="text-[11px] font-medium text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">
                    Turnover: {data.turnover_range_eur} EUR
                  </span>
                )}
              </div>
            </div>

            {/* Atlas ESG Score hero + blockchain */}
            <div className="flex sm:flex-col gap-3 sm:items-end shrink-0">
              <div className={`flex flex-col items-center px-5 py-3 rounded-xl border ${perf === null ? "text-gray-400 bg-gray-50 border-gray-200" : scoreGradeClass(perf)}`}>
                <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">Atlas ESG Score</span>
                <span className="text-[40px] font-black leading-none mt-0.5">{perf ?? "—"}</span>
                <span className="text-[11px] font-bold mt-0.5 opacity-80">Grade {s?.grade ?? "—"}</span>
                {s?.provisional && (
                  <span className="mt-1 text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Provisional · low coverage</span>
                )}
              </div>
              {data.blockchain_verified ? (
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                  <span className="material-symbols-outlined text-emerald-600 text-[14px]">link</span>
                  <span className="text-[10px] font-bold text-emerald-700">On-chain verified</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                  <span className="material-symbols-outlined text-gray-400 text-[14px]">link_off</span>
                  <span className="text-[10px] font-medium text-gray-400">Pending blockchain</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Atlas ESG Score — performance, completeness, trust */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-[15px] font-bold text-gray-900">Atlas ESG Score</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Performance benchmarked against sector peers · EFRAG VSME · E 40% · S 30% · G 30%
            </p>
          </div>

          {/* The three numbers a credit officer needs, kept distinct */}
          <div className="grid grid-cols-3 gap-3">
            <StatTile
              value={perf === null ? "—" : String(perf)}
              label="Performance"
              sublabel={perf === null ? "insufficient data" : `Grade ${s?.grade}`}
              tone={toneFor(perf)}
            />
            <StatTile
              value={`${s?.completeness_score ?? data.interview_completion_pct}%`}
              label="Disclosure completeness"
              sublabel={`${data.total_approved}/${data.total_questions} answered`}
              tone={toneFor(s?.completeness_score ?? data.interview_completion_pct)}
            />
            <StatTile
              value={`${s?.data_trust_score ?? data.data_quality_score}%`}
              label="Data trust"
              sublabel="confidence + checks"
              tone={toneFor(s?.data_trust_score ?? data.data_quality_score)}
            />
          </div>

          {/* Pillar performance rings */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6 pt-1">
            {(["environmental", "social", "governance"] as const).map((key) => {
              const pScore = s ? s.pillar_performance?.[key] ?? null : data.pillar_scores?.[key] ?? 0;
              const cov = s?.pillar_completeness?.[key];
              const LABELS: Record<string, string> = {
                environmental: "Environmental", social: "Social", governance: "Governance",
              };
              return (
                <div key={key} className="flex flex-col items-center gap-2">
                  {pScore === null ? (
                    <div className="w-20 h-20 rounded-full border-[5.5px] border-gray-100 flex items-center justify-center">
                      <span className="text-[15px] font-extrabold text-gray-300">—</span>
                    </div>
                  ) : (
                    <ScoreRing score={pScore} pillar={key} size={80} />
                  )}
                  <div className="text-center">
                    <p className="text-[12px] font-bold text-gray-700">{LABELS[key]}</p>
                    <p className="text-[10px] text-gray-400">
                      {cov !== undefined ? `${cov}% reported` : "performance"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sector benchmark */}
          {s?.carbon_benchmark && <BenchmarkBar b={s.carbon_benchmark} />}

          {/* Risk / data-integrity flags */}
          {s && (
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Underwriting flags</p>
              <FlagsPanel flags={s.flags} />
            </div>
          )}

          {/* Methodology transparency */}
          {s && (
            <details className="group">
              <summary className="cursor-pointer list-none flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined text-[14px] group-open:rotate-90 transition-transform">chevron_right</span>
                How this score is calculated
              </summary>
              <div className="mt-2 pl-5 text-[11px] text-gray-500 leading-relaxed space-y-1.5">
                <p>
                  <strong>Performance</strong> scores actual sustainability (carbon intensity vs sector peers,
                  renewables, recycling, pay, safety, gender balance, governance practices) — not how many
                  questions were answered. Missing answers lower <strong>completeness</strong>, not performance.
                  <strong> Data trust</strong> combines interpretation confidence with automated plausibility checks.
                </p>
                {s.carbon_benchmark?.confidence && (
                  <p>Sector benchmark confidence: <em>{s.carbon_benchmark.confidence.replace(/_/g, " ")}</em> (indicative).</p>
                )}
                <p className="text-gray-400">
                  Sector reference: Eurostat air-emissions intensities by NACE (env_ac_aeint_r2) and CSO Ireland 2023,
                  converted to a turnover basis. Indicative peer positioning, not an audited absolute.
                </p>
              </div>
            </details>
          )}
        </div>

        {/* Blockchain certificate */}
        {data.sha256_hash && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-atlas-600 text-[18px]">link</span>
              <h2 className="text-[14px] font-bold text-gray-900">Blockchain Certificate</h2>
            </div>
            <div className="space-y-2 text-[12px]">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-24 shrink-0">SHA-256 Hash</span>
                <span className="font-mono text-gray-600 bg-gray-50 px-2 py-1 rounded text-[10px] break-all">
                  {data.sha256_hash}
                </span>
              </div>
              {data.blockchain_tx_id && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 w-24 shrink-0">TX ID</span>
                  <span className="font-mono text-atlas-600 text-[10px] break-all">{data.blockchain_tx_id}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metrics by pillar */}
        <div className="space-y-8">
          {(["environmental", "social", "governance"] as const).map((pillar) => (
            <PillarSection
              key={pillar}
              pillar={pillar}
              metrics={byPillar[pillar]}
              unanswered={unansweredByPillar[pillar]}
            />
          ))}
          {data.metrics.length === 0 && (data.unanswered_questions || []).length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
              <span className="material-symbols-outlined text-[36px] text-gray-300 mb-2 block">analytics</span>
              <p className="text-[14px] font-semibold text-gray-500">No metrics available yet</p>
              <p className="text-[12px] text-gray-400 mt-1">
                This company is still completing their ESG data interview.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-[11px] text-gray-400 space-y-0.5">
            <p>
              Data provided by <strong className="text-gray-600">{data.company_name}</strong> via Atlas ESG Platform.
            </p>
            <p>Generated {new Date(data.generated_at).toLocaleString()}. Read-only access for {data.institution_name}.</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-6 h-6 rounded-md bg-atlas-600 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f0fdf4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-[12px] font-bold text-gray-700">Atlas ESG</span>
          </div>
        </div>
      </main>
    </div>
  );
}
