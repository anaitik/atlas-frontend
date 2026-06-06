import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { EvidenceMap } from "../../components/trust/EvidenceMap";
import { apiClient } from "../../lib/api-client";
import { copy } from "../../lib/copy";
import { formatLineageMetricLabel, formatLineageSource } from "../../lib/display-labels";
import { fetchHubSnapshot } from "../../lib/workspace-hub";
import { useWorkspaceStore } from "../../store/workspace";
import { PipelineStory } from "./PipelineStory";

export function EvidencePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const activeCompanyId = useWorkspaceStore((s) => s.activeCompanyId);
  const [traceability, setTraceability] = useState(0);
  const [lineageRows, setLineageRows] = useState<
    { id: string; metricLabel: string; value?: string; status: "verified" | "pending"; source?: string }[]
  >([]);

  useEffect(() => {
    if (!workspaceId || !activeCompanyId) return;
    void fetchHubSnapshot(workspaceId, activeCompanyId).then((hub) => setTraceability(hub.traceabilityScore));

    apiClient(`/reports?company_id=${activeCompanyId}&workspace_id=${workspaceId}`)
      .then((reports: any) => {
        const list = Array.isArray(reports) ? reports : [];
        const report = list.find((r: any) => r.status !== "archived") || list[0];
        if (!report?.data_lineage?.length) return;
        setLineageRows(
          report.data_lineage.map((item: any, i: number) => ({
            id: String(i),
            metricLabel: formatLineageMetricLabel(item),
            value: item.value != null ? `${item.value} ${item.unit || ""}`.trim() : undefined,
            status: "verified" as const,
            source: formatLineageSource(item),
          }))
        );
      })
      .catch(() => {});
  }, [workspaceId, activeCompanyId]);

  return (
    <div className="space-y-6 animate-atlas-in">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="atlas-page-title text-atlas-600">{copy.evidence.title}</h1>
          <p className="atlas-page-subtitle">{copy.evidence.subtitle}</p>
        </div>
        <Button variant="ghost" onClick={() => navigate(`/w/${workspaceId}`)}>
          Back to period
        </Button>
      </header>

      <Card className="p-5 flex items-center gap-6">
        <div>
          <p className="text-[11px] font-medium text-text-muted uppercase tracking-wide">{copy.period.traceability}</p>
          <p className="text-[32px] font-bold text-atlas-600 tabular-nums">{traceability}%</p>
        </div>
        <p className="text-[13px] text-text-secondary flex-1">
          Percentage of disclosures with a secured source document and completed review.
        </p>
      </Card>

      {lineageRows.length > 0 && (
        <EvidenceMap rows={lineageRows} title={copy.trust.verificationSummary} />
      )}

      <PipelineStory embedded />
    </div>
  );
}
