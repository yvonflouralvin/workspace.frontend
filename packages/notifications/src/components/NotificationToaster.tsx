"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CloseOutlined, NotificationsActiveOutlined } from "@mui/icons-material";

export interface ToastItem {
  id: number;
  title: string;
  body: string | null;
  link: string | null;
}

const AUTO_DISMISS_MS = 6_000;

function Toast({
  toast,
  onDismiss,
  onClick,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
  onClick: (toast: ToastItem) => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    const timer = setTimeout(() => setLeaving(true), AUTO_DISMISS_MS);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, []);

  // Fin de l'animation de sortie → retrait effectif.
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => onDismiss(toast.id), 220);
    return () => clearTimeout(t);
  }, [leaving, toast.id, onDismiss]);

  return (
    <div
      role="status"
      onClick={() => onClick(toast)}
      className={`pointer-events-auto w-80 max-w-[calc(100vw-2rem)] cursor-pointer rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-lg p-3 flex gap-3 transition-all duration-200 ease-out ${
        entered && !leaving ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
      }`}
    >
      <span className="mt-0.5 shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary">
        <NotificationsActiveOutlined style={{ fontSize: 18 }} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body-sm font-semibold text-on-surface truncate">{toast.title}</p>
        {toast.body && (
          <p className="text-body-sm text-on-surface-variant line-clamp-2">{toast.body}</p>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setLeaving(true);
        }}
        className="shrink-0 self-start rounded-full p-1 text-on-surface-variant/70 hover:bg-surface-container transition-colors"
        aria-label="Fermer"
      >
        <CloseOutlined style={{ fontSize: 16 }} />
      </button>
    </div>
  );
}

export function NotificationToaster({
  toasts,
  onDismiss,
  onClick,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
  onClick: (toast: ToastItem) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} onClick={onClick} />
      ))}
    </div>,
    document.body,
  );
}
