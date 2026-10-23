"use client";

import Link from "next/link";
import { ArrowBackOutlined, LockOutlined } from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useSessionStore } from "@repo/auth/store/session.store";
import { Tabs } from "@repo/ui/Tabs";
import { ConnexionAssistant } from "@repo/agent-chat/ConnexionAssistant";
import { CollaborateursAssistant } from "@repo/agent-chat/CollaborateursAssistant";

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
          L&apos;abonnement Claude sur lequel l&apos;assistant s&apos;appuie, et les
          collaborateurs virtuels qui travaillent pour cet espace de travail.
        </p>
      </div>

      {loading ? (
        <p className="text-body-md text-on-surface-variant">Chargement…</p>
      ) : (
        <Tabs
          tabs={[
            {
              key: "abonnement",
              label: "Abonnement",
              content: can("agent.manage") ? (
                <div className="pt-5">
                  <ConnexionAssistant />
                </div>
              ) : (
                <Refuse quoi="Brancher l'abonnement Claude" droit="gérer l'assistant" />
              ),
            },
            {
              key: "collaborateurs",
              label: "Collaborateurs",
              content: (
                <div className="pt-5">
                  <CollaborateursAssistant peutGerer={can("agent.collaborateurs.manage")} />
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

function Refuse({ quoi, droit }: { quoi: string; droit: string }) {
  return (
    <div className="mt-5 flex items-start gap-2 p-4 rounded-2xl border border-outline-soft bg-surface-container-low">
      <LockOutlined style={{ fontSize: 18 }} className="text-on-surface-variant mt-0.5" />
      <p className="text-body-sm text-on-surface-variant">
        {quoi} demande le droit «&nbsp;{droit}&nbsp;». Demandez-le à un administrateur de
        cet espace de travail.
      </p>
    </div>
  );
}
