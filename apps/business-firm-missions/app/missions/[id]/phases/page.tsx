"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddOutlined, DeleteOutlineOutlined, OpenInFullOutlined } from "@mui/icons-material";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
import {
  createPhase,
  updatePhase,
  deletePhase,
  createTache,
  updateTache,
  deleteTache,
  STATUT_PHASE_LABELS,
  STATUT_TACHE_LABELS,
  type Phase,
  type Tache,
  type StatutTache,
} from "@/lib/bfm-missions-api";
import { useMission } from "../mission-context";
import { FIELD, LABEL, StatutPhasePill } from "../ui";

// Même présentation que la liste des phases du module Projets : tableau à
// en-tête, pastille de statut, décompte des tâches. Un clic ouvre l'aperçu en
// tiroir ; « Ouvrir la page » mène à la page de la phase.

export default function PhasesPage() {
  const { missionId, phases, taches, reload } = useMission();
  const [error, setError] = useState<string | null>(null);
  // drawer : Phase = édition, null = création, false = fermé.
  const [drawer, setDrawer] = useState<Phase | null | false>(false);

  const ordered = [...phases].sort((a, b) => a.position - b.position || a.id - b.id);

  async function supprimerPhase(phase: Phase) {
    if (phases.length <= 1) {
      setError("Une mission doit garder au moins une phase.");
      return;
    }
    try {
      await deletePhase(missionId, phase.id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
        <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
          <span className="flex-1 min-w-0">Phase</span>
          <span className="w-[130px] flex-none">Statut</span>
          <span className="w-[80px] flex-none text-center">Tâches</span>
          <span className="w-[40px] flex-none" />
        </div>

        {ordered.map((phase, i) => {
          const n = taches.filter((t) => t.phase_id === phase.id).length;
          return (
            <div
              key={phase.id}
              className="flex flex-wrap md:flex-nowrap items-start md:items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3 border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors"
            >
              <button onClick={() => setDrawer(phase)} className="w-full md:flex-1 min-w-0 text-left">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-label-sm text-outline">{i + 1}.</span>
                  <span className="text-body-md font-medium text-on-surface truncate">{phase.nom}</span>
                </span>
                {phase.description && (
                  <span className="block text-label-md text-outline truncate">{phase.description}</span>
                )}
              </button>
              <span className="md:w-[130px] flex-none">
                <StatutPhasePill statut={phase.statut} />
              </span>
              <span className="md:w-[80px] flex-none md:text-center text-body-sm text-on-surface-variant tabular-nums">
                {n}
              </span>
              <span className="md:w-[40px] flex-none flex md:justify-end">
                <button
                  onClick={() => supprimerPhase(phase)}
                  title="Supprimer"
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors"
                >
                  <DeleteOutlineOutlined style={{ fontSize: 16 }} />
                </button>
              </span>
            </div>
          );
        })}

        <div className="px-4 md:px-5 py-3 border-t border-hairline">
          <button
            onClick={() => setDrawer(null)}
            className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Ajouter une phase
          </button>
        </div>
      </div>

      {phases.length > 1 && (
        <p className="text-label-md text-outline">Supprimer une phase supprime aussi ses tâches.</p>
      )}

      {drawer !== false && (
        <PhaseDrawer
          missionId={missionId}
          phase={drawer}
          taches={drawer ? taches.filter((t) => t.phase_id === drawer.id) : []}
          onClose={() => setDrawer(false)}
          reload={reload}
        />
      )}
    </div>
  );
}

function PhaseDrawer({
  missionId,
  phase,
  taches,
  onClose,
  reload,
}: {
  missionId: number;
  phase: Phase | null;
  taches: Tache[];
  onClose: () => void;
  reload: () => Promise<void>;
}) {
  const router = useRouter();
  const [nom, setNom] = useState(phase?.nom ?? "");
  // Le riche n'est envoyé que s'il a été TOUCHÉ : renvoyer « rien » effacerait la description
  // d'une phase qu'on n'a fait que renommer.
  const [description, setDescription] = useState<string | null>(null);
  const [statut, setStatut] = useState<Phase["statut"]>(phase?.statut ?? "A_VENIR");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ajout, setAjout] = useState(false);
  const [titreTache, setTitreTache] = useState("");

  async function save() {
    if (!nom.trim()) {
      setError("Le nom de la phase est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    const riche = description !== null ? { description_rich: description } : {};
    try {
      if (phase) await updatePhase(missionId, phase.id, { nom: nom.trim(), statut, ...riche });
      else await createPhase(missionId, { nom: nom.trim(), ...riche });
      await reload();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
      setSaving(false);
    }
  }

  async function ajouterTache(e: React.FormEvent) {
    e.preventDefault();
    if (!phase) return;
    await createTache(missionId, phase.id, { titre: titreTache });
    setTitreTache("");
    setAjout(false);
    await reload();
  }

  return (
    <RightDrawer
      title={phase ? "Aperçu de la phase" : "Nouvelle phase"}
      onClose={onClose}
      width="md:w-[560px] md:max-w-[92vw]"
      footer={
        <div className="flex items-center gap-2 w-full">
          {phase && (
            <button
              onClick={() => router.push(`/missions/${missionId}/phases/${phase.id}`)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-soft text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <OpenInFullOutlined style={{ fontSize: 15 }} />
              Ouvrir la page
            </button>
          )}
          <span className="flex-1" />
          <button onClick={onClose} className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving || !nom.trim()}
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : phase ? "Enregistrer" : "Créer"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={LABEL}>Titre</label>
          <input
            className={`${FIELD} w-full`}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom de la phase (ex. Cadrage, Terrain…)"
            autoFocus={!phase}
          />
        </div>

        <div>
          <label className={LABEL}>Statut</label>
          <select className={`${FIELD} w-[180px]`} value={statut} onChange={(e) => setStatut(e.target.value as Phase["statut"])}>
            {Object.entries(STATUT_PHASE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div>
          <label className={LABEL}>Description</label>
          <div className="rounded-xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            <RichTextEditor
              value={phase?.description_rich ?? null}
              fallbackText={phase?.description ?? null}
              placeholder="Objectif de la phase, ce qui change…"
              className="min-h-[9rem]"
              onChange={(json) => setDescription(json)}
            />
          </div>
        </div>

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}

        {phase && (
          <div className="pt-2 border-t border-hairline space-y-2">
            <p className="text-label-sm uppercase text-outline">Tâches</p>
            {taches.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">Aucune tâche.</p>
            ) : (
              <ul className="rounded-xl border border-hairline divide-y divide-hairline">
                {taches.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="flex-1 text-body-sm text-on-surface">{t.titre}</span>
                    {t.assignee_nom && <span className="text-label-md text-outline">{t.assignee_nom}</span>}
                    <select
                      className={FIELD}
                      value={t.statut}
                      onChange={(e) => updateTache(missionId, t.id, { statut: e.target.value as StatutTache }).then(reload)}
                    >
                      {Object.entries(STATUT_TACHE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <button onClick={() => deleteTache(missionId, t.id).then(reload)} className="text-outline hover:text-error transition-colors">
                      <DeleteOutlineOutlined style={{ fontSize: 16 }} />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {ajout ? (
              <form onSubmit={ajouterTache} className="flex items-end gap-2">
                <input className={`${FIELD} flex-1`} placeholder="Nouvelle tâche" value={titreTache} onChange={(e) => setTitreTache(e.target.value)} required autoFocus />
                <button type="button" onClick={() => setAjout(false)} className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">Annuler</button>
                <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
              </form>
            ) : (
              <button onClick={() => setAjout(true)} className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline">
                <AddOutlined style={{ fontSize: 15 }} /> Ajouter une tâche
              </button>
            )}
          </div>
        )}
      </div>
    </RightDrawer>
  );
}
