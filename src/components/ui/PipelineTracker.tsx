/**
 * PipelineTracker — Animated horizontal pipeline visualization.
 * Shows the 5-stage ESG data pipeline with live status indicators.
 */

export type PipelineStageStatus = "idle" | "processing" | "done" | "error";

type Stage = {
  id: string;
  label: string;
  icon: string;
  description: string;
  status: PipelineStageStatus;
};

interface PipelineTrackerProps {
  stages: Stage[];
  className?: string;
}

function StageConnector({ status }: { status: "idle" | "active" | "done" }) {
  return (
    <div className="flex-1 flex items-center px-1 min-w-[32px]">
      <div className={`h-[2px] w-full rounded-full transition-all duration-500 ${
        status === "done"
          ? "bg-atlas-400"
          : status === "active"
          ? "bg-gradient-to-r from-atlas-400 to-border"
          : "bg-border"
      }`}>
        {status === "active" && (
          <div className="h-full w-1/2 bg-atlas-400 rounded-full animate-progress-flow" />
        )}
      </div>
    </div>
  );
}

export function PipelineTracker({ stages, className = "" }: PipelineTrackerProps) {
  return (
    <div className={`bg-surface border border-border rounded-xl p-6 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[13px] font-bold text-text-primary">Data Pipeline Status</h3>
          <p className="text-[11px] text-text-muted mt-0.5">Document → Blockchain → AI → Review → Metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            {stages.filter(s => s.status === "done").length}/{stages.length} Complete
          </span>
        </div>
      </div>

      <div className="flex items-center">
        {stages.map((stage, i) => {
          const isLast = i === stages.length - 1;
          const nextStage = stages[i + 1];
          const connectorStatus =
            stage.status === "done" && nextStage?.status !== "idle"
              ? "done"
              : stage.status === "done" || stage.status === "processing"
              ? "active"
              : "idle";

          return (
            <div key={stage.id} className="contents">
              <div className="flex flex-col items-center gap-2 min-w-[72px]">
                {/* Stage dot */}
                <div className={`pipeline-dot ${stage.status} ${
                  stage.status === "processing" ? "animate-chain-pulse" : ""
                }`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {stage.status === "done"
                      ? "check"
                      : stage.status === "error"
                      ? "error"
                      : stage.status === "processing"
                      ? "progress_activity"
                      : stage.icon}
                  </span>
                </div>

                {/* Label */}
                <div className="text-center">
                  <p className={`text-[11px] font-bold leading-tight ${
                    stage.status === "done"
                      ? "text-atlas-600"
                      : stage.status === "processing"
                      ? "text-info"
                      : stage.status === "error"
                      ? "text-danger"
                      : "text-text-muted"
                  }`}>
                    {stage.label}
                  </p>
                  <p className="text-[9px] text-text-muted mt-0.5 max-w-[80px] leading-tight">
                    {stage.description}
                  </p>
                </div>
              </div>

              {/* Connector */}
              {!isLast && <StageConnector status={connectorStatus} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Pre-built default pipeline stages for ESG document processing */
export function getDefaultPipelineStages(overrides?: Partial<Record<string, PipelineStageStatus>>): Stage[] {
  const stages: Stage[] = [
    { id: "upload", label: "Upload", icon: "upload_file", description: "Source doc", status: "idle" },
    { id: "fingerprint", label: "Fingerprint", icon: "fingerprint", description: "SHA-256", status: "idle" },
    { id: "anchor", label: "Anchor", icon: "shield", description: "Blockchain", status: "idle" },
    { id: "extract", label: "Extract", icon: "auto_awesome", description: "AI Agent", status: "idle" },
    { id: "review", label: "Review", icon: "verified", description: "Human-in-loop", status: "idle" },
  ];

  if (overrides) {
    for (const stage of stages) {
      if (overrides[stage.id]) {
        stage.status = overrides[stage.id]!;
      }
    }
  }

  return stages;
}
