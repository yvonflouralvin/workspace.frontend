"use client";

import { useEffect } from "react";
import { OpenInNewOutlined } from "@mui/icons-material";
import type { InAppNotification } from "../types/notification";
import { FIELD_LABELS, formatFieldValue, typeIcon, typeLabel } from "../lib/meta";

function fullDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function NotificationDetail({
  notification,
  onClose,
  onOpen,
}: {
  notification: InAppNotification;
  onClose: () => void;
  onOpen: (link: string) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const data = notification.data ?? {};
  const fields = Object.keys(FIELD_LABELS)
    .filter((k) => k in data && data[k] !== null && data[k] !== undefined && data[k] !== "")
    .map((k) => ({ label: FIELD_LABELS[k]!, value: formatFieldValue(data[k]) }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[36rem] bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête façon palette de recherche : icône + catégorie + Esc */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
          <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary/10 text-primary">
            {typeIcon(notification.type_key, 18)}
          </span>
          <span className="flex-1 text-body-md font-medium text-on-surface">
            {typeLabel(notification.type_key)}
          </span>
          <kbd className="text-xs text-outline bg-surface-container rounded px-1.5 py-0.5 font-mono shrink-0">
            Esc
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <p className="text-body-md font-semibold text-on-surface">{notification.title}</p>
            <p className="text-label-sm text-on-surface-variant mt-0.5">
              {fullDate(notification.created_at)}
            </p>
          </div>

          {notification.body && (
            <p className="text-body-sm text-on-surface-variant whitespace-pre-line">
              {notification.body}
            </p>
          )}

          {fields.length > 0 && (
            <dl className="rounded-xl border border-outline-variant divide-y divide-outline-variant overflow-hidden">
              {fields.map((f) => (
                <div key={f.label} className="flex gap-3 px-3 py-2">
                  <dt className="w-40 shrink-0 text-label-md font-medium text-on-surface-variant">
                    {f.label}
                  </dt>
                  <dd className="min-w-0 flex-1 text-body-sm text-on-surface">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-outline-variant">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-label-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Fermer
          </button>
          {notification.link && (
            <button
              type="button"
              onClick={() => onOpen(notification.link!)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-label-md font-medium text-on-primary hover:bg-primary-container transition-colors"
            >
              <OpenInNewOutlined style={{ fontSize: 16 }} />
              Ouvrir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
