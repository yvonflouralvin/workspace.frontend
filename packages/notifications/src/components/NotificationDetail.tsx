"use client";

import { OpenInNewOutlined } from "@mui/icons-material";
import { Modal } from "@repo/ui/Modal";
import type { InAppNotification } from "../types/notification";
import { FIELD_LABELS, formatFieldValue, typeIcon, typeLabel } from "../lib/meta";

function fullDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
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
  const data = notification.data ?? {};
  const fields = Object.keys(FIELD_LABELS)
    .filter((k) => k in data && data[k] !== null && data[k] !== undefined && data[k] !== "")
    .map((k) => ({ label: FIELD_LABELS[k]!, value: formatFieldValue(data[k]) }));

  return (
    <Modal title={typeLabel(notification.type_key)} onClose={onClose} width="max-w-[32rem]">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-primary/10 text-primary">
            {typeIcon(notification.type_key, 20)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-body-md font-semibold text-on-surface">{notification.title}</p>
            <p className="text-label-sm text-on-surface-variant mt-0.5">
              {fullDate(notification.created_at)}
            </p>
          </div>
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

        <div className="flex justify-end gap-2 pt-1">
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
    </Modal>
  );
}
