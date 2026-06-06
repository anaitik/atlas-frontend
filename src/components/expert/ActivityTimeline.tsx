import { useState } from "react";
import { formatEventType, formatStoryDetail } from "../../lib/display-labels";
import { copy } from "../../lib/copy";
import { TechnicalDetailsDrawer } from "./TechnicalDetailsDrawer";

export type ActivityEvent = {
  id: string;
  headline?: string;
  detail?: string;
  event_type?: string;
  created_at?: string;
  entity_label?: string;
  payload?: Record<string, unknown>;
};

function formatTimeAgo(value?: string) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function categorizeIcon(headline: string): string {
  const h = headline.toLowerCase();
  if (h.includes("upload") || h.includes("document")) return "upload_file";
  if (h.includes("extract") || h.includes("review") || h.includes("approv")) return "verified";
  if (h.includes("metric")) return "bar_chart";
  if (h.includes("report") || h.includes("publish")) return "description";
  if (h.includes("hash") || h.includes("verif")) return "shield";
  return "circle";
}

export function ActivityTimeline({
  events,
  summary,
  loading = false,
}: {
  events: ActivityEvent[];
  summary?: string | null;
  loading?: boolean;
}) {
  const [detailEvent, setDetailEvent] = useState<ActivityEvent | null>(null);

  return (
    <>
      {summary && (
        <div className="rounded-xl border border-border bg-surface-secondary p-5 mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-atlas-600 mb-2">
            {copy.expert.activitySummary}
          </p>
          <p className="text-[14px] leading-relaxed text-text-primary whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="text-[14px] font-bold text-text-primary mb-4">{copy.expert.whatHappened}</h3>
        {loading ? (
          <p className="text-[13px] text-text-muted py-8 text-center">Loading activity…</p>
        ) : events.length === 0 ? (
          <p className="text-[13px] text-text-muted py-8 text-center">No activity recorded yet.</p>
        ) : (
          <div className="relative pl-8 space-y-3 max-h-[520px] overflow-y-auto pr-2">
            <div className="absolute left-[15px] top-2 bottom-2 w-[2px] bg-border rounded-full" />
            {events.map((event) => {
              const headline = event.headline || formatEventType(event.event_type);
              const detail = formatStoryDetail(event.detail, event.entity_label);
              const icon = categorizeIcon(headline);
              return (
                <div key={event.id} className="relative">
                  <div className="absolute -left-8 top-2 w-[30px] h-[30px] rounded-full bg-atlas-50 border border-atlas-200 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[14px] text-atlas-600">{icon}</span>
                  </div>
                  <div className="ml-2 rounded-lg border border-border bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-semibold text-text-primary">{headline}</p>
                      <span className="text-[10px] text-text-muted shrink-0" title={event.created_at ? new Date(event.created_at).toLocaleString() : undefined}>
                        {formatTimeAgo(event.created_at)}
                      </span>
                    </div>
                    <p className="text-[12px] text-text-secondary mt-1">{detail}</p>
                    {event.payload && Object.keys(event.payload).length > 0 && (
                      <button
                        type="button"
                        className="text-[11px] font-semibold text-atlas-700 mt-2 hover:underline"
                        onClick={() => setDetailEvent(event)}
                      >
                        {copy.expert.viewDetails}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TechnicalDetailsDrawer
        open={!!detailEvent}
        onClose={() => setDetailEvent(null)}
        title={detailEvent?.headline || copy.expert.viewDetails}
        json={detailEvent?.payload}
      />
    </>
  );
}
