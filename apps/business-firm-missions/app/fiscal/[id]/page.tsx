"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Tabs, type TabItem } from "@repo/ui/Tabs";
import { DashboardShell } from "@/components/DashboardShell";
import { getDossier, type Dossier } from "@/lib/bfm-fiscal-api";
import {
  ObligationsPanel,
  EcheancesPanel,
  DeclarationsPanel,
  CorrespondancesPanel,
  PaiementsFiscauxPanel,
  PenalitesPanel,
  ControlesFiscauxPanel,
} from "./Panels";
import { ArrowBackOutlined } from "@mui/icons-material";

export default function DossierFiscalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [dossier, setDossier] = useState<Dossier | null>(null);

  useEffect(() => { getDossier(Number(id)).then(setDossier); }, [id]);

  if (!dossier) {
    return (
      <DashboardShell>
        <div className="p-8"><p className="text-body-md text-on-surface-variant">Chargement…</p></div>
      </DashboardShell>
    );
  }

  const tabs: TabItem[] = [
    { key: "obligations", label: "Obligations", content: <ObligationsPanel dossierId={dossier.id} /> },
    { key: "echeances", label: "Échéances", content: <EcheancesPanel dossierId={dossier.id} /> },
    { key: "declarations", label: "Déclarations", content: <DeclarationsPanel dossierId={dossier.id} /> },
    { key: "correspondances", label: "Correspondances", content: <CorrespondancesPanel dossierId={dossier.id} /> },
    { key: "paiements", label: "Paiements", content: <PaiementsFiscauxPanel dossierId={dossier.id} /> },
    { key: "penalites", label: "Pénalités", content: <PenalitesPanel dossierId={dossier.id} /> },
    { key: "controles", label: "Contrôles fiscaux", content: <ControlesFiscauxPanel dossierId={dossier.id} /> },
  ];

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/fiscal" className="text-outline hover:text-on-surface transition-colors">
            <ArrowBackOutlined style={{ fontSize: 20 }} />
          </Link>
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">{dossier.nom}</h1>
            {dossier.notes && <p className="text-body-sm text-on-surface-variant">{dossier.notes}</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5">
          <Tabs tabs={tabs} />
        </div>
      </div>
    </DashboardShell>
  );
}
