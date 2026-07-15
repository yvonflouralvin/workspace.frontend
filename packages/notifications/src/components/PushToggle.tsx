"use client";

import { useEffect, useState } from "react";
import { NotificationsActiveOutlined, NotificationsOffOutlined } from "@mui/icons-material";
import { disablePush, enablePush, getPushState, type PushState } from "../lib/push";

export function PushToggle({ basePath }: { basePath?: string }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPushState().then(setState);
  }, []);

  if (state === null || state === "unsupported") return null;

  async function toggle() {
    setBusy(true);
    try {
      if (state === "granted") {
        await disablePush(basePath);
        setState("default");
      } else {
        setState(await enablePush(basePath));
      }
    } catch {
      /* silencieux */
    } finally {
      setBusy(false);
    }
  }

  const enabled = state === "granted";
  const denied = state === "denied";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || denied}
      className="w-full flex items-center gap-2 px-4 py-2.5 text-label-md text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
      title={denied ? "Débloquez les notifications dans les réglages du navigateur" : undefined}
    >
      {enabled ? (
        <NotificationsActiveOutlined style={{ fontSize: 16 }} className="text-primary" />
      ) : (
        <NotificationsOffOutlined style={{ fontSize: 16 }} />
      )}
      <span>
        {denied
          ? "Notifications bureau bloquées"
          : enabled
            ? "Notifications bureau activées"
            : "Activer les notifications bureau"}
      </span>
    </button>
  );
}
