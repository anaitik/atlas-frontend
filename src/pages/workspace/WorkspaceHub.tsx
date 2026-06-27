import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { InlineAlert } from "../../components/ui/InlineAlert";
import { PublishReadinessCard } from "../../components/ui/PublishReadinessCard";
import { Stepper } from "../../components/ui/Stepper";
import { Tabs } from "../../components/ui/Tabs";
import { TraceabilityRing } from "../../components/ui/TraceabilityRing";
import { EvidenceMap } from "../../components/trust/EvidenceMap";
import { copy } from "../../lib/copy";
import { apiClient } from "../../lib/api-client";
import { fetchHubSnapshot, formatDueLabel, type HubSnapshot } from "../../lib/workspace-hub";
import { useWorkspaceStore } from "../../store/workspace";

// ─── Types ────────────────────────────────────────────────────────────────────

type Disclosure = {
  id: string;
  standard: string;
  topic: string;
  title: string;
  pillar: string;
  obligation_status: string;
  data_status: string;
  metric_codes: string[];
  description: string;
  input_guidance: string;
  deferred: boolean;
};

type PillarCompletion = {
  required: number;
  complete: number;
  partial: number;
  not_started: number;
  pct: number;
};

type ComplianceMap = {
  workspace_id: string;
  csrd_phase: number | null;
  total_required: number;
  total_complete: number;
  total_partial: number;
  total_not_started: number;
  completion_pct: number;
  disclosures: Disclosure[];
  profile_complete: boolean;
  profile_missing_fields: string[];
  pillar_completion: Record<string, PillarCompletion>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PILLAR_COLORS: Record<string, string> = {
  environmental: "text-emerald-700 bg-emerald-50 border-emerald-200",
  social: "text-blue-700 bg-blue-50 border-blue-200",
  governance: "text-indigo-700 bg-indigo-50 border-indigo-200",
};

const PILLAR_BAR: Record<string, string> = {
  environmental: "bg-emerald-500",
  social: "bg-blue-500",
  governance: "bg-indigo-500",
};

const DATA_STATUS_CONFIG: Record<string, { label: string; icon: string; cls: string }> = {
  complete: { label: "Complete", icon: "check_circle", cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  partial: { label: "Partial", icon: "pending", cls: "text-amber-700 bg-amber-50 border-amber-200" },
  not_started: { label: "Not started", icon: "radio_button_unchecked", cls: "text-text-muted bg-surface-secondary border-border" },
};

const OBLIGATION_CONFIG: Record<string, { label: string; cls: string }> = {
  mandatory: { label: "Required", cls: "text-red-700 bg-red-50 border-red-200" },
  deferred: { label: "Deferred", cls: "text-amber-700 bg-amber-50 border-amber-200" },
  conditional: { label: "Conditional", cls: "text-blue-700 bg-blue-50 border-blue-200" },
  not_applicable: { label: "N/A", cls: "text-text-muted bg-surface-secondary border-border" },
  unknown: { label: "Unknown", cls: "text-text-muted bg-surface-secondary border-border" },
};

function ComplianceMapTab({
  companyId,
  workspaceId,
  onNavigate,
}: {
  companyId: string;
  workspaceId: string;
  onNavigate: (path: string) => void;
}) {
  const [map, setMap] = useState<ComplianceMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePillar, setActivePillar] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient<ComplianceMap>(`/companies/${companyId}/workspaces/${workspaceId}/compliance-map`)
      .then(setMap)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyId, workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted text-[13px]">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Building compliance map…
      </div>
    );
  }

  if (!map) return null;

  const pillars = ["environmental", "social", "governance"];
  const displayed = activePillar === "all"
    ? map.disclosures.filter((d) => d.obligation_status !== "not_applicable")
    : map.disclosures.filter((d) => d.pillar === activePillar && d.obligation_status !== "not_applicable");

  return (
    <div className="space-y-5">
      {/* Profile incomplete banner */}
      {!map.profile_complete && (
        <InlineAlert variant="warning">
          <span className="font-semibold">Complete your company profile</span> to unlock your full compliance map.{" "}
          Missing: {map.profile_missing_fields.join(", ")}.{" "}
          <button
            className="underline font-semibold ml-1"
            onClick={() => onNavigate(`/c/${companyId}/workspaces/${workspaceId}/profile`)}
          >
            Update profile →
          </button>
        </InlineAlert>
      )}

      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <div className="text-[28px] font-bold text-atlas-600">{map.completion_pct}%</div>
          <div className="text-[11px] text-text-muted font-semibold uppercase tracking-wide mt-1">Complete</div>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <div className="text-[28px] font-bold text-text-primary">{map.total_required}</div>
          <div className="text-[11px] text-text-muted font-semibold uppercase tracking-wide mt-1">Required</div>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <div className="text-[28px] font-bold text-emerald-600">{map.total_complete}</div>
          <div className="text-[11px] text-text-muted font-semibold uppercase tracking-wide mt-1">Done</div>
        </div>
        <div className="bg-white rounded-xl border border-border p-4 text-center">
          <div className="text-[28px] font-bold text-amber-500">{map.total_not_started}</div>
          <div className="text-[11px] text-text-muted font-semibold uppercase tracking-wide mt-1">To do</div>
        </div>
      </div>

      {/* Pillar progress bars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {pillars.map((p) => {
          const ps = map.pillar_completion[p];
          if (!ps || ps.required === 0) return null;
          return (
            <div key={p} className="bg-white rounded-xl border border-border p-4">
              <div className="flex justify-between mb-2">
                <span className="text-[12px] font-bold text-text-primary capitalize">{p}</span>
                <span className="text-[12px] font-bold text-text-primary">{ps.pct}%</span>
              </div>
              <div className="h-2 bg-surface-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${PILLAR_BAR[p]}`}
                  style={{ width: `${ps.pct}%` }}
                />
              </div>
              <p className="text-[11px] text-text-muted mt-1.5">{ps.complete}/{ps.required} disclosures</p>
            </div>
          );
        })}
      </div>

      {/* Pillar filter */}
      <div className="flex p-1 bg-surface-secondary rounded-xl border border-border w-fit">
        {["all", ...pillars].map((p) => (
          <button
            key={p}
            onClick={() => setActivePillar(p)}
            className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
              activePillar === p
                ? "bg-white text-atlas-600 shadow-sm border border-border"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            {p === "all" ? "All" : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* Disclosure list */}
      <div className="space-y-2">
        {displayed.length === 0 && (
          <div className="py-12 text-center text-text-muted text-[13px]">No disclosures for this filter.</div>
        )}
        {displayed.map((d) => {
          const ds = DATA_STATUS_CONFIG[d.data_status] || DATA_STATUS_CONFIG.not_started;
          const obs = OBLIGATION_CONFIG[d.obligation_status] || OBLIGATION_CONFIG.unknown;
          const pillarStyle = PILLAR_COLORS[d.pillar] || PILLAR_COLORS.governance;
          const isExpanded = expandedId === d.id;

          return (
            <div
              key={d.id}
              className={`bg-white rounded-xl border transition-all ${
                isExpanded ? "border-atlas-300 shadow-md" : "border-border hover:border-atlas-200"
              }`}
            >
              <button
                className="w-full text-left px-4 py-3.5 flex items-center gap-3"
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
              >
                {/* Status icon */}
                <span className={`material-symbols-outlined text-[20px] flex-shrink-0 ${
                  d.data_status === "complete" ? "text-emerald-500" :
                  d.data_status === "partial" ? "text-amber-500" : "text-slate-300"
                }`}>
                  {ds.icon}
                </span>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-bold text-text-muted">{d.standard}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pillarStyle}`}>
                      {d.pillar.charAt(0).toUpperCase() + d.pillar.slice(1)}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-text-primary leading-tight truncate">{d.title}</p>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${obs.cls}`}>
                    {obs.label}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ds.cls}`}>
                    {ds.label}
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-text-muted">
                    {isExpanded ? "expand_less" : "expand_more"}
                  </span>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-border-light space-y-3">
                  <p className="text-[12px] text-text-secondary">{d.description}</p>
                  <div className="bg-atlas-50 rounded-lg p-3 border border-atlas-100">
                    <p className="text-[11px] font-bold text-atlas-700 mb-1">How to provide data</p>
                    <p className="text-[12px] text-atlas-600">{d.input_guidance}</p>
                  </div>
                  {d.deferred && (
                    <div className="flex items-center gap-2 text-amber-600 text-[12px]">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      Deferred for first-time reporters — required from next reporting year.
                    </div>
                  )}
                  <div className="flex gap-2">
                    {d.metric_codes.length > 0 && (
                      <Button
                        className="text-[11px] px-3 py-1.5 h-auto"
                        onClick={() => onNavigate(`/w/${workspaceId}/metrics`)}
                      >
                        <span className="material-symbols-outlined text-[14px]">bar_chart</span>
                        View metrics
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="text-[11px] px-3 py-1.5 h-auto"
                      onClick={() => onNavigate(`/w/${workspaceId}/documents`)}
                    >
                      <span className="material-symbols-outlined text-[14px]">upload_file</span>
                      Upload evidence
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface AtlasScore {
  performance_score: number | null;
  grade: string;
  completeness_score: number;
  data_trust_score: number;
  provisional: boolean;
  pillar_performance: Record<string, number | null>;
  pillar_completeness: Record<string, number>;
  flags: Array<{ severity: "critical" | "warn" | "info"; code: string; message: string }>;
}

interface InterviewProgress {
  total_questions: number;
  approved: number;
  completion_pct: number;
  overall_esg_score: number;
  data_quality_score: number;
  atlas_score?: AtlasScore | null;
}

// ─── ESG Score Tab ────────────────────────────────────────────────────────────

const PILLAR_RING_COLORS: Record<string, string> = {
  environmental: "#10b981",
  social: "#3b82f6",
  governance: "#8b5cf6",
};

function PillarRing({ score, pillar, size = 72 }: { score: number | null; pillar: string; size?: number }) {
  const r = size / 2 - 5;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const color = PILLAR_RING_COLORS[pillar] || "#6b7280";
  const offset = score === null ? circumference : circumference - (score / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f3f4f6" strokeWidth="5" />
      {score !== null && (
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={`${offset}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      )}
      <text x={cx} y={cy + 5} textAnchor="middle" fill={score === null ? "#d1d5db" : color}
            fontSize={score === null ? "13" : "15"} fontWeight="800" fontFamily="system-ui,sans-serif">
        {score === null ? "—" : score}
      </text>
    </svg>
  );
}

function EsgScoreTab({
  workspaceId,
  onNavigate,
}: {
  workspaceId: string;
  onNavigate: (path: string) => void;
}) {
  const [progress, setProgress] = useState<InterviewProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient<any>(`/interview/workspace/${workspaceId}/progress`)
      .then((res: any) => {
        const d = res?.data ?? res;
        if (d && typeof d.total_questions === "number") setProgress(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted text-[13px]">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Loading ESG score…
      </div>
    );
  }

  if (!progress || progress.total_questions === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center space-y-3">
        <span className="material-symbols-outlined text-[40px] text-gray-300 block">analytics</span>
        <p className="text-[14px] font-semibold text-gray-500">No ESG data yet</p>
        <p className="text-[12px] text-gray-400">Complete the ESG interview to generate your score.</p>
        <button
          onClick={() => onNavigate(`/w/${workspaceId}/collect`)}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-white bg-atlas-600 hover:bg-atlas-500 rounded-lg px-4 py-2 transition-colors mt-2"
        >
          <span className="material-symbols-outlined text-[16px]">quiz</span>
          Start ESG interview
        </button>
      </div>
    );
  }

  const s = progress.atlas_score;
  const perf = s?.performance_score ?? progress.overall_esg_score;
  const isComplete = progress.completion_pct === 100;
  const criticalFlags = (s?.flags || []).filter((f) => f.severity === "critical");
  const warnFlags = (s?.flags || []).filter((f) => f.severity === "warn");

  const gradeClass = (score: number) =>
    score >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : score >= 60 ? "text-blue-700 bg-blue-50 border-blue-200"
    : score >= 40 ? "text-amber-700 bg-amber-50 border-amber-200"
    : "text-red-600 bg-red-50 border-red-100";

  return (
    <div className="space-y-5">
      {/* Score hero */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Score number */}
          <div className={`flex flex-col items-center px-6 py-4 rounded-xl border shrink-0 ${gradeClass(perf)}`}>
            <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">Atlas ESG Score</span>
            <span className="text-[44px] font-black leading-none mt-1">{perf || "—"}</span>
            <span className="text-[12px] font-bold mt-1 opacity-80">
              Grade {s?.grade || (perf >= 80 ? "A" : perf >= 60 ? "B" : perf >= 40 ? "C" : perf >= 20 ? "D" : "E")}
            </span>
            {s?.provisional && (
              <span className="mt-1.5 text-[9px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                Provisional
              </span>
            )}
          </div>

          {/* Three sub-scores */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-center">
              <p className="text-[26px] font-black text-emerald-600 leading-none">{perf || "—"}</p>
              <p className="text-[11px] font-bold text-gray-600 mt-1.5">Performance</p>
              <p className="text-[10px] text-gray-400 mt-0.5">actual sustainability</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-center">
              <p className="text-[26px] font-black text-blue-600 leading-none">
                {s?.completeness_score ?? progress.completion_pct}%
              </p>
              <p className="text-[11px] font-bold text-gray-600 mt-1.5">Disclosure</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{progress.approved}/{progress.total_questions} answered</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 text-center">
              <p className="text-[26px] font-black text-indigo-600 leading-none">
                {s?.data_trust_score ?? progress.data_quality_score}%
              </p>
              <p className="text-[11px] font-bold text-gray-600 mt-1.5">Data Trust</p>
              <p className="text-[10px] text-gray-400 mt-0.5">confidence + checks</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pillar rings */}
      <div className="grid grid-cols-3 gap-4">
        {(["environmental", "social", "governance"] as const).map((pillar) => {
          const pScore = s ? (s.pillar_performance?.[pillar] ?? null) : null;
          const cov = s?.pillar_completeness?.[pillar];
          const LABELS: Record<string, string> = { environmental: "Environmental", social: "Social", governance: "Governance" };
          return (
            <div key={pillar} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col items-center gap-2">
              <PillarRing score={pScore} pillar={pillar} size={72} />
              <div className="text-center">
                <p className="text-[12px] font-bold text-gray-700">{LABELS[pillar]}</p>
                {cov !== undefined && (
                  <p className="text-[10px] text-gray-400">{cov}% reported</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Flags */}
      {(criticalFlags.length > 0 || warnFlags.length > 0) && (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Underwriting flags</p>
          {criticalFlags.map((f, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-xl border px-4 py-2.5 bg-red-50 border-red-200 text-red-700">
              <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">error</span>
              <p className="text-[12px] font-medium leading-snug">{f.message}</p>
            </div>
          ))}
          {warnFlags.map((f, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-xl border px-4 py-2.5 bg-amber-50 border-amber-200 text-amber-700">
              <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">warning</span>
              <p className="text-[12px] font-medium leading-snug">{f.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-wrap gap-3">
        {isComplete ? (
          <button
            onClick={() => onNavigate(`/w/${workspaceId}/bank-access`)}
            className="flex items-center gap-1.5 text-[13px] font-bold text-white bg-atlas-600 hover:bg-atlas-500 rounded-xl px-5 py-2.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
            Share with bank
          </button>
        ) : (
          <button
            onClick={() => onNavigate(`/w/${workspaceId}/collect`)}
            className="flex items-center gap-1.5 text-[13px] font-bold text-white bg-atlas-600 hover:bg-atlas-500 rounded-xl px-5 py-2.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">quiz</span>
            {progress.approved === 0 ? "Start ESG interview" : "Continue interview"}
          </button>
        )}
        {progress.approved > 0 && (
          <button
            onClick={() => onNavigate(`/w/${workspaceId}/gap-analysis`)}
            className="flex items-center gap-1.5 text-[13px] font-bold text-gray-600 border border-gray-200 hover:border-atlas-300 hover:text-atlas-700 rounded-xl px-5 py-2.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">track_changes</span>
            Gap analysis
          </button>
        )}
      </div>

      <p className="text-[11px] text-gray-400 leading-relaxed">
        Performance score reflects actual sustainability benchmarked against sector peers—not just how many questions you answered.
        Answering more questions improves <em>disclosure completeness</em>, which lets banks trust the performance number.
      </p>
    </div>
  );
}

// ─── Interview Banner ─────────────────────────────────────────────────────────

function InterviewBanner({
  workspaceId,
  onNavigate,
}: {
  workspaceId: string;
  onNavigate: (path: string) => void;
}) {
  const [progress, setProgress] = useState<InterviewProgress | null>(null);

  useEffect(() => {
    apiClient<any>(`/interview/workspace/${workspaceId}/progress`)
      .then((res: any) => {
        const d = res?.data ?? res;
        if (d && typeof d.total_questions === "number") setProgress(d);
      })
      .catch(() => {});
  }, [workspaceId]);

  if (!progress) return null;

  const isComplete = progress.completion_pct === 100;

  return (
    <div
      className={`rounded-2xl border p-4 flex items-center gap-4 transition-all ${
        isComplete
          ? "bg-emerald-50 border-emerald-200"
          : "bg-atlas-900 border-atlas-700"
      }`}
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isComplete ? "bg-emerald-500" : "bg-atlas-600"
        }`}
      >
        <span className="material-symbols-outlined text-white text-[20px]">
          {isComplete ? "check_circle" : "quiz"}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className={`text-[13px] font-bold ${isComplete ? "text-emerald-800" : "text-white"}`}>
            ESG Interview{isComplete && " — Complete"}
          </p>
          <p className={`text-[12px] font-semibold shrink-0 ml-3 ${isComplete ? "text-emerald-700" : "text-atlas-300"}`}>
            {progress.approved}/{progress.total_questions}
          </p>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden ${isComplete ? "bg-emerald-200" : "bg-atlas-700"}`}>
          <div
            className={`h-full rounded-full transition-all ${isComplete ? "bg-emerald-500" : "bg-atlas-400"}`}
            style={{ width: `${progress.completion_pct}%` }}
          />
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-3">
        {progress.overall_esg_score > 0 && (
          <div className={`text-center px-3 py-1.5 rounded-lg border ${
            isComplete
              ? "bg-emerald-100 border-emerald-300"
              : "bg-atlas-800 border-atlas-600"
          }`}>
            <p className={`text-[18px] font-black leading-none ${isComplete ? "text-emerald-700" : "text-atlas-200"}`}>
              {progress.overall_esg_score}
            </p>
            <p className={`text-[9px] font-bold mt-0.5 ${isComplete ? "text-emerald-500" : "text-atlas-400"}`}>
              ESG
            </p>
          </div>
        )}
        {isComplete ? (
          <button
            onClick={() => onNavigate(`/w/${workspaceId}/bank-access`)}
            className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 rounded-lg px-3 py-2 transition-all"
          >
            <span className="material-symbols-outlined text-[15px]">account_balance</span>
            Share with bank
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {progress.approved > 0 && (
              <button
                onClick={() => onNavigate(`/w/${workspaceId}/gap-analysis`)}
                className="flex items-center gap-1.5 text-[12px] font-bold text-atlas-300 hover:text-white border border-atlas-600 hover:border-atlas-400 rounded-lg px-3 py-2 transition-all"
              >
                <span className="material-symbols-outlined text-[13px]">track_changes</span>
                Gap analysis
              </button>
            )}
            <button
              onClick={() => onNavigate(`/w/${workspaceId}/collect`)}
              className="flex items-center gap-1.5 text-[12px] font-bold text-white bg-atlas-500 hover:bg-atlas-400 rounded-lg px-3 py-2 transition-all"
            >
              {progress.approved === 0 ? "Start interview" : "Continue"}
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WorkspaceHub() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { activeCompanyId, setActiveWorkspace } = useWorkspaceStore();
  const [hub, setHub] = useState<HubSnapshot | null>(null);
  const [dueLabel, setDueLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("esg");
  const [reportPreview, setReportPreview] = useState<{ percent: number; status: string | null }>({ percent: 0, status: null });

  useEffect(() => {
    if (!workspaceId || !activeCompanyId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const snapshot = await fetchHubSnapshot(workspaceId, activeCompanyId);
        setActiveWorkspace(workspaceId, snapshot.workspaceName);
        setDueLabel(formatDueLabel(snapshot.workspaceDescription));
        setHub(snapshot);
        setReportPreview({ percent: snapshot.reportDraftPercent, status: snapshot.reportStatus });
      } catch (e: any) {
        setError(e?.message || "Failed to load reporting period.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [workspaceId, activeCompanyId, setActiveWorkspace]);

  useEffect(() => {
    if (activeTab !== "report" || !workspaceId || !activeCompanyId) return;
    apiClient(`/reports?company_id=${activeCompanyId}&workspace_id=${workspaceId}`)
      .then((reports: any) => {
        const list = Array.isArray(reports) ? reports : [];
        const r = list.find((x: any) => x.status !== "archived") || list[0];
        if (!r) return;
        const sections = r.sections ? Object.values(r.sections) : [];
        const filled = sections.filter((s: any) => s?.content && String(s.content).length > 20).length;
        setReportPreview({ percent: sections.length ? Math.round((filled / sections.length) * 100) : 0, status: r.status });
      })
      .catch(() => {});
  }, [activeTab, workspaceId, activeCompanyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted text-[13px]">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Loading reporting period…
      </div>
    );
  }

  if (error || !hub) {
    return (
      <InlineAlert variant="danger">
        {error || "Unable to load this reporting period."}
        {activeCompanyId && (
          <button type="button" className="ml-2 underline font-semibold" onClick={() => navigate(`/c/${activeCompanyId}`)}>
            Back to organization home
          </button>
        )}
      </InlineAlert>
    );
  }

  const steps = [
    { id: "setup", label: copy.steps.setup, status: hub.stepStatuses.setup, detail: undefined },
    { id: "upload", label: copy.steps.upload, status: hub.stepStatuses.upload, detail: hub.uploadCount > 0 ? `${hub.uploadCount} files` : undefined },
    { id: "review", label: copy.steps.review, status: hub.stepStatuses.review, detail: hub.pendingReviewCount > 0 ? `${hub.pendingReviewCount} left` : undefined },
    { id: "publish", label: copy.steps.publish, status: hub.stepStatuses.publish, detail: hub.reportDraftPercent > 0 ? `${hub.reportDraftPercent}% draft` : undefined },
  ];

  const tabs = [
    { id: "esg", label: "ESG Score" },
    { id: "compliance", label: "Compliance Map" },
    { id: "readiness", label: copy.period.tabReadiness },
    { id: "documents", label: copy.period.tabDocuments },
    { id: "report", label: copy.period.tabReport },
    { id: "evidence", label: copy.period.tabEvidence },
  ];

  return (
    <div className="space-y-6 animate-atlas-in">
      {/* Hero banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-8 text-white"
        style={{
          background: "linear-gradient(135deg, #031a0c 0%, #052e16 40%, #0a3d1f 75%, #14532d 100%)",
          boxShadow: "0 18px 48px rgba(5,46,22,0.30)",
        }}
      >
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full" style={{ background: "radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%)" }} />
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold text-atlas-400 mb-1">{copy.period.hubTitle}</p>
            <h1 className="text-[24px] font-extrabold tracking-tight">{hub.workspaceName}</h1>
            <p className="text-[13px] text-atlas-300/80 mt-2">
              ESG assessment · {hub.reportDraftPercent > 0 ? `${hub.reportDraftPercent}% report drafted` : "complete your interview to generate your score"}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-[12px]">
              {dueLabel && <span className="text-atlas-300">{copy.period.dueLabel}: {dueLabel}</span>}
              <span className={`px-2.5 py-0.5 rounded-full font-semibold ${
                hub.trackStatus === "on_track" ? "bg-atlas-500/30 text-atlas-100" : "bg-amber-500/30 text-amber-100"
              }`}>
                {hub.trackStatus === "on_track" ? copy.period.onTrack : copy.period.atRisk}
              </span>
            </div>
          </div>
          <TraceabilityRing value={hub.traceabilityScore} label={copy.period.traceability} size={100} />
        </div>
        <div className="relative z-10 flex flex-wrap gap-2 mt-6">
          <Button className="bg-atlas-500 hover:bg-atlas-400 text-white" onClick={() => navigate(hub.primaryCta.path)}>
            {hub.primaryCta.label}
          </Button>
          <Button variant="outline" className="border-atlas-400/40 text-atlas-100 hover:bg-atlas-800" onClick={() => navigate(`/w/${workspaceId}/report`)}>
            {copy.period.openReport}
          </Button>
        </div>
      </div>

      {workspaceId && (
        <InterviewBanner workspaceId={workspaceId} onNavigate={navigate} />
      )}

      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* ESG Score tab — primary deliverable for bank-loan use case */}
      {activeTab === "esg" && workspaceId && (
        <EsgScoreTab workspaceId={workspaceId} onNavigate={navigate} />
      )}

      {/* Compliance Map tab */}
      {activeTab === "compliance" && activeCompanyId && workspaceId && (
        <ComplianceMapTab companyId={activeCompanyId} workspaceId={workspaceId} onNavigate={navigate} />
      )}

      {/* Readiness tab */}
      {activeTab === "readiness" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="text-[14px] font-bold text-text-primary mb-4">{copy.period.readiness}</h2>
              <Stepper steps={steps} />
              <p className="text-[12px] text-text-secondary mt-4">
                {copy.period.evidenceComplete}: {hub.verifiedDocCount}/{hub.uploadCount || 0} documents secured
              </p>
            </Card>
            <PublishReadinessCard
              blockers={hub.blockers}
              primaryLabel={hub.primaryCta.label}
              onPrimary={() => navigate(hub.primaryCta.path)}
              secondaryLabel={copy.period.openReport}
              onSecondary={() => navigate(`/w/${workspaceId}/report`)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4">
              <p className="text-[11px] text-text-muted font-medium">Documents uploaded</p>
              <p className="text-[22px] font-bold text-text-primary mt-1">{hub.uploadCount}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-text-muted font-medium">Awaiting review</p>
              <p className="text-[22px] font-bold text-text-primary mt-1">{hub.pendingReviewCount}</p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-text-muted font-medium">Report draft</p>
              <p className="text-[22px] font-bold text-atlas-600 mt-1">{hub.reportDraftPercent}%</p>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "documents" && (
        <Card className="p-6">
          <p className="text-[13px] text-text-secondary mb-4">
            {hub.uploadCount === 0
              ? "No documents yet. Upload source files to begin building your report."
              : `${hub.uploadCount} document${hub.uploadCount > 1 ? "s" : ""} uploaded · ${hub.pendingReviewCount} awaiting review.`}
          </p>
          <Button onClick={() => navigate(`/w/${workspaceId}/documents`)}>{copy.period.uploadDocuments}</Button>
        </Card>
      )}

      {activeTab === "report" && (
        <Card className="p-6">
          <p className="text-[13px] text-text-secondary mb-2">
            Report draft: <strong className="text-atlas-600">{reportPreview.percent}%</strong>
            {reportPreview.status && ` · Status: ${reportPreview.status}`}
          </p>
          <Button onClick={() => navigate(`/w/${workspaceId}/report`)}>{copy.period.openReport}</Button>
        </Card>
      )}

      {activeTab === "evidence" && (
        <div className="space-y-4">
          <EvidenceMap
            rows={[{ id: "trace", metricLabel: copy.period.traceability, value: `${hub.traceabilityScore}%`, status: hub.traceabilityScore >= 80 ? "verified" : "pending" }]}
            title={copy.trust.verificationSummary}
          />
          <Button variant="ghost" onClick={() => navigate(`/w/${workspaceId}/evidence`)}>
            {copy.trust.evidenceTrail}
          </Button>
        </div>
      )}

      {activeCompanyId && (
        <Button variant="ghost" onClick={() => navigate(`/c/${activeCompanyId}`)}>
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Organization home
        </Button>
      )}
    </div>
  );
}
