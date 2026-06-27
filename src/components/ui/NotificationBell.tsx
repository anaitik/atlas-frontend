import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../lib/api-client";

interface Notif {
  id: string;
  event_type: string;
  title: string;
  body: string;
  resource_url: string | null;
  is_read: boolean;
  created_at: string;
}

function timeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const EVENT_ICONS: Record<string, string> = {
  BANK_PORTAL_VIEWED: "account_balance",
  BATCH_APPROVED: "verified",
  REPORT_PENDING: "description",
  METRIC_MANUAL_ENTRY: "bar_chart",
  METRIC_APPROVED: "verified",
};

const EVENT_COLOR: Record<string, string> = {
  BANK_PORTAL_VIEWED: "bg-emerald-100 text-emerald-600",
  BATCH_APPROVED: "bg-blue-100 text-blue-600",
  REPORT_PENDING: "bg-amber-100 text-amber-600",
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCount = async () => {
    try {
      const res = await apiClient<any>("/notifications/unread-count");
      const d = res?.data ?? res;
      setUnread(d?.count ?? 0);
    } catch {}
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiClient<any>("/notifications?page_size=15");
        const d = res?.data ?? res;
        setNotifs(d?.items ?? []);
        setUnread(d?.unread_count ?? 0);
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleClick = async (n: Notif) => {
    if (!n.is_read) {
      try { await apiClient(`/notifications/${n.id}/read`, { method: "POST" }); } catch {}
      setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
      setUnread((prev) => Math.max(0, prev - 1));
    }
    setOpen(false);
    if (n.resource_url) navigate(n.resource_url);
  };

  const handleMarkAll = async () => {
    try { await apiClient("/notifications/read-all", { method: "POST" }); } catch {}
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="relative w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[11px] font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-text-on-dark transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">notifications</span>
        Notifications
        {unread > 0 && (
          <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-[320px] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-bold text-gray-900">Notifications</span>
              {unread > 0 && (
                <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-[11px] text-atlas-600 hover:text-atlas-700 font-semibold"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[340px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-10 text-center text-[12px] text-gray-400">Loading…</div>
            ) : notifs.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <span className="material-symbols-outlined text-[32px] text-gray-200 mb-2 block">
                  notifications_none
                </span>
                <p className="text-[12px] text-gray-400">No notifications yet</p>
                <p className="text-[11px] text-gray-300 mt-1">
                  You'll be notified when banks view your ESG data and more.
                </p>
              </div>
            ) : (
              notifs.map((n) => {
                const iconClass = EVENT_COLOR[n.event_type] || (n.is_read ? "bg-gray-100 text-gray-400" : "bg-atlas-100 text-atlas-600");
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                      !n.is_read ? "bg-atlas-50/60" : ""
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconClass}`}>
                      <span className="material-symbols-outlined text-[15px]">
                        {EVENT_ICONS[n.event_type] || "notifications"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-semibold leading-tight ${!n.is_read ? "text-gray-900" : "text-gray-600"}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-[11px] text-gray-400 mt-0.5 leading-snug line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-300 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-atlas-500 mt-2 shrink-0 flex-none" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
