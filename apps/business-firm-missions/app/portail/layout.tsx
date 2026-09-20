"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { PortailShell } from "@/components/PortailShell";
import { getMoi, type PortailMoi } from "@/lib/bfm-portail-api";
import { PortailProvider } from "./portail-context";

export default function PortailLayout({ children }: { children: ReactNode }) {
  const { can } = usePermissions();
  const autorise = can("business_firm_missions.portail");
  const [moi, setMoi] = useState<PortailMoi | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!autorise) return;
    getMoi()
      .then(setMoi)
      .catch((e) => setErreur(e instanceof Error ? e.message : "Accès indisponible."));
  }, [autorise]);

  if (!autorise) {
    return (
      <div className="p-8">
        <p className="text-body-md text-on-surface-variant">
          Cet espace est réservé aux contacts des entreprises clientes.
        </p>
      </div>
    );
  }

  return (
    <PortailShell client={moi?.tiers_nom || null}>
      {erreur ? (
        <div className="p-8">
          <p className="text-body-md text-error">{erreur}</p>
          <p className="mt-2 text-body-sm text-on-surface-variant">
            Votre accès a peut-être été retiré. Contactez votre interlocuteur au cabinet.
          </p>
        </div>
      ) : !moi ? (
        <div className="p-8">
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        </div>
      ) : (
        <PortailProvider value={moi}>
          <div className="p-4 md:p-8 max-w-[1000px] mx-auto">{children}</div>
        </PortailProvider>
      )}
    </PortailShell>
  );
}
