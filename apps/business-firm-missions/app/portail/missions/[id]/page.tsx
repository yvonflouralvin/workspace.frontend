"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowBackOutlined } from "@mui/icons-material";
import { LigneTachePortail } from "@/components/CarteTachePortail";
import { STATUT_MISSION_LABELS, type StatutMission, type StatutPhase } from "@/lib/bfm-missions-api";
import { dateFr } from "@/lib/format";
import { getMissionPortail, type PortailMissionDetail } from "@/lib/bfm-portail-api";
import { StatutPhasePill } from "@/app/missions/[id]/ui";

export default function MissionPortailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<PortailMissionDetail | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    getMissionPortail(Number(id))
      .then(setDetail)
      .catch(() => setErreur("Mission introuvable."));
  }, [id]);

  if (erreur) return <p className="text-body-md text-error">{erreur}</p>;
  if (!detail) return <p className="text-body-md text-on-surface-variant">Chargement…</p>;

  const { mission, phases, taches } = detail;
  const ordre = [...phases].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      <Link
        href="/portail/missions"
        className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
      >
        <ArrowBackOutlined style={{ fontSize: 15 }} /> Missions
      </Link>

      <div>
        <p className="font-mono text-label-md text-outline">{mission.code}</p>
        <h1 className="font-display text-headline-md text-on-surface">{mission.nom}</h1>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          {STATUT_MISSION_LABELS[mission.statut as StatutMission] ?? mission.statut}
          {mission.start_date && ` · du ${dateFr(mission.start_date)}`}
          {mission.due_date && ` au ${dateFr(mission.due_date)}`}
        </p>
        {mission.description && (
          <p className="mt-3 whitespace-pre-wrap text-body-md text-on-surface">{mission.description}</p>
        )}
      </div>

      <div className="space-y-4">
        {ordre.map((phase) => {
          const siennes = taches.filter((t) => t.phase_id === phase.id);
          return (
            <section key={phase.id}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-body-md font-semibold text-on-surface">{phase.nom}</h2>
                <StatutPhasePill statut={phase.statut as StatutPhase} />
              </div>
              <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
                {siennes.length === 0 ? (
                  <p className="px-4 py-3 text-body-sm text-on-surface-variant">
                    Aucune action attendue de votre part dans cette phase.
                  </p>
                ) : (
                  siennes.map((t) => <LigneTachePortail key={t.id} tache={t} />)
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
