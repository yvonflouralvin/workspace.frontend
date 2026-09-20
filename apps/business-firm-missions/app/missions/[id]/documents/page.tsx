"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PanneauDocuments } from "@/components/PanneauDocuments";
import { apiDocumentsMission } from "@/lib/fil-tache-api";
import { FIELD } from "../ui";
import { useMission } from "../mission-context";

/** Tous les documents de la mission, toutes tâches confondues. */
export default function DocumentsMissionPage() {
  const { missionId, membres, phases, taches } = useMission();
  const [cible, setCible] = useState<number | null>(null);
  // Le dépôt lit la tâche choisie au moment de l'envoi : l'`api` reste stable, sinon chaque choix de
  // tâche rechargerait toute la liste.
  const cibleRef = useRef<number | null>(null);
  useEffect(() => {
    cibleRef.current = cible;
  }, [cible]);

  const api = useMemo(() => apiDocumentsMission(missionId, cibleRef), [missionId]);
  const personnes = useMemo(() => membres.map((m) => ({ id: m.id, nom: m.name })), [membres]);
  const ordre = [...phases].sort((a, b) => a.position - b.position || a.id - b.id);

  const choix = (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="tache-cible" className="text-body-sm text-on-surface-variant">
        Déposer dans la tâche
      </label>
      <select
        id="tache-cible"
        value={cible ?? ""}
        onChange={(e) => setCible(e.target.value ? Number(e.target.value) : null)}
        className={`${FIELD} max-w-full sm:w-[320px]`}
      >
        <option value="">— choisir —</option>
        {ordre.map((p) => (
          <optgroup key={p.id} label={p.nom}>
            {taches
              .filter((t) => t.phase_id === p.id)
              .map((t) => (
                <option key={t.id} value={t.id}>{t.titre}</option>
              ))}
          </optgroup>
        ))}
      </select>
    </div>
  );

  return (
    <PanneauDocuments
      api={api}
      audience="equipe"
      membres={personnes}
      optionInterne
      canWrite
      entete={taches.length > 0 ? choix : undefined}
      depotBloque={
        taches.length === 0
          ? "Cette mission n'a pas encore de tâche : un document se dépose dans une tâche."
          : cible === null
            ? "Choisissez d'abord la tâche concernée."
            : null
      }
      lienTache={(p) =>
        p.tache_id && p.phase_id
          ? {
              href: `/missions/${missionId}/phases/${p.phase_id}/taches/${p.tache_id}/documents`,
              libelle: [p.phase_nom, p.tache_titre].filter(Boolean).join(" › "),
            }
          : null
      }
      aide="Tous les fichiers de la mission — joints à un commentaire ou déposés directement — toutes phases et toutes tâches confondues. Chaque document indique la tâche dont il dépend."
    />
  );
}
