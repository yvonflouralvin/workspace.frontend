"use client";

import { useState } from "react";
import { NotificationsOutlined } from "@mui/icons-material";
import { NotificationList } from "@repo/notifications/NotificationList";
import { NotificationDetail } from "@repo/notifications/NotificationDetail";
import { useNotifications } from "@repo/notifications/hooks/useNotifications";
import type { InAppNotification } from "@repo/notifications/types/notification";

export default function NotificationsPage() {
  const { items, loading, unreadCount, markRead, markAllRead } = useNotifications("/api/notifications");
  const [detail, setDetail] = useState<InAppNotification | null>(null);

  function openDetail(n: InAppNotification) {
    if (!n.read_at) markRead(n.id);
    setDetail(n);
  }
  function openLink(link: string) {
    if (link) window.location.href = link;
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <NotificationsOutlined style={{ fontSize: 22 }} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Notifications</h1>
          <p className="text-sm text-on-surface-variant">
            {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
        <NotificationList items={items} loading={loading} onSelect={openDetail} onMarkAll={markAllRead} />
      </div>

      {detail && (
        <NotificationDetail notification={detail} onClose={() => setDetail(null)} onOpen={openLink} />
      )}
    </div>
  );
}
