import { useEffect, useRef, useState, useCallback } from "react";
import { env } from "./env";

interface SseEvent {
  event_type: string;
  entity_type: string;
  entity_id: string;
  sequence: number;
  timestamp: string;
  payload: Record<string, unknown>;
}

interface UseSSEOptions {
  /** Override base URL (default: env.API_BASE_URL) */
  baseUrl?: string;
  /** Auto-reconnect on error? */
  reconnect?: boolean;
  /** Reconnect delay in ms */
  reconnectDelay?: number;
}

/**
 * useSSE hook — consumes the canonical SseEventEnvelope from the backend.
 * Domain components use this to show real-time progress for extraction, metrics, reports.
 */
export function useSSE(path: string, options?: UseSSEOptions) {
  const [events, setEvents] = useState<SseEvent[]>([]);
  const [lastEvent, setLastEvent] = useState<SseEvent | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "closed" | "error">("closed");
  const sourceRef = useRef<EventSource | null>(null);

  const baseUrl = options?.baseUrl ?? env.API_BASE_URL;
  const reconnect = options?.reconnect ?? true;
  const reconnectDelay = options?.reconnectDelay ?? 3000;

  const connect = useCallback(() => {
    const url = `${baseUrl}${path}`;
    setStatus("connecting");

    const source = new EventSource(url);
    sourceRef.current = source;

    source.onopen = () => setStatus("connected");

    source.onmessage = (e) => {
      try {
        const parsed: SseEvent = JSON.parse(e.data);
        setLastEvent(parsed);
        setEvents((prev) => [...prev, parsed]);
      } catch {
        console.warn("Failed to parse SSE event:", e.data);
      }
    };

    // Listen to typed events
    const eventTypes = ["queued", "started", "progress", "record_complete", "section_complete", "completed", "failed"];
    eventTypes.forEach((type) => {
      source.addEventListener(type, (e: MessageEvent) => {
        try {
          const parsed: SseEvent = JSON.parse(e.data);
          setLastEvent(parsed);
          setEvents((prev) => [...prev, parsed]);
        } catch {
          console.warn(`Failed to parse SSE ${type} event:`, e.data);
        }
      });
    });

    source.onerror = () => {
      setStatus("error");
      source.close();
      if (reconnect) {
        setTimeout(connect, reconnectDelay);
      }
    };
  }, [path, baseUrl, reconnect, reconnectDelay]);

  const close = useCallback(() => {
    sourceRef.current?.close();
    setStatus("closed");
  }, []);

  const reset = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  useEffect(() => {
    return () => {
      sourceRef.current?.close();
    };
  }, []);

  return { events, lastEvent, status, connect, close, reset };
}
