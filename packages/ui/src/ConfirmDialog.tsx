"use client";

import { useEffect } from "react";
import { ErrorOutlineOutlined } from "@mui/icons-material";

export interface ConfirmDialogProps {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` (défaut) pour une action destructive, `primary` sinon. */
  tone?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Dialogue de confirmation maison — remplace `window.confirm`. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay backdrop-blur-[2px] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[26rem] rounded-2xl bg-surface-container-lowest shadow-modal p-6 animate-pop-in">
        <div className="flex items-start gap-3">
          <span
            className={`w-9 h-9 flex-none rounded-full flex items-center justify-center ${
              tone === "danger" ? "bg-error-container text-error" : "bg-primary/10 text-primary"
            }`}
          >
            <ErrorOutlineOutlined style={{ fontSize: 20 }} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-base font-semibold text-on-surface">{title}</p>
            {message && (
              <div className="text-body-sm text-on-surface-variant mt-1">{message}</div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            disabled={busy}
            className="h-[38px] px-4 rounded-lg border border-outline-soft text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`h-[38px] px-5 rounded-lg text-body-sm font-semibold shadow-button disabled:opacity-50 transition-colors ${
              tone === "danger"
                ? "bg-error text-on-error"
                : "bg-primary text-on-primary hover:bg-primary-container"
            }`}
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
