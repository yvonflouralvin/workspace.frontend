"use client";

import Link from "next/link";
import { STATUT_MISSION_LABELS, type StatutMission } from "@/lib/bfm-missions-api";
import { dateFr } from "@/lib/format";
import type { PortailMission } from "@/lib/bfm-portail-api";

export function CarteMissionPortail({ mission }: { mission: PortailMission }) {
  const { taches_client_total: total, taches_client_terminees: faites } = mission;
  return (
    <Link
      href={`/portail/missions/${mission.id}`}
      className="block rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 hover:border-primary transition-colors"
    >
      <p className="font-mono text-label-md text-outline">{mission.code}</p>
      <p className="mt-0.5 text-body-lg font-semibold text-on-surface">{mission.nom}</p>
      <p className="mt-1 text-label-md text-on-surface-variant">
        {STATUT_MISSION_LABELS[mission.statut as StatutMission] ?? mission.statut}
        {mission.due_date && ` · échéance ${dateFr(mission.due_date)}`}
      </p>
      <div className="mt-3">
        {total === 0 ? (
          <p className="text-label-md text-outline">Aucune action attendue de votre part.</p>
        ) : (
          <>
            <div className="h-1.5 rounded-full bg-track overflow-hidden">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((faites / total) * 100)}%` }} />
            </div>
            <p className="mt-1 text-label-md text-on-surface-variant">
              {faites} / {total} de vos tâches terminées
            </p>
          </>
        )}
      </div>
    </Link>
  );
}
