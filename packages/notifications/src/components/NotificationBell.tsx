"use client";

import { useEffect, useRef, useState } from "react";
import { NotificationsOutlined } from "@mui/icons-material";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationList } from "./NotificationList";

export function NotificationBell({ basePath }: { basePath?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { items, unreadCount, loading, markRead, markAllRead, refetch } = useNotifications(basePath);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            if (!o) refetch();
            return !o;
          });
        }}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <NotificationsOutlined style={{ fontSize: 20 }} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-error text-on-error text-[10px] font-semibold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-lg overflow-hidden">
          <NotificationList
            items={items}
            loading={loading}
            onItemClick={markRead}
            onMarkAll={markAllRead}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
