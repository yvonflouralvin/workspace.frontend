"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Tabs, type TabItem } from "@repo/ui/Tabs";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getMission,
  updateMission,
  listPhases,
  listTaches,
  STATUT_MISSION_LABELS,
  type Mission,
  type Phase,
  type Tache,
} from "@/lib/bfm-missions-api";
import { ApercuPanel, PhasesPanel, ParametresPanel } from "./Panels";
import { ArrowBackOutlined, CloudDoneOutlined, CloudSyncOutlined } from "@mui/icons-material";

const COULEUR = "#7c2d12";

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const missionId = Number(id);
  const [mission, setMission] = useState<Mission | null>(null);
  const [phases, setPhases] = useState<Phase[] | null>(null);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [titre, setTitre] = useState("");
  const [etatTitre, setEtatTitre] = useState<"idle" | "saving" | "saved">("idle");

  function reload() {
    getMission(missionId).then(setMission).catch((err) => setError(err instanceof Error ? err.message : "Erreur inattendue"));
    listPhases(missionId).then(setPhases);
    listTaches(missionId).then(setTaches);
  }
  useEffect(reload, [missionId]);
  useEffect(() => {
    if (mission) setTitre(mission.nom);
  }, [mission?.id, mission?.nom]);

  const enregistrerTitre = useCallback(async () => {
    const nom = titre.trim();
    if (!nom || nom === mission?.nom) return;
    setEtatTitre("saving");
    const updated = await updateMission(missionId, { nom });
    setMission(updated);
    setEtatTitre("saved");
  }, [titre, mission?.nom, missionId]);

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
    { key: "apercu", label: "Aperçu", content: <ApercuPanel mission={mission} reload={reload} /> },
    { key: "phases", label: "Phases", content: <PhasesPanel missionId={missionId} phases={phases} taches={taches} reload={reload} /> },
    { key: "parametres", label: "Paramètres", content: <ParametresPanel mission={mission} /> },
  ];

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
        <Link
          href="/missions"
          className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
        >
          <ArrowBackOutlined style={{ fontSize: 15 }} />
          Missions
        </Link>

        <div className="flex items-center gap-3.5">
          <span
            className="w-11 h-11 flex-none rounded-[11px] flex items-center justify-center font-display text-body-lg font-semibold"
            style={{ background: `color-mix(in srgb, ${COULEUR} 10%, transparent)`, color: COULEUR }}
          >
            {mission.nom.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <input
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                onBlur={enregistrerTitre}
                placeholder="Nom de la mission"
                className="min-w-0 flex-1 bg-transparent font-display text-headline-sm text-on-surface truncate outline-none border-b border-transparent hover:border-outline-soft focus:border-primary transition-colors"
              />
              {etatTitre === "saving" && (
                <CloudSyncOutlined style={{ fontSize: 16 }} className="text-on-surface-variant shrink-0" />
              )}
              {etatTitre === "saved" && (
                <CloudDoneOutlined style={{ fontSize: 16 }} className="text-secondary shrink-0" />
              )}
            </div>
            <p className="font-mono text-label-md text-outline">
              {mission.code} · {STATUT_MISSION_LABELS[mission.statut]}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <Tabs tabs={tabs} />
        </div>
      </div>
    </DashboardShell>
  );
}
