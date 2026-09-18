"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Tabs, type TabItem } from "@repo/ui/Tabs";
import { DashboardShell } from "@/components/DashboardShell";
import { getMission, listPhases, listTaches, STATUT_MISSION_LABELS, type Mission, type Phase, type Tache } from "@/lib/bfm-missions-api";
import { ApercuPanel, PhasesPanel, ParametresPanel } from "./Panels";
import { ArrowBackOutlined } from "@mui/icons-material";

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const missionId = Number(id);
  const [mission, setMission] = useState<Mission | null>(null);
  const [phases, setPhases] = useState<Phase[] | null>(null);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    getMission(missionId).then(setMission).catch((err) => setError(err instanceof Error ? err.message : "Erreur inattendue"));
    listPhases(missionId).then(setPhases);
    listTaches(missionId).then(setTaches);
  }
  useEffect(reload, [missionId]);

  if (error) {
    return (
      <DashboardShell>
        <div className="p-8"><p className="text-body-md text-error">{error}</p></div>
      </DashboardShell>
    );
  }
  if (!mission || !phases) {
    return (
      <DashboardShell>
        <div className="p-8"><p className="text-body-md text-on-surface-variant">Chargement…</p></div>
      </DashboardShell>
    );
  }

  const tabs: TabItem[] = [
    { key: "apercu", label: "Aperçu", content: <ApercuPanel mission={mission} /> },
    { key: "phases", label: "Phases", content: <PhasesPanel missionId={missionId} phases={phases} taches={taches} reload={reload} /> },
    { key: "parametres", label: "Paramètres", content: <ParametresPanel mission={mission} reload={reload} /> },
  ];

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <Link href="/missions" className="text-outline hover:text-on-surface transition-colors">
            <ArrowBackOutlined style={{ fontSize: 20 }} />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-headline-lg text-on-surface font-mono">{mission.code}</h1>
            <p className="text-body-sm text-on-surface-variant">{mission.nom}</p>
          </div>
          <span className="rounded-md px-2.5 py-1 text-body-sm font-semibold bg-surface-container text-on-surface-variant">
            {STATUT_MISSION_LABELS[mission.statut]}
          </span>
        </div>

        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5">
          <Tabs tabs={tabs} />
        </div>
      </div>
    </DashboardShell>
  );
}
