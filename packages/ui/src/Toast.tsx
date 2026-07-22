"use client";

import { useEffect } from "react";
import { CheckCircleOutlined, ErrorOutlineOutlined } from "@mui/icons-material";

export interface ToastProps {
  message: string;
  tone?: "success" | "error";
  /** Durée avant disparition automatique, en ms. */
  duration?: number;
  onDismiss: () => void;
}

/** Notification éphémère maison — remplace `window.alert`. */
export function Toast({ message, tone = "success", duration = 2600, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [duration, onDismiss, message]);

  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 bottom-8 z-[80] flex items-center gap-2.5 px-4 py-3 rounded-xl bg-inverse-surface text-inverse-on-surface text-body-sm font-medium shadow-toast animate-toast-in"
    >
      <span className={tone === "error" ? "text-error-container" : "text-secondary-container"}>
        {tone === "error" ? (
          <ErrorOutlineOutlined style={{ fontSize: 18 }} />
        ) : (
          <CheckCircleOutlined style={{ fontSize: 18 }} />
        )}
      </span>
      {message}
    </div>
  );
}
