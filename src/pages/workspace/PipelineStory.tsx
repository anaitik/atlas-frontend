import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ActivityTimeline } from "../../components/expert/ActivityTimeline";
import { apiClient } from "../../lib/api-client";
import { BlockchainBadge } from "../../components/ui/BlockchainBadge";
import { copy } from "../../lib/copy";

type StoryEvent = {
  id: string;
  event_type: string;
  created_at: string;
  headline: string;
  detail: string;
  entity_label?: string;
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

export function PipelineStory({ embedded = false }: { embedded?: boolean }) {
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
      const message = error instanceof Error ? error.message : "Failed to load activity.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void fetchStory();
  }, [fetchStory]);

  if (embedded) {
    return (
      <Card className="p-5">
        {errorMessage && (
          <div className="p-3 mb-4 rounded-lg bg-danger-bg border border-danger-border text-danger text-[13px]">{errorMessage}</div>
        )}
        <ActivityTimeline events={story?.events || []} summary={story?.story} loading={loading} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between mb-8">
        <div>
          <Button variant="ghost" className="mb-4 px-2 -ml-2 text-text-secondary" onClick={() => navigate(`/w/${workspaceId}`)}>
            <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span>
            Back to period overview
          </Button>
          <h1 className="atlas-page-title text-atlas-600">{copy.nav.evidenceTrail}</h1>
          <p className="atlas-page-subtitle">{copy.evidence.subtitle}</p>
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
                blockchain_tx_id: story.blockchain_tx_id,
              }}
            />
          )}
          <Button onClick={fetchStory} disabled={loading} variant="ghost" className="border-border bg-white shadow-sm">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </header>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-danger-bg border border-danger-border text-danger text-[13px] flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {errorMessage}
        </div>
      )}

      <ActivityTimeline events={story?.events || []} summary={story?.story} loading={loading} />
    </div>
  );
}
