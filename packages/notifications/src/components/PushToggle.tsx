"use client";

import { useEffect, useState } from "react";
import { NotificationsActiveOutlined, NotificationsOffOutlined } from "@mui/icons-material";
import { disablePush, enablePush, getPushState, type PushState } from "../lib/push";

export function PushToggle({ basePath }: { basePath?: string }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPushState().then(setState);
  }, []);

  if (state === null || state === "unsupported") return null;

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (state === "granted") {
        await disablePush(basePath);
        setState("default");
      } else {
        const next = await enablePush(basePath);
        setState(next);
        if (next === "denied") setError("Autorisation refusée dans le navigateur.");
        else if (next !== "granted") setError("Activation incomplète, réessayez.");
      }
    } catch (e) {
      console.error("[push] échec de l'activation :", e);
      setError(e instanceof Error ? e.message : "Échec de l'activation.");
    } finally {
      setBusy(false);
    }
  }

  const enabled = state === "granted";
  const denied = state === "denied";

  return (
    <div>
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
          {busy
            ? "…"
            : denied
              ? "Notifications bureau bloquées"
              : enabled
                ? "Notifications bureau activées"
                : "Activer les notifications bureau"}
        </span>
      </button>
      {error && <p className="px-4 pb-2 text-label-sm text-error">{error}</p>}
    </div>
  );
}
