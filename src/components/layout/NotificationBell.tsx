"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { NotificationItem, NotificationListResponse } from "@/lib/notifications/types";

const POLL_MS = 45_000;

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/inbox/unread-count");
      if (res.ok) setUnread((await res.json()).unread_count ?? 0);
    } catch {
      /* silent */
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/inbox");
      if (res.ok) {
        const data = (await res.json()) as NotificationListResponse;
        setItems(data.items);
        setUnread(data.unread_count);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll the unread count while authenticated; refresh on focus.
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchCount();
    const id = setInterval(fetchCount, POLL_MS);
    const onFocus = () => fetchCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAuthenticated, fetchCount]);

  // Close on outside click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) fetchList();
  };

  const openItem = async (item: NotificationItem) => {
    setOpen(false);
    if (!item.read) {
      setUnread((u) => Math.max(0, u - item.count));
      // Bid-match items are derived (no stored rows) — clearing them advances a
      // per-user watermark rather than marking row ids read.
      if (item.event_type === "bid_match") {
        fetch("/api/notifications/inbox/bid-matches/seen", { method: "POST" }).catch(() => null);
      } else {
        fetch("/api/notifications/inbox/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: item.ids }),
        }).catch(() => null);
      }
    }
    if (item.href) router.push(item.href);
  };

  const markAllRead = async () => {
    setUnread(0);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    // read-all also advances the bid-match watermark on the backend, but items
    // may already be loaded; nothing else to do client-side.
    await fetch("/api/notifications/inbox/read-all", { method: "POST" }).catch(() => null);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        className="relative p-2 rounded-lg hover:bg-muted-light transition-colors"
      >
        <svg className="w-5 h-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-error text-white text-[10px] font-bold leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[90vw] bg-card-bg rounded-lg shadow-xl border border-border z-[9999]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-xs text-muted">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <svg className="w-8 h-8 mx-auto text-muted/40 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-xs text-muted">You&apos;re all caught up.</p>
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.ids.join("-")}
                  onClick={() => openItem(item)}
                  className={`w-full text-left px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted-light transition-colors flex gap-3 ${
                    item.read ? "" : "bg-primary/5"
                  }`}
                >
                  {!item.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                  <span className={`flex-1 ${item.read ? "pl-5" : ""}`}>
                    <span className="block text-sm text-foreground">
                      {item.title}
                      {item.count > 1 && <span className="text-muted"> ({item.count})</span>}
                    </span>
                    {item.body && <span className="block text-xs text-muted mt-0.5">{item.body}</span>}
                    <span className="block text-[11px] text-muted mt-0.5">{relativeTime(item.created_at)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
