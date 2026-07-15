"use client";

import { DoneAllOutlined, NotificationsNoneOutlined } from "@mui/icons-material";
import type { InAppNotification } from "../types/notification";
import { typeIcon } from "../lib/meta";

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
  onSelect,
  onMarkAll,
}: {
  items: InAppNotification[];
  loading: boolean;
  onSelect: (n: InAppNotification) => void;
  onMarkAll: () => void | Promise<void>;
}) {
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
              onClick={() => onSelect(n)}
              className={`w-full text-left px-4 py-3 border-b border-outline-variant last:border-0 flex gap-3 transition-colors hover:bg-surface-container-low ${
                n.read_at ? "" : "bg-surface-container-low/60"
              }`}
            >
              <span
                className={`mt-0.5 shrink-0 w-8 h-8 flex items-center justify-center rounded-full ${
                  n.read_at ? "bg-surface-container text-on-surface-variant" : "bg-primary/10 text-primary"
                }`}
              >
                {typeIcon(n.type_key, 18)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  {!n.read_at && <span className="shrink-0 w-2 h-2 rounded-full bg-primary" />}
                  <span className="block text-body-sm font-medium text-on-surface truncate">{n.title}</span>
                </span>
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
