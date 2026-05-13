import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { apiClient } from "../../lib/api-client";
import { BlockchainBadge } from "../../components/ui/BlockchainBadge";
import { Badge } from "../../components/ui/Badge";

type StoryEvent = {
  id: string;
  event_type: string;
  created_at: string;
  headline: string;
  detail: string;
  payload: Record<string, unknown>;
};

type StoryResponse = {
  workspace_id: string;
  story: string;
  events: StoryEvent[];
  generated_at: string;
  sha256_hash: string | null;
  blockchain_enabled: boolean;
  chain_id: number | null;
  contract_address: string | null;
  verified_on_chain: boolean;
  verification_status: "verified" | "not_found" | "not_configured";
  blockchain_tx_id: string | null;
};

function formatTimestamp(value?: string) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

function formatTimeAgo(value?: string) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Map event headlines to categories for icon/color theming */
function categorizeEvent(headline: string): { icon: string; color: string; bgColor: string; borderColor: string } {
  const h = headline.toLowerCase();
  if (h.includes("upload") || h.includes("document") || h.includes("file"))
    return { icon: "upload_file", color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" };
  if (h.includes("extract") || h.includes("ai") || h.includes("llm"))
    return { icon: "auto_awesome", color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200" };
  if (h.includes("blockchain") || h.includes("anchor") || h.includes("hash") || h.includes("chain"))
    return { icon: "shield", color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" };
  if (h.includes("metric") || h.includes("compute") || h.includes("kpi"))
    return { icon: "bar_chart", color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200" };
  if (h.includes("report") || h.includes("publish") || h.includes("render"))
    return { icon: "description", color: "text-rose-600", bgColor: "bg-rose-50", borderColor: "border-rose-200" };
  if (h.includes("review") || h.includes("approv"))
    return { icon: "verified", color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200" };
  return { icon: "circle", color: "text-gray-500", bgColor: "bg-gray-50", borderColor: "border-gray-200" };
}

export function PipelineStory() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState<StoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchStory = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");
      const result = await apiClient<StoryResponse>(`/story/${workspaceId}`);
      setStory(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load the pipeline story.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchStory();
  }, [fetchStory]);

  const events = story?.events || [];

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
                blockchain_enabled: story.blockchain_enabled,
                chain_id: story.chain_id,
                contract_address: story.contract_address || null,
                verified_on_chain: story.verified_on_chain,
                verification_status: story.verification_status,
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
        <div className="p-3 rounded-lg bg-danger-bg border border-danger-border text-danger text-[13px] flex items-center gap-2 animate-slide-up">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_minmax(0,1fr)] gap-6">
        {/* ── AI-Generated Narrative ───────────── */}
        <Card className="flex flex-col h-full">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-atlas-600 mb-1">Synthesized Narrative</p>
              <h2 className="text-[20px] font-bold text-text-primary">Workspace Activity Report</h2>
            </div>
            <Badge variant="blue">
              {events.length} Events Tracked
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

        {/* ── Visual Timeline Event Log ───────────── */}
        <Card className="flex flex-col h-full">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-[16px] font-bold text-text-primary">Audit Timeline</h2>
              <p className="text-[12px] text-text-secondary mt-1">
                Chronological event trace with provenance markers.
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 max-h-[600px] sidebar-scroll">
            {events.length > 0 ? (
              <div className="relative pl-8">
                {/* Vertical timeline line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-atlas-400 via-border to-border rounded-full" />

                {events.map((event: StoryEvent, index: number) => {
                  const cat = categorizeEvent(event.headline || "");
                  return (
                    <div
                      key={event.id}
                      className="relative mb-4 last:mb-0 animate-atlas-in"
                      style={{ animationDelay: `${Math.min(index * 0.05, 0.5)}s` }}
                    >
                      {/* Timeline dot */}
                      <div className={`absolute -left-8 top-3 w-[30px] h-[30px] rounded-full ${cat.bgColor} border-2 ${cat.borderColor} flex items-center justify-center z-10`}>
                        <span className={`material-symbols-outlined text-[14px] ${cat.color}`}>{cat.icon}</span>
                      </div>

                      {/* Event card */}
                      <div className="bg-white border border-border rounded-xl p-4 ml-2 hover:shadow-md hover:border-atlas-400/20 transition-all duration-200">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <p className="text-[13px] font-bold text-text-primary leading-snug">{event.headline}</p>
                          <span className="text-[10px] text-text-muted font-medium whitespace-nowrap shrink-0">
                            {formatTimeAgo(event.created_at)}
                          </span>
                        </div>
                        <p className="text-[12px] text-text-secondary leading-relaxed">{event.detail}</p>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light">
                          <span className="text-[10px] text-text-muted font-mono">{formatTimestamp(event.created_at)}</span>
                          {event.payload && Object.keys(event.payload).length > 0 && (
                            <details className="group">
                              <summary className="cursor-pointer list-none text-[10px] font-semibold text-atlas-600 hover:text-atlas-500 transition-colors select-none flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">data_object</span>
                                Inspect Payload
                              </summary>
                              <div className="mt-2 text-[10px] bg-atlas-900 border border-atlas-700 font-mono text-emerald-100 p-3 rounded-lg max-w-full overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-lg">
                                {JSON.stringify(event.payload, null, 2)}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 border-2 border-dashed border-border rounded-lg text-center">
                <span className="material-symbols-outlined text-[32px] text-text-muted mb-2 block">history</span>
                <p className="text-[13px] text-text-secondary">No audit events captured yet.</p>
                <p className="text-[11px] text-text-muted mt-1">Upload documents and run extractions to generate timeline events.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
