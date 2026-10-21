"use client";

import Link from "next/link";
import { ArrowBackOutlined, LockOutlined } from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useSessionStore } from "@repo/auth/store/session.store";
import { ConnexionAssistant } from "@repo/agent-chat/ConnexionAssistant";

export default function PageAssistant() {
  const { can } = usePermissions();
  const loading = useSessionStore((s) => s.loading);

  return (
    <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <ArrowBackOutlined style={{ fontSize: 16 }} />
        Paramètres
      </Link>

      <div className="mt-3 mb-6">
        <h1 className="font-display text-headline-md text-on-surface">Assistant</h1>
        <p className="text-body-md text-on-surface-variant mt-0.5">
          L&apos;abonnement Claude sur lequel l&apos;assistant s&apos;appuie pour
          répondre aux membres de cet espace de travail.
        </p>
      </div>

      {loading ? (
        <p className="text-body-md text-on-surface-variant">Chargement…</p>
      ) : can("agent.manage") ? (
        <ConnexionAssistant />
      ) : (
        <div className="flex items-start gap-2 p-4 rounded-2xl border border-outline-soft bg-surface-container-low">
          <LockOutlined style={{ fontSize: 18 }} className="text-on-surface-variant mt-0.5" />
          <p className="text-body-sm text-on-surface-variant">
            Brancher l&apos;abonnement Claude demande le droit «&nbsp;gérer
            l&apos;assistant&nbsp;». Demandez-le à un administrateur de cet espace
            de travail.
          </p>
        </div>
      )}
    </div>
  );
}
