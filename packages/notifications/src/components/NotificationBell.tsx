"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NotificationsOutlined } from "@mui/icons-material";
import { useNotifications } from "../hooks/useNotifications";
import { playNotificationSound, unlockAudio } from "../lib/sound";
import type { InAppNotification } from "../types/notification";
import { NotificationList } from "./NotificationList";
import { NotificationDetail } from "./NotificationDetail";
import { NotificationToaster, type ToastItem } from "./NotificationToaster";
import { PushToggle } from "./PushToggle";

export function NotificationBell({ basePath }: { basePath?: string }) {
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [detail, setDetail] = useState<InAppNotification | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const dismissToast = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  // Arrivée temps réel d'une notification → son + toast (haut droite).
  const handleNew = useCallback((n: InAppNotification) => {
    playNotificationSound();
    setToasts((list) =>
      list.some((t) => t.id === n.id)
        ? list
        : [...list, { id: n.id, type_key: n.type_key, title: n.title, body: n.body, link: n.link }],
    );
  }, []);

  const { items, unreadCount, loading, markRead, markAllRead, refetch } = useNotifications(basePath, {
    onNew: handleNew,
  });

  // Sélection d'une notification → marque lu + ouvre l'aperçu détaillé.
  const openDetail = useCallback(
    (n: InAppNotification) => {
      if (!n.read_at) markRead(n.id);
      setDetail(n);
      setOpen(false);
    },
    [markRead],
  );

  const onToastClick = useCallback(
    (toast: ToastItem) => {
      const full = items.find((n) => n.id === toast.id);
      dismissToast(toast.id);
      openDetail(
        full ?? {
          id: toast.id, type_key: toast.type_key, title: toast.title, body: toast.body,
          link: toast.link, data: null, read_at: null, created_at: new Date().toISOString(),
        },
      );
    },
    [items, dismissToast, openDetail],
  );

  const onOpenLink = useCallback(
    (link: string) => {
      setDetail(null);
      router.push(link);
    },
    [router],
  );

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Débloque l'audio au premier geste (politique autoplay des navigateurs).
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
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
            onSelect={openDetail}
            onMarkAll={markAllRead}
          />
          <div className="border-t border-outline-variant">
            <PushToggle basePath={basePath} />
          </div>
        </div>
      )}

      {detail && (
        <NotificationDetail notification={detail} onClose={() => setDetail(null)} onOpen={onOpenLink} />
      )}

      <NotificationToaster toasts={toasts} onDismiss={dismissToast} onClick={onToastClick} />
    </div>
  );
}
