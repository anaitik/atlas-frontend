import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { useWorkspaceStore } from "../../store/workspace";

interface Question {
  id: string;
  question_number: number;
  pillar: string;
  category: string;
  question_text: string;
  metric_code: string;
  metric_name: string;
  value_schema: { unit: string; label: string } | null;
}

interface InterviewResponse {
  question_id: string;
  answer_mode: string;
  raw_value: number | null;
  raw_unit: string | null;
  raw_text: string | null;
  interpreted_value: number | null;
  interpreted_unit: string | null;
  interpretation_reasoning: string | null;
  status: string;
}

interface Progress {
  approved: number;
  total_questions: number;
  completion_pct: number;
  pillar_scores: Record<string, number>;
  overall_esg_score: number;
  data_quality_score: number;
  responses: InterviewResponse[];
}

const PILLAR = {
  environmental: { label: "Environmental", color: "#059669", light: "#ecfdf5", border: "#6ee7b7", icon: "eco" },
  social:        { label: "Social",        color: "#2563eb", light: "#eff6ff", border: "#93c5fd", icon: "group" },
  governance:    { label: "Governance",    color: "#7c3aed", light: "#f5f3ff", border: "#c4b5fd", icon: "balance" },
} as const;

const PILLAR_ORDER = ["environmental", "social", "governance"] as const;

function grade(s: number) {
  if (s >= 80) return { letter: "A", color: "#059669" };
  if (s >= 60) return { letter: "B", color: "#2563eb" };
  if (s >= 40) return { letter: "C", color: "#d97706" };
  if (s >= 20) return { letter: "D", color: "#ea580c" };
  return { letter: "E", color: "#dc2626" };
}

function Ring({ score, color, size = 72 }: { score: number; color: string; size?: number }) {
  const r = size / 2 - 7;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth="6" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeLinecap="round" strokeDasharray={`${circ}`} strokeDashoffset={`${offset}`}
        transform={`rotate(-90 ${cx} ${cy})`} style={{ transition: "stroke-dashoffset 0.7s ease" }} />
      <text x={cx} y={cy + 5} textAnchor="middle" fill={color} fontSize={size > 60 ? "16" : "12"} fontWeight="900" fontFamily="system-ui,sans-serif">{score}</text>
    </svg>
  );
}

export function VsmeReportPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { activeWorkspaceName, activeCompanyName } = useWorkspaceStore();
  const companyName = activeCompanyName || "";
  const workspaceName = activeWorkspaceName || "ESG Assessment";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const [qRes, pRes] = await Promise.all([
        apiClient<Question[]>(`/interview/workspace/${workspaceId}/questions`),
        apiClient<Progress>(`/interview/workspace/${workspaceId}/progress`),
      ]);
      setQuestions(qRes || []);
      if (pRes) setProgress(pRes);
    } catch {
      // silently degrade — report still renders with partial data
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { void load(); }, [load]);

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  const respMap: Record<string, InterviewResponse> = {};
  for (const r of progress?.responses || []) respMap[r.question_id] = r;

  const overallGrade = grade(progress?.overall_esg_score ?? 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <span className="material-symbols-outlined text-[32px] text-atlas-400 animate-spin block">progress_activity</span>
          <p className="text-[13px] text-gray-400">Preparing report…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Screen-only toolbar ──────────────────────────────── */}
      <div className="print:hidden sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/w/${workspaceId}`)}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">arrow_back</span>
              Back
            </button>
            <span className="text-gray-200 text-[14px]">|</span>
            <span className="text-[13px] font-semibold text-gray-700">ESG Performance Report</span>
            {companyName && <span className="text-[12px] text-gray-400">· {companyName}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/w/${workspaceId}/bank-access`)}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-atlas-600 hover:text-atlas-800 bg-atlas-50 border border-atlas-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">account_balance</span>
              Share with bank
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-gray-900 hover:bg-gray-700 text-white text-[12px] font-bold px-4 py-1.5 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Report document ──────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 py-8 print:px-0 print:py-0 print:max-w-none">
        <div className="bg-white rounded-2xl shadow-sm print:shadow-none print:rounded-none print:bg-white">

          {/* Cover */}
          <div className="p-10 print:p-8 border-b border-gray-100 print:border-gray-300">
            <div className="flex items-start justify-between gap-8">
              {/* Left: identity */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-gray-900">Atlas ESG</p>
                    <p className="text-[10px] text-gray-400 tracking-wide">Verified ESG Assessment</p>
                  </div>
                </div>

                <h1 className="text-[32px] font-black text-gray-900 leading-tight tracking-tight">
                  ESG Performance<br />Report
                </h1>
                <p className="text-[13px] text-gray-500 mt-1.5">EFRAG VSME Standard · Module A Disclosure</p>

                <div className="mt-5 space-y-1">
                  {companyName && (
                    <p className="text-[18px] font-extrabold text-gray-800">{companyName}</p>
                  )}
                  <p className="text-[13px] text-gray-500">{workspaceName}</p>
                  <p className="text-[12px] text-gray-400">Generated {today}</p>
                </div>
              </div>

              {/* Right: score card */}
              {progress && (
                <div className="shrink-0">
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 text-center w-52">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Atlas ESG Score</p>

                    {/* Overall */}
                    <div className="flex justify-center mb-1">
                      <Ring score={progress.overall_esg_score} color={overallGrade.color} size={80} />
                    </div>
                    <p className="text-[14px] font-extrabold" style={{ color: overallGrade.color }}>
                      Grade {overallGrade.letter}
                    </p>

                    {/* Pillar rings */}
                    <div className="flex justify-around mt-4 pt-4 border-t border-gray-200">
                      {PILLAR_ORDER.map(p => {
                        const meta = PILLAR[p];
                        const s = progress.pillar_scores?.[p] ?? 0;
                        return (
                          <div key={p} className="flex flex-col items-center gap-1">
                            <Ring score={s} color={meta.color} size={44} />
                            <span className="text-[9px] font-bold text-gray-400 uppercase">{meta.label[0]}</span>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-gray-400 mt-3">
                      {progress.approved}/{progress.total_questions} data points
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Attestation bar */}
            <div className="mt-7 flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-emerald-600 text-[18px] shrink-0">verified_user</span>
              <p className="text-[12px] text-emerald-700 font-medium leading-snug">
                Verified by Atlas ESG · AI-assisted interpretation · EFRAG VSME Module A framework · {today}
              </p>
            </div>
          </div>

          {/* Score summary bar */}
          {progress && (
            <div className="px-10 print:px-8 py-5 bg-gray-50/60 border-b border-gray-100 grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-[28px] font-black text-gray-900 leading-none">{progress.overall_esg_score}</p>
                <p className="text-[11px] font-semibold text-gray-500 mt-1">Performance Score</p>
                <p className="text-[10px] text-gray-400">benchmarked vs sector peers</p>
              </div>
              <div className="text-center border-x border-gray-200">
                <p className="text-[28px] font-black text-gray-900 leading-none">{progress.completion_pct}%</p>
                <p className="text-[11px] font-semibold text-gray-500 mt-1">Disclosure Completeness</p>
                <p className="text-[10px] text-gray-400">{progress.approved} of {progress.total_questions} answered</p>
              </div>
              <div className="text-center">
                <p className="text-[28px] font-black text-gray-900 leading-none">{progress.data_quality_score}</p>
                <p className="text-[11px] font-semibold text-gray-500 mt-1">Data Trust Score</p>
                <p className="text-[10px] text-gray-400">confidence + plausibility</p>
              </div>
            </div>
          )}

          {/* Pillar sections */}
          <div className="divide-y divide-gray-100 print:divide-gray-200">
            {PILLAR_ORDER.map((pillar) => {
              const meta = PILLAR[pillar];
              const qs = questions.filter(q => q.pillar === pillar);
              const answered = qs.filter(q => respMap[q.id]?.status === "approved").length;
              const pillarScore = progress?.pillar_scores?.[pillar] ?? 0;

              return (
                <div key={pillar} className="px-10 print:px-8 py-8">
                  {/* Pillar header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: meta.light, border: `1px solid ${meta.border}` }}>
                        <span className="material-symbols-outlined text-[18px]" style={{ color: meta.color }}>{meta.icon}</span>
                      </div>
                      <div>
                        <h2 className="text-[18px] font-extrabold text-gray-900">{meta.label}</h2>
                        <p className="text-[11px] text-gray-400">{answered}/{qs.length} data points reported</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Ring score={pillarScore} color={meta.color} size={52} />
                      <div>
                        <p className="text-[10px] text-gray-400">Score</p>
                        <p className="text-[11px] font-bold" style={{ color: meta.color }}>Grade {grade(pillarScore).letter}</p>
                      </div>
                    </div>
                  </div>

                  {/* Questions */}
                  {qs.length > 0 ? (
                    <div className="space-y-2.5">
                      {qs.map((q, idx) => {
                        const resp = respMap[q.id];
                        const isApproved = resp?.status === "approved";
                        const isSkipped = resp?.answer_mode === "skipped" || resp?.status === "skipped";
                        const isAuto = resp?.interpretation_reasoning?.startsWith("Atlas estimated");
                        const qLabel = q.question_number ? `Q${q.question_number}` : `${idx + 1}`;

                        return (
                          <div key={q.id}
                            className={`rounded-xl border px-4 py-3.5 ${
                              isApproved
                                ? "bg-white border-gray-200"
                                : "bg-gray-50/60 border-dashed border-gray-200"
                            }`}
                          >
                            <div className="flex items-start gap-4">
                              {/* Status dot */}
                              <div className="shrink-0 mt-0.5">
                                {isApproved ? (
                                  <span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span>
                                ) : (
                                  <span className="material-symbols-outlined text-gray-300 text-[16px]">radio_button_unchecked</span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{qLabel}</span>
                                  <span className="text-[10px] text-gray-300">·</span>
                                  <span className="text-[10px] font-semibold text-gray-500">{q.category}</span>
                                  {isAuto && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-200">AUTO</span>
                                  )}
                                </div>
                                <p className="text-[13px] font-semibold text-gray-800 leading-snug">{q.question_text}</p>
                                {isApproved && resp?.interpretation_reasoning && (
                                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed italic">
                                    {resp.interpretation_reasoning}
                                  </p>
                                )}
                              </div>

                              {/* Value */}
                              <div className="shrink-0 text-right min-w-[90px]">
                                {isApproved && resp ? (
                                  <>
                                    <p className="text-[20px] font-black text-gray-900 leading-none">
                                      {resp.interpreted_value !== null
                                        ? resp.interpreted_value.toLocaleString()
                                        : resp.raw_text ? "" : "—"}
                                    </p>
                                    {resp.interpreted_unit && (
                                      <p className="text-[11px] font-medium text-gray-400">{resp.interpreted_unit}</p>
                                    )}
                                    {resp.raw_text && resp.interpreted_value === null && (
                                      <p className="text-[12px] text-gray-600 italic leading-snug max-w-[120px] text-right">{resp.raw_text}</p>
                                    )}
                                  </>
                                ) : isSkipped ? (
                                  <span className="text-[11px] font-medium text-gray-300">Not reported</span>
                                ) : (
                                  <span className="text-[11px] font-medium text-gray-200">Pending</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[12px] text-gray-400 italic">No questions in this pillar yet.</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-10 print:px-8 py-6 border-t border-gray-100 print:border-gray-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[12px] font-bold text-gray-700">Atlas ESG Platform</p>
                <p className="text-[11px] text-gray-400 mt-0.5">EFRAG VSME Standard — Module A · {today}</p>
              </div>
              <div className="text-right">
                {companyName && <p className="text-[12px] font-semibold text-gray-600">{companyName}</p>}
                <p className="text-[11px] text-gray-400">{workspaceName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print CSS */}
      <style>{`
        @media print {
          @page { margin: 1.2cm 1.5cm; size: A4 portrait; }
          body { background: white !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
