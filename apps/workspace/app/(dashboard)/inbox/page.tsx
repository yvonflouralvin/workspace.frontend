"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { BoiteDeReception } from "@repo/inbox/BoiteDeReception";

export default function PageInbox() {
  return (
    <Suspense fallback={null}>
      <Boite />
    </Suspense>
  );
}

function Boite() {
  const { can } = usePermissions();
  const params = useSearchParams();
  const fil = Number(params.get("fil"));

  return (
    <BoiteDeReception
      peutSaisirUnCollaborateur={can("agent.collaborateurs.saisir")}
      filInitial={Number.isFinite(fil) && fil > 0 ? fil : undefined}
    />
  );
}
