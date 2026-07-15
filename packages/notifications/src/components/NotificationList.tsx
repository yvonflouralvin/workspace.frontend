"use client";

import { useRouter } from "next/navigation";
import { DoneAllOutlined, NotificationsNoneOutlined } from "@mui/icons-material";
import type { InAppNotification } from "../types/notification";

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export function NotificationList({
  items,
  loading,
  onItemClick,
  onMarkAll,
  onClose,
}: {
  items: InAppNotification[];
  loading: boolean;
  onItemClick: (id: number) => void | Promise<void>;
  onMarkAll: () => void | Promise<void>;
  onClose: () => void;
}) {
  const router = useRouter();

  async function handle(n: InAppNotification) {
    if (!n.read_at) await onItemClick(n.id);
    onClose();
    if (n.link) router.push(n.link);
  }

  const hasUnread = items.some((n) => !n.read_at);

  return (
    <div className="flex flex-col max-h-[70vh]">
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-outline-variant">
        <span className="text-body-md font-semibold text-on-surface">Notifications</span>
        {hasUnread && (
          <button
            type="button"
            onClick={() => onMarkAll()}
            className="inline-flex items-center gap-1 text-label-md text-primary hover:opacity-70 transition-opacity"
          >
            <DoneAllOutlined style={{ fontSize: 16 }} />
            Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="px-4 py-8 text-center text-body-sm text-on-surface-variant">Chargement…</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-10 flex flex-col items-center gap-2 text-center">
            <NotificationsNoneOutlined style={{ fontSize: 28 }} className="text-on-surface-variant/40" />
            <p className="text-body-sm text-on-surface-variant">Aucune notification</p>
          </div>
        ) : (
          items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => handle(n)}
              className={`w-full text-left px-4 py-3 border-b border-outline-variant last:border-0 flex gap-3 transition-colors hover:bg-surface-container-low ${
                n.read_at ? "" : "bg-surface-container-low/60"
              }`}
            >
              <span
                className={`mt-1.5 shrink-0 w-2 h-2 rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-body-sm font-medium text-on-surface">{n.title}</span>
                {n.body && (
                  <span className="block text-body-sm text-on-surface-variant truncate">{n.body}</span>
                )}
                <span className="block text-label-sm text-on-surface-variant/70 mt-0.5">
                  {relTime(n.created_at)}
                </span>
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
