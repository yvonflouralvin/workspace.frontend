"use client";

import { LockOutlined, LogoutOutlined } from "@mui/icons-material";
import { apiFetch, getPublicConfig } from "@repo/network/client";

export function AccessDenied({
  appName,
  workspaceName,
  switcher,
}: {
  appName: string;
  workspaceName?: string | null;
  switcher?: React.ReactNode;
}) {
  async function handleLogout() {
    await apiFetch("/api/logout", { method: "POST" });
    const { authDomain } = await getPublicConfig();
    window.location.href = authDomain ?? "/";
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="max-w-[28rem] w-full text-center space-y-5">
        <div className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-error-container/40 flex items-center justify-center">
            <LockOutlined className="text-error" style={{ fontSize: 24 }} />
          </div>
          <h1 className="text-headline-sm text-on-surface">Accès refusé</h1>
          <p className="text-sm text-on-surface-variant">
            Vous n&apos;avez pas accès à l&apos;application {appName}
            {workspaceName && (
              <>
                {" "}pour le workspace{" "}
                <span className="font-medium text-on-surface">{workspaceName}</span>
              </>
            )}
            . Contactez l&apos;administrateur de ce workspace pour obtenir ce droit.
          </p>
        </div>

        {switcher && (
          <div className="space-y-1.5 text-left">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider text-center">
              Ou changez de workspace
            </p>
            <div className="rounded-xl border border-outline-variant bg-surface p-1">
              {switcher}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <LogoutOutlined style={{ fontSize: 18 }} />
          Se déconnecter pour utiliser un autre compte
        </button>
      </div>
    </div>
  );
}
