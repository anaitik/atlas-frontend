import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";
import { Button } from "../../components/ui/Button";

// ── Types ─────────────────────────────────────────────────────────

interface Question {
  id: string;
  question_number: number;
  pillar: string;
  category: string;
  question_text: string;
  metric_name: string;
  bank_relevance: string;
}

interface InterviewResponse {
  question_id: string;
  status: string;
}

interface Progress {
  approved: number;
  total_questions: number;
  completion_pct: number;
  overall_esg_score: number;
  pillar_scores: Record<string, number>;
  data_quality_score: number;
  responses: InterviewResponse[];
}

// ── Constants ─────────────────────────────────────────────────────

const PILLAR_WEIGHTS: Record<string, number> = {
  environmental: 40,
  social: 30,
  governance: 30,
};

const PILLAR_COLORS: Record<string, { badge: string; bar: string; ring: string }> = {
  environmental: { badge: "bg-emerald-50 border-emerald-200 text-emerald-700", bar: "bg-emerald-500", ring: "#10b981" },
  social:        { badge: "bg-blue-50 border-blue-200 text-blue-700",         bar: "bg-blue-500",    ring: "#3b82f6" },
  governance:    { badge: "bg-purple-50 border-purple-200 text-purple-700",   bar: "bg-purple-500",  ring: "#8b5cf6" },
};

const PILLAR_ICONS: Record<string, string> = {
  environmental: "eco",
  social: "group",
  governance: "balance",
};

// ── Helpers ────────────────────────────────────────────────────────

function scoreGrade(score: number) {
  if (score >= 80) return { letter: "A", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" };
  if (score >= 60) return { letter: "B", cls: "text-blue-700 bg-blue-50 border-blue-200" };
  if (score >= 40) return { letter: "C", cls: "text-amber-700 bg-amber-50 border-amber-200" };
  if (score >= 20) return { letter: "D", cls: "text-orange-700 bg-orange-50 border-orange-200" };
  return { letter: "E", cls: "text-red-600 bg-red-50 border-red-100" };
}

function ScoreArc({ score, size = 88 }: { score: number; size?: number }) {
  const r = size / 2 - 8;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  const grade = scoreGrade(score);
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${circumference}`}
        strokeDashoffset={`${offset}`}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x={cx} y={cy - 3} textAnchor="middle" fill={color} fontSize="18" fontWeight="900" fontFamily="system-ui,sans-serif">
        {score}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill={color} fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">
        {grade.letter}
      </text>
    </svg>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export function EsgGapPage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [qRes, pRes] = await Promise.all([
          apiClient(`/interview/workspace/${workspaceId}/questions`) as Promise<any>,
          apiClient(`/interview/workspace/${workspaceId}/progress`) as Promise<any>,
        ]);
        setQuestions(qRes?.data ?? qRes ?? []);
        const p = pRes?.data ?? pRes;
        setProgress(p ?? null);
      } catch {}
      finally { setLoading(false); }
    };
    void load();
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <span className="material-symbols-outlined text-[32px] text-atlas-400 animate-spin">progress_activity</span>
      </div>
    );
  }

  if (!progress) return null;

  const approvedIds = new Set(
    progress.responses.filter((r) => r.status === "approved").map((r) => r.question_id)
  );
  const unanswered = questions.filter((q) => !approvedIds.has(q.id));
  const answered = questions.filter((q) => approvedIds.has(q.id));

  // Compute per-pillar question counts from the actual question set (not hardcoded).
  const pillarCounts = questions.reduce<Record<string, number>>(
    (acc, q) => ({ ...acc, [q.pillar]: (acc[q.pillar] || 0) + 1 }),
    {}
  );

  // Sort unanswered by disclosure weight per question (pillar weight ÷ question count in that pillar).
  const prioritized = [...unanswered].sort((a, b) => {
    const wA = (PILLAR_WEIGHTS[a.pillar] ?? 0) / (pillarCounts[a.pillar] ?? 1);
    const wB = (PILLAR_WEIGHTS[b.pillar] ?? 0) / (pillarCounts[b.pillar] ?? 1);
    return wB - wA;
  });

  // Closing gaps completes the disclosure — which lets the bank trust the
  // performance score. It does not mechanically "add points" (the score
  // reflects actual performance, which is only revealed once answered).
  const completeness = progress.completion_pct;
  const currentGrade = scoreGrade(progress.overall_esg_score);

  return (
    <div className="space-y-6 animate-atlas-in">
      {/* Header */}
      <div>
        <Button variant="ghost" onClick={() => navigate(`/w/${workspaceId}`)} className="mb-4 px-2 -ml-2 text-text-secondary">
          <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span> Back to hub
        </Button>
        <h1 className="text-[22px] font-extrabold text-text-primary tracking-tight">ESG Gap Analysis</h1>
        <p className="text-[13px] text-text-secondary mt-1">
          Complete the remaining {unanswered.length} question{unanswered.length !== 1 ? "s" : ""} so banks can fully trust your ESG performance score.
        </p>
      </div>

      {/* Score overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Performance score */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-5">
          <ScoreArc score={progress.overall_esg_score} size={88} />
          <div>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">ESG performance</p>
            <p className="text-[16px] font-bold text-gray-900 mt-0.5">
              Grade {currentGrade.letter}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              how sustainable your business is
            </p>
          </div>
        </div>

        {/* Disclosure completeness */}
        <div className="bg-white rounded-2xl border border-atlas-200 shadow-sm p-5 flex items-center gap-5 ring-1 ring-atlas-100">
          <ScoreArc score={completeness} size={88} />
          <div>
            <p className="text-[11px] text-atlas-500 font-semibold uppercase tracking-wide">Disclosure completeness</p>
            <p className="text-[16px] font-bold text-gray-900 mt-0.5">
              {progress.approved}/{progress.total_questions} answered
            </p>
            <p className="text-[11px] text-atlas-400 mt-1">
              {unanswered.length > 0 ? `${unanswered.length} left to reach 100%` : "fully disclosed"}
            </p>
          </div>
        </div>

        {/* Pillar breakdown */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2.5">
          <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-3">Pillar performance</p>
          {(["environmental", "social", "governance"] as const).map((pillar) => {
            const score = progress.pillar_scores?.[pillar] ?? 0;
            const unansweredInPillar = unanswered.filter((q) => q.pillar === pillar).length;
            const c = PILLAR_COLORS[pillar];
            return (
              <div key={pillar} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-gray-700 capitalize">{pillar}</span>
                  <span className="text-gray-500">
                    {score}/100 {unansweredInPillar > 0 && <span className="text-red-400 font-semibold">({unansweredInPillar} missing)</span>}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full ${c.bar} rounded-full transition-all`} style={{ width: `${score}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unanswered questions — priority list */}
      {prioritized.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900">Priority actions</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Sorted by score impact — highest first</p>
            </div>
            <Button
              onClick={() => navigate(`/w/${workspaceId}/collect`)}
              className="text-[12px]"
            >
              <span className="material-symbols-outlined text-[16px]">quiz</span>
              Continue interview
            </Button>
          </div>

          <div className="divide-y divide-gray-50">
            {prioritized.map((q, idx) => {
              const c = PILLAR_COLORS[q.pillar];
              return (
                <div key={q.id} className="px-6 py-4 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-gray-500">{idx + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}>
                        <span className="material-symbols-outlined text-[11px]">{PILLAR_ICONS[q.pillar]}</span>
                        {q.category}
                      </span>
                      <span className="text-[10px] font-bold text-atlas-600 bg-atlas-50 border border-atlas-200 rounded-full px-2 py-0.5">
                        bank-relevant
                      </span>
                    </div>
                    <p className="text-[13px] font-semibold text-gray-900 leading-snug">{q.question_text}</p>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{q.bank_relevance}</p>
                  </div>

                  <button
                    onClick={() => navigate(`/w/${workspaceId}/collect?q=${q.id}`)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-atlas-600 hover:text-atlas-700 bg-atlas-50 hover:bg-atlas-100 border border-atlas-200 rounded-lg px-3 py-2 transition-colors shrink-0"
                  >
                    Answer
                    <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Already answered */}
      {answered.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-[14px] font-bold text-gray-900">Completed ({answered.length})</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {answered.map((q) => {
              const c = PILLAR_COLORS[q.pillar];
              return (
                <div key={q.id} className="px-6 py-3 flex items-center gap-4">
                  <span className="material-symbols-outlined text-emerald-500 text-[20px] shrink-0">check_circle</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}>
                        <span className="material-symbols-outlined text-[11px]">{PILLAR_ICONS[q.pillar]}</span>
                        {q.category}
                      </span>
                    </div>
                    <p className="text-[12px] font-medium text-gray-700 leading-snug truncate">{q.question_text}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/w/${workspaceId}/collect?q=${q.id}`)}
                    className="text-[11px] text-gray-400 hover:text-atlas-600 font-medium transition-colors shrink-0"
                  >
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All done */}
      {unanswered.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <span className="material-symbols-outlined text-emerald-500 text-[40px] mb-3 block">verified</span>
          <h2 className="text-[16px] font-bold text-emerald-800">All questions answered!</h2>
          <p className="text-[13px] text-emerald-600 mt-1 mb-4">
            Your ESG score is {progress.overall_esg_score}/100. Ready to share with banks.
          </p>
          <Button onClick={() => navigate(`/w/${workspaceId}/bank-access`)}>
            <span className="material-symbols-outlined text-[16px]">account_balance</span>
            Share with bank
          </Button>
        </div>
      )}
    </div>
  );
}
