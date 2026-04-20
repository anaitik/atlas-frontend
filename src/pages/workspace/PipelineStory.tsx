import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { apiClient } from "../../lib/api-client";
import { BlockchainBadge } from "../../components/ui/BlockchainBadge";
import { Badge } from "../../components/ui/Badge";

function formatTimestamp(value?: string) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

export function PipelineStory() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchStory = async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const result: any = await apiClient(`/story/${workspaceId}`);
      setStory(result);
    } catch (error: any) {
      setErrorMessage(error.message || "Failed to load the pipeline story.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStory();
  }, [workspaceId]);

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between mb-8">
        <div>
          <Button variant="ghost" className="mb-4 px-2 -ml-2 text-text-secondary" onClick={() => navigate(`/w/${workspaceId}/report`)}>
            <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span>
            Back to Report Studio
          </Button>
          <h1 className="atlas-page-title text-atlas-600">Pipeline Audit Story</h1>
          <p className="atlas-page-subtitle">
            A readable narrative of what happened inside this reporting boundary: uploads, extraction runs, review actions, and metrics.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {story?.sha256_hash && (
            <BlockchainBadge
              verification={{
                document_id: workspaceId || "",
                sha256_hash: story.sha256_hash,
                blockchain_enabled: true,
                chain_id: 80002, // Polygon Amoy
                contract_address: "0x...", // Mock default
                verified_on_chain: !!story.blockchain_tx_id,
                verification_status: story.blockchain_tx_id ? "verified" : "not_found",
                blockchain_tx_id: story.blockchain_tx_id
              }}
            />
          )}
          <Button onClick={fetchStory} disabled={loading} variant="ghost" className="border-border bg-white shadow-sm">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            {loading ? "Refreshing..." : "Refresh Story"}
          </Button>
        </div>
      </header>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-danger-bg border border-danger-border text-danger text-[13px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_minmax(0,1fr)] gap-6">
        <Card className="flex flex-col h-full">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-atlas-600 mb-1">Synthesized Narrative</p>
              <h2 className="text-[20px] font-bold text-text-primary">Workspace Activity Report</h2>
            </div>
            <Badge variant="blue">
              {story?.events?.length || 0} Events Tracked
            </Badge>
          </div>

          <div className="flex-1 bg-surface-secondary border border-border rounded-xl p-6 mb-6 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 text-text-muted">
                <span className="material-symbols-outlined text-[32px] animate-atlas-pulse mb-3">auto_awesome</span>
                <p className="text-[13px]">Synthesizing audit logs into narrative...</p>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-text-primary">
                {story?.story || "No tracked workspace activity has been recorded yet."}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-4 text-[11px] text-text-muted font-mono mt-auto">
            <span>WS: {workspaceId?.slice(0, 8)}...</span>
            <span>Generated: {formatTimestamp(story?.generated_at)}</span>
          </div>
        </Card>

        <Card className="flex flex-col h-full">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-[16px] font-bold text-text-primary">Raw Event Log</h2>
              <p className="text-[12px] text-text-secondary mt-1">
                Recent audit traces that generated the story.
              </p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-2 max-h-[600px] sidebar-scroll">
            {story?.events?.length > 0 ? story.events.map((event: any) => (
              <div key={event.id} className="bg-surface-secondary border border-border rounded-lg p-3">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-[13px] font-bold text-text-primary">{event.headline}</p>
                    <p className="text-[12px] text-text-secondary mt-0.5">{event.detail}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted font-mono">{formatTimestamp(event.created_at)}</span>
                  {event.payload && Object.keys(event.payload).length > 0 && (
                    <details className="group">
                      <summary className="cursor-pointer list-none text-[10px] font-semibold text-atlas-600 hover:text-atlas-500 transition-colors select-none">
                        View Payload
                      </summary>
                      <div className="mt-2 text-[10px] bg-slate-900 border border-border font-mono text-emerald-100 p-2 rounded max-w-full overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-sm absolute left-6 right-6 z-10">
                        {JSON.stringify(event.payload, null, 2)}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )) : (
              <div className="py-12 border-2 border-dashed border-border rounded-lg text-center">
                <span className="material-symbols-outlined text-[32px] text-text-muted mb-2 block">history</span>
                <p className="text-[13px] text-text-secondary">No audit events captured yet.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
