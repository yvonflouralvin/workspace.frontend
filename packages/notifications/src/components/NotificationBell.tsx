"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NotificationsOutlined } from "@mui/icons-material";
import { useNotifications } from "../hooks/useNotifications";
import { playNotificationSound, unlockAudio } from "../lib/sound";
import { NotificationList } from "./NotificationList";
import { NotificationToaster, type ToastItem } from "./NotificationToaster";
import { PushToggle } from "./PushToggle";

export function NotificationBell({ basePath }: { basePath?: string }) {
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const dismissToast = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  // Arrivée temps réel d'une notification → son + toast (haut droite).
  const handleNew = useCallback((n: { id: number; title: string; body: string | null; link: string | null }) => {
    playNotificationSound();
    setToasts((list) =>
      list.some((t) => t.id === n.id)
        ? list
        : [...list, { id: n.id, title: n.title, body: n.body, link: n.link }],
    );
  }, []);

  const { items, unreadCount, loading, markRead, markAllRead, refetch } = useNotifications(basePath, {
    onNew: handleNew,
  });

  const onToastClick = useCallback(
    (toast: ToastItem) => {
      markRead(toast.id);
      dismissToast(toast.id);
      if (toast.link) router.push(toast.link);
    },
    [markRead, dismissToast, router],
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
            onItemClick={markRead}
            onMarkAll={markAllRead}
            onClose={() => setOpen(false)}
          />
          <div className="border-t border-outline-variant">
            <PushToggle basePath={basePath} />
          </div>
        </div>
      )}

      <NotificationToaster toasts={toasts} onDismiss={dismissToast} onClick={onToastClick} />
    </div>
  );
}
