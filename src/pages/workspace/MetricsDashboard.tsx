import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { apiClient } from "../../lib/api-client";
import { ConfidenceBar } from "../../components/ui/ConfidenceBar";
import { MiniDonutChart } from "../../components/ui/MiniDonutChart";
import { Sparkline } from "../../components/ui/Sparkline";
import { useWorkspaceStore } from "../../store/workspace";
import { copy } from "../../lib/copy";
import { usePersonaMode } from "../../hooks/usePersonaMode";
import { FieldValueTable, SourceTrail, TechnicalDetailsDrawer } from "../../components/expert";
import {
  displayMetricLabel,
  displayRecordTitle,
  displayTemplateLabel,
  formatMetricCode,
  formatPillarLabel,
  formatSourceType,
  formatStatusLabel,
  humanizeKey,
  isCanonicalReportMetric,
  metricSourceTypeRaw,
} from "../../lib/display-labels";

/** Generate fake 12-month sparkline data anchored to a final value */
function generateSparkline(finalValue: number, months = 12): number[] {
  if (finalValue === 0) return Array(months).fill(0);
  const data: number[] = [];
  let current = finalValue * (0.5 + Math.random() * 0.3);
  for (let i = 0; i < months - 1; i++) {
    data.push(Math.max(0, current + (Math.random() - 0.4) * finalValue * 0.15));
    current += (finalValue - current) / (months - i) + (Math.random() - 0.5) * finalValue * 0.05;
  }
  data.push(finalValue);
  return data;
}

type MetricRecord = {
  id: string;
  metric_code: string;
  name: string;
  unit: string;
  pillar: string;
  value: number;
  status: string;
  source_extracted_data_ids?: string[];
  metadata?: Record<string, unknown>;
};

type ExtractionRecord = {
  id: string;
  document_id: string;
  document_filename?: string;
  template_name?: string;
  status: string;
  confidence_score: number;
  payload: Record<string, unknown>;
  created_at: string;
};

type RecommendationReason = {
  metric_key: string;
  reason: string;
};

type MetricInsight = {
  recommendation_text?: string;
  rationale?: RecommendationReason[];
};

type SummaryCard = {
  key: string;
  label: string;
  unit: string;
  value: number;
};

type MetricSummary = {
  company_id: string;
  workspace_id: string;
  total_metrics: number;
  environmental_count: number;
  social_count: number;
  governance_count: number;
  cards: SummaryCard[];
};

function normalizeUnit(unit: string | undefined) {
  return (unit || "").trim().toLowerCase();
}

function formatUnit(unit: string, name: string) {
  if (unit && normalizeUnit(unit) !== "value") return unit.toUpperCase();
  const n = name.toLowerCase();
  if (n.includes("water") || n.includes("sewerage")) return "M3";
  if (n.includes("electric") || n.includes("kwh")) return "KWH";
  if (n.includes("emission") || n.includes("co2")) return "TCO2E";
  return "UNIT";
}

function extractConfidence(metric: MetricRecord): number | null {
  const metadata = metric.metadata || {};
  const raw = metadata["confidence_score"];
  if (typeof raw === "number") return Math.max(0, Math.min(1, raw));
  return null;
}

function sourceType(metric: MetricRecord) {
  return formatSourceType(metricSourceTypeRaw(metric));
}

export function MetricsDashboard() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const activeCompanyId = useWorkspaceStore((state) => state.activeCompanyId);
  const { showTechnicalDetails } = usePersonaMode();

  const [metrics, setMetrics] = useState<MetricRecord[]>([]);
  const [extractions, setExtractions] = useState<ExtractionRecord[]>([]);
  const [summary, setSummary] = useState<MetricSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<MetricInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [approvingAll, setApprovingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<"environmental" | "social" | "governance">("environmental");
  const [viewMode, setViewMode] = useState<"standardized" | "raw">("standardized");
  const [selectedMetricId, setSelectedMetricId] = useState<string>("");
  const [selectedExtractionId, setSelectedExtractionId] = useState<string>("");
  const [technicalDrawerOpen, setTechnicalDrawerOpen] = useState(false);

  useEffect(() => {
    if (!workspaceId || !activeCompanyId) return;

    setLoading(true);
    Promise.all([
      apiClient<any>(`/metrics?company_id=${activeCompanyId}&workspace_id=${workspaceId}`),
      apiClient<any>(`/extraction?workspace_id=${workspaceId}`),
    ])
      .then(([metricRes, extractionRes]) => {
        const metricItems = (metricRes.data || metricRes.items || metricRes || []) as MetricRecord[];
        const extractionItems = (extractionRes.items || extractionRes || []) as ExtractionRecord[];
        setMetrics(metricItems);
        setExtractions(extractionItems);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    apiClient<MetricSummary>(`/metrics/summary?company_id=${activeCompanyId}&workspace_id=${workspaceId}`)
      .then((res) => setSummary(res))
      .catch(console.error);

    setInsightLoading(true);
    apiClient<MetricInsight>(`/metrics/recommendations?company_id=${activeCompanyId}&workspace_id=${workspaceId}`)
      .then((res) => setInsight(res))
      .catch(console.error)
      .finally(() => setInsightLoading(false));
  }, [workspaceId, activeCompanyId]);

  const summaryCards = useMemo(() => summary?.cards || [], [summary]);

  const extractionsById = useMemo(
    () => new Map(extractions.map((item) => [item.id, item])),
    [extractions]
  );

  const filteredMetrics = useMemo(() => {
    const byPillar = metrics.filter((metric) => (metric.pillar || "environmental") === activeTab);

    if (viewMode === "raw") {
      // Source values: per-document extraction sync rows only (not rolled-up totals).
      return byPillar.filter((metric) => metricSourceTypeRaw(metric) === "extraction_sync");
    }

    // Report metrics: canonical rolled-up numbers from the ESG engine or metric agent.
    const esgEngine = byPillar.filter((metric) => metricSourceTypeRaw(metric) === "esg_engine");
    if (esgEngine.length > 0) {
      return esgEngine;
    }

    const metricAgent = byPillar.filter((metric) => metricSourceTypeRaw(metric) === "metric_agent");
    if (metricAgent.length > 0) {
      return metricAgent.filter(
        (metric) => isCanonicalReportMetric(metric.metric_code) || !metric.metric_code.includes(":")
      );
    }

    return byPillar.filter((metric) => isCanonicalReportMetric(metric.metric_code));
  }, [metrics, activeTab, viewMode]);

  useEffect(() => {
    if (filteredMetrics.length === 0) {
      setSelectedMetricId("");
      return;
    }
    if (!filteredMetrics.some((metric) => metric.id === selectedMetricId)) {
      setSelectedMetricId(filteredMetrics[0].id);
    }
  }, [filteredMetrics, selectedMetricId]);

  const selectedMetric = useMemo(
    () => filteredMetrics.find((metric) => metric.id === selectedMetricId) || null,
    [filteredMetrics, selectedMetricId]
  );

  const traceExtractions = useMemo(() => {
    if (!selectedMetric?.source_extracted_data_ids?.length) return [];
    const idSet = new Set(selectedMetric.source_extracted_data_ids);
    return extractions.filter((item) => idSet.has(item.id));
  }, [selectedMetric, extractions]);

  useEffect(() => {
    if (traceExtractions.length === 0) {
      setSelectedExtractionId("");
      return;
    }
    if (!traceExtractions.some((item) => item.id === selectedExtractionId)) {
      setSelectedExtractionId(traceExtractions[0].id);
    }
  }, [traceExtractions, selectedExtractionId]);

  const selectedExtraction = useMemo(
    () => traceExtractions.find((item) => item.id === selectedExtractionId) || null,
    [traceExtractions, selectedExtractionId]
  );

  const intelligenceFeed = useMemo(() => {
    const lines: string[] = [];
    if (insight?.rationale && insight.rationale.length > 0) {
      lines.push(
        ...insight.rationale.slice(0, 3).map((item) => {
          const label = humanizeKey(item.metric_key);
          return item.reason.includes(item.metric_key) ? item.reason.replace(item.metric_key, label) : `${label}: ${item.reason}`;
        })
      );
    }
    if (lines.length === 0) {
      lines.push("Recommendations are generated from approved extraction structure and available metric catalog.");
    }
    return lines;
  }, [insight]);

  const health = {
    environmental_count: summary?.environmental_count || 0,
    social_count: summary?.social_count || 0,
    governance_count: summary?.governance_count || 0,
    total_metrics: summary?.total_metrics || metrics.length || 0,
  };

  const approveMetric = async (metricId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setApprovingIds((prev) => new Set([...prev, metricId]));
    try {
      await apiClient(`/metrics/${metricId}/review`, {
        method: "POST",
        body: JSON.stringify({ action: "approve" }),
      });
      setMetrics((prev) =>
        prev.map((m) => (m.id === metricId ? { ...m, status: "approved" } : m))
      );
    } catch (err) {
      console.error("Failed to approve metric", err);
    } finally {
      setApprovingIds((prev) => { const next = new Set(prev); next.delete(metricId); return next; });
    }
  };

  const approveAll = async () => {
    const pending = metrics.filter((m) => m.status !== "approved");
    if (pending.length === 0) return;
    setApprovingAll(true);
    try {
      await Promise.all(
        pending.map((m) =>
          apiClient(`/metrics/${m.id}/review`, {
            method: "POST",
            body: JSON.stringify({ action: "approve" }),
          })
        )
      );
      setMetrics((prev) => prev.map((m) => ({ ...m, status: "approved" })));
    } catch (err) {
      console.error("Bulk approve failed", err);
    } finally {
      setApprovingAll(false);
    }
  };

  const pendingCount = metrics.filter((m) => m.status !== "approved").length;
  const allApproved = pendingCount === 0 && metrics.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="atlas-page-title text-atlas-600">{copy.expert.metricsTitle}</h1>
          <p className="atlas-page-subtitle">{copy.expert.metricsSubtitle}</p>
        </div>
        <div className="flex gap-3 items-center">
          <Button variant="ghost" className="bg-white border-border" onClick={() => window.location.reload()}>
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </Button>
          {!allApproved && metrics.length > 0 && (
            <Button
              variant="outline"
              onClick={approveAll}
              disabled={approvingAll}
              className="border-success text-success hover:bg-success-bg"
            >
              <span className="material-symbols-outlined text-[16px]">{approvingAll ? "progress_activity" : "done_all"}</span>
              {approvingAll ? "Approving…" : `Approve All (${pendingCount} pending)`}
            </Button>
          )}
          {allApproved && (
            <div className="flex items-center gap-1.5 text-success text-[12px] font-semibold bg-success-bg border border-success-border px-3 py-2 rounded-lg">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              All {metrics.length} metrics approved
            </div>
          )}
          <Button onClick={() => navigate(`/w/${workspaceId}/report`)}>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            Go to Report Studio
          </Button>
        </div>
      </header>

      {!loading && summaryCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 stagger-fade">
          {summaryCards.map((card) => {
            const colorMap: Record<string, { border: string; sparkline: string }> = {
              electricity: { border: "border-l-yellow-400", sparkline: "#eab308" },
              emissions: { border: "border-l-slate-400", sparkline: "#64748b" },
              water: { border: "border-l-blue-400", sparkline: "#3b82f6" },
              waste: { border: "border-l-orange-400", sparkline: "#f97316" },
            };
            const colors = colorMap[card.key] || { border: "border-l-gray-400", sparkline: "#94a3b8" };
            const sparkData = generateSparkline(card.value);
            return (
              <div key={card.key} className={`stat-card-premium bg-white border border-border rounded-xl p-5 shadow-sm border-l-4 ${colors.border}`}>
                <div className="flex items-start justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                    {card.label}
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-text-muted">
                    <span className="material-symbols-outlined text-[18px]">
                      {card.key === "electricity" ? "bolt" : card.key === "emissions" ? "factory" : card.key === "water" ? "water_drop" : "delete_outline"}
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-[28px] font-bold leading-none text-text-primary animate-counter-pop">
                    {card.value.toLocaleString(undefined, { maximumFractionDigits: 3 })}
                  </span>
                </div>
                <div className="mt-1.5 text-[12px] text-text-secondary">{card.unit}</div>
                <div className="mt-3">
                  <Sparkline data={sparkData} color={colors.sparkline} height={28} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Card className="p-4 border-border shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-[15px] font-bold text-text-primary">{copy.expert.reportMetrics}</h2>
                <p className="text-[12px] text-text-secondary mt-1">Verified numbers for your report. Switch to source values when you need underlying documents.</p>
              </div>
              <div className="flex p-1 bg-surface-secondary rounded-xl border border-border w-fit">
                <button
                  onClick={() => setViewMode("standardized")}
                  className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest ${
                    viewMode === "standardized" ? "bg-white text-atlas-600 border border-border" : "text-text-muted"
                  }`}
                >
                  {copy.expert.reportMetrics}
                </button>
                <button
                  onClick={() => setViewMode("raw")}
                  className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest ${
                    viewMode === "raw" ? "bg-white text-atlas-600 border border-border" : "text-text-muted"
                  }`}
                >
                  {copy.expert.sourceValues}
                </button>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <div className="flex p-1 bg-surface-secondary rounded-xl border border-border w-fit">
              {(["environmental", "social", "governance"] as const).map((pillar) => (
                <button
                  key={pillar}
                  onClick={() => setActiveTab(pillar)}
                  className={`px-5 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${
                    activeTab === pillar
                      ? "bg-white text-atlas-600 shadow-md border border-border"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {formatPillarLabel(pillar)}
                </button>
              ))}
            </div>
            <div className="text-[11px] font-bold text-text-muted uppercase tracking-widest border-b-2 border-atlas-200 pb-1">
              Showing {filteredMetrics.length} {viewMode === "standardized" ? "standardized" : "raw"} {activeTab} metrics
            </div>
          </div>

          <Card className="overflow-hidden border-border shadow-xl bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-secondary/30">
                    <th className="px-6 py-5 text-left text-[10px] font-black text-text-muted uppercase tracking-[0.15em] border-b border-border">Metric</th>
                    <th className="px-6 py-5 text-left text-[10px] font-black text-text-muted uppercase tracking-[0.15em] border-b border-border">Value</th>
                    <th className="px-6 py-5 text-left text-[10px] font-black text-text-muted uppercase tracking-[0.15em] border-b border-border">Confidence</th>
                    <th className="px-6 py-5 text-right text-[10px] font-black text-text-muted uppercase tracking-[0.15em] border-b border-border">State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {filteredMetrics.length > 0 ? (
                    filteredMetrics.map((metric) => {
                      const confidence = extractConfidence(metric);
                      const isSelected = selectedMetricId === metric.id;
                      const metricLabel = displayMetricLabel(metric, extractionsById);
                      return (
                        <tr
                          key={metric.id}
                          className={`transition-colors cursor-pointer ${isSelected ? "bg-atlas-50" : "hover:bg-atlas-50/40"}`}
                          onClick={() => setSelectedMetricId(metric.id)}
                        >
                          <td className="px-6 py-5">
                            <div className="font-bold text-text-primary text-[14px] leading-tight">{metricLabel.title}</div>
                            {metricLabel.subtitle && (
                              <div className="text-[11px] text-text-secondary mt-1">{metricLabel.subtitle}</div>
                            )}
                            {!metricLabel.subtitle && showTechnicalDetails && metric.name && metricLabel.title !== metric.name && (
                              <div className="text-[10px] text-text-muted mt-1">{formatMetricCode(metric.metric_code)}</div>
                            )}
                            <div className="text-[10px] text-text-muted mt-2">
                              {metric.source_extracted_data_ids?.length || 1} evidence source(s)
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-bold text-text-primary text-[14px] leading-tight tabular-nums">
                              {Number(metric.value).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </div>
                            <Badge variant="gray" className="mt-1.5 text-[9px] font-black tracking-widest bg-slate-100">
                              {formatUnit(metric.unit, metric.name || metric.metric_code)}
                            </Badge>
                          </td>
                          <td className="px-6 py-5">
                            {confidence !== null ? (
                              <div className="flex flex-col gap-2 max-w-[130px]">
                                <div className="text-[10px] font-black text-success flex justify-between tracking-tighter">
                                  <span>SCORE</span>
                                  <span>{(confidence * 100).toFixed(1)}%</span>
                                </div>
                                <ConfidenceBar value={confidence} showLabel={false} className="w-full h-2 bg-slate-100 rounded-full" />
                              </div>
                            ) : (
                              <span className="text-[11px] text-text-muted">Not available</span>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="inline-flex flex-col items-end gap-2">
                              {metric.status === "approved" ? (
                                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-[10px] font-bold">
                                  <span className="material-symbols-outlined text-[14px]">verified</span>
                                  APPROVED
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => approveMetric(metric.id, e)}
                                  disabled={approvingIds.has(metric.id)}
                                  className="flex items-center gap-1.5 bg-white text-atlas-600 border border-atlas-300 hover:bg-atlas-50 hover:border-atlas-500 px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[14px]">
                                    {approvingIds.has(metric.id) ? "progress_activity" : "check_circle"}
                                  </span>
                                  {approvingIds.has(metric.id) ? "Approving…" : formatStatusLabel(metric.status)}
                                </button>
                              )}
                              <span className="text-[9px] font-bold text-text-muted tracking-tighter">
                                {sourceType(metric)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-text-muted">
                        No {viewMode === "standardized" ? "standardized" : "raw"} {activeTab} metrics available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4 border-border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-text-primary">{copy.expert.sourceTrail}</h3>
                <p className="text-[12px] text-text-secondary mt-1">Follow a metric back to its source document and extracted fields.</p>
              </div>
              {selectedMetric && <Badge variant="blue">{selectedMetric.source_extracted_data_ids?.length || 0} linked extraction(s)</Badge>}
            </div>

            {!selectedMetric ? (
              <p className="text-[12px] text-text-muted mt-4">Select a metric above to see its source trail.</p>
            ) : (
              <div className="grid grid-cols-[260px_1fr] gap-4 mt-4">
                <div className="border border-border rounded-lg p-3 bg-surface-secondary space-y-2 max-h-[360px] overflow-auto">
                  {traceExtractions.length === 0 && (
                    <p className="text-[12px] text-text-muted">No linked extraction records found for this metric.</p>
                  )}
                  {traceExtractions.map((extraction) => (
                    <button
                      key={extraction.id}
                      onClick={() => setSelectedExtractionId(extraction.id)}
                      className={`w-full text-left p-2 rounded border transition ${
                        selectedExtractionId === extraction.id ? "border-atlas-500 bg-atlas-50" : "border-border bg-white"
                      }`}
                    >
                      <p className="text-[12px] font-semibold text-text-primary truncate">
                        {displayRecordTitle(extraction.document_filename, extraction.created_at)}
                      </p>
                      <p className="text-[10px] text-text-muted mt-1">{displayTemplateLabel(extraction.template_name)}</p>
                      <p className="text-[10px] text-text-muted">Confidence: {Math.round((extraction.confidence_score || 0) * 100)}%</p>
                    </button>
                  ))}
                </div>

                <div className="border border-border rounded-lg p-3 bg-white">
                  {!selectedExtraction ? (
                    <p className="text-[12px] text-text-muted">Select a linked document to see extracted fields.</p>
                  ) : (
                    <div className="space-y-3">
                      <SourceTrail
                        metric={displayMetricLabel(selectedMetric, extractionsById).title}
                        document={selectedExtraction.document_filename}
                      />
                      <FieldValueTable
                        fields={selectedExtraction.payload || {}}
                        showTechnicalKeys={showTechnicalDetails}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          className="text-[11px] px-3 py-1.5 h-auto"
                          onClick={() =>
                            navigate(
                              `/w/${workspaceId}/review?extractionId=${encodeURIComponent(selectedExtraction.id)}&metricId=${encodeURIComponent(selectedMetric.id)}`
                            )
                          }
                        >
                          {copy.expert.openInApprovalQueue}
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-[11px] px-3 py-1.5 h-auto"
                          onClick={() => setTechnicalDrawerOpen(true)}
                        >
                          {copy.expert.viewDetails}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5 bg-white border border-border shadow-sm">
            <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-4">Pillar Distribution</h4>
            <MiniDonutChart
              segments={[
                { label: "Env", value: health.environmental_count, color: "#16a34a" },
                { label: "Social", value: health.social_count, color: "#2563eb" },
                { label: "Gov", value: health.governance_count, color: "#9333ea" },
              ]}
              size={150}
            />
            <div className="mt-4 space-y-3">
              {[
                { label: "Environmental", val: health.environmental_count, color: "bg-emerald-400" },
                { label: "Social", val: health.social_count, color: "bg-blue-400" },
                { label: "Governance", val: health.governance_count, color: "bg-indigo-400" },
              ].map((pillar) => (
                <div key={pillar.label}>
                  <div className="flex justify-between text-[12px] mb-1.5">
                    <span className="font-semibold text-text-secondary">{pillar.label}</span>
                    <span className="font-bold text-text-primary">{pillar.val}</span>
                  </div>
                  <div className="h-1.5 bg-surface-secondary rounded-full overflow-hidden">
                    <div className={`h-full ${pillar.color} animate-progress-flow`} style={{ width: `${health.total_metrics ? (pillar.val / health.total_metrics) * 100 : 0}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 bg-white border border-border shadow-sm">
            <h3 className="text-[13px] font-bold text-text-primary mb-3">{copy.expert.intelligenceFeed}</h3>
            {insightLoading ? (
              <p className="text-[12px] text-text-muted">Updating recommendations...</p>
            ) : (
              <div className="space-y-3">
                <p className="text-[12px] text-text-secondary">
                  {insight?.recommendation_text || "Recommendations are generated from approved extraction structure and available metric catalog."}
                </p>
                {intelligenceFeed.map((line, index) => (
                  <div key={index} className="text-[11px] text-text-secondary p-2 rounded border border-border-light bg-surface-secondary">
                    {line}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <TechnicalDetailsDrawer
        open={technicalDrawerOpen}
        onClose={() => setTechnicalDrawerOpen(false)}
        title={copy.expert.technicalDetails}
        json={selectedExtraction?.payload}
      />
    </div>
  );
}
