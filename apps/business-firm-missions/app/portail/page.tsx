"use client";

import { useEffect, useState } from "react";
import { LigneTachePortail } from "@/components/CarteTachePortail";
import { CarteMissionPortail } from "@/components/CarteMissionPortail";
import {
  listMissionsPortail,
  listTachesPortail,
  type PortailMission,
  type PortailTache,
} from "@/lib/bfm-portail-api";
import { usePortail } from "./portail-context";

export default function AccueilPortailPage() {
  const moi = usePortail();
  const [taches, setTaches] = useState<PortailTache[] | null>(null);
  const [missions, setMissions] = useState<PortailMission[] | null>(null);

  useEffect(() => {
    listTachesPortail().then(setTaches).catch(() => setTaches([]));
    listMissionsPortail().then(setMissions).catch(() => setMissions([]));
  }, []);

  const afaire = (taches ?? []).filter((t) => t.statut !== "TERMINEE");
  const faites = (taches ?? []).filter((t) => t.statut === "TERMINEE");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-headline-md text-on-surface">Bonjour {moi.nom.split(" ")[0]}</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          {moi.tiers_nom
            ? `Le suivi de vos missions avec Business Firm — ${moi.tiers_nom}.`
            : "Le suivi de vos missions avec Business Firm."}
        </p>
      </div>

      <section>
        <p className="mb-2 block text-label-sm uppercase text-outline">
          À faire de votre côté{afaire.length > 0 && ` · ${afaire.length}`}
        </p>
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
          {taches === null && <p className="px-4 py-3 text-body-sm text-on-surface-variant">Chargement…</p>}
          {taches !== null && afaire.length === 0 && (
            <p className="px-4 py-4 text-body-sm text-on-surface-variant">
              Rien n&apos;est attendu de vous pour le moment.
            </p>
          )}
          {afaire.map((t) => (
            <LigneTachePortail key={t.id} tache={t} />
          ))}
        </div>
        {faites.length > 0 && (
          <details className="mt-3">
            <summary className="cursor-pointer text-body-sm text-on-surface-variant hover:text-primary">
              {faites.length} tâche{faites.length > 1 ? "s" : ""} terminée{faites.length > 1 ? "s" : ""}
            </summary>
            <div className="mt-2 rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
              {faites.map((t) => (
                <LigneTachePortail key={t.id} tache={t} />
              ))}
            </div>
          </details>
        )}
      </section>

      <section>
        <p className="mb-2 block text-label-sm uppercase text-outline">Vos missions</p>
        {missions === null && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}
        {missions !== null && missions.length === 0 && (
          <p className="text-body-sm text-on-surface-variant">Aucune mission pour le moment.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {(missions ?? []).map((m) => (
            <CarteMissionPortail key={m.id} mission={m} />
          ))}
        </div>
      </section>
    </div>
  );
}
