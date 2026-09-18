"use client";

import { useEffect, useState } from "react";
import {
  updateMission,
  createPhase,
  updatePhase,
  deletePhase,
  createTache,
  updateTache,
  deleteTache,
  listEquipeMission,
  addEquipeMission,
  removeEquipeMission,
  STATUT_MISSION_LABELS,
  STATUT_PHASE_LABELS,
  STATUT_TACHE_LABELS,
  PRIORITE_LABELS,
  type Mission,
  type Phase,
  type Tache,
  type StatutTache,
} from "@/lib/bfm-missions-api";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { AddOutlined, DeleteOutlineOutlined } from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1";

// ───────────────────────── Aperçu ─────────────────────────

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-body-sm text-on-surface-variant">{label}</span>
      {children}
    </div>
  );
}

function TextValue({ value, onSave, placeholder }: { value: string | null; onSave: (v: string | null) => void; placeholder?: string }) {
  const [v, setV] = useState(value ?? "");
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <input
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { const nv = v.trim() || null; if (nv !== (value ?? null)) onSave(nv); }}
      className="w-[190px] h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary text-right"
    />
  );
}

function NumberValue({ value, onSave, step }: { value: number | null; onSave: (v: number | null) => void; step?: string }) {
  const [v, setV] = useState(value !== null ? String(value) : "");
  useEffect(() => setV(value !== null ? String(value) : ""), [value]);
  return (
    <input
      type="number"
      step={step ?? "1"}
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { const nv = v === "" ? null : Number(v); if (nv !== value) onSave(nv); }}
      className="w-[110px] h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary text-right"
    />
  );
}

function DateValue({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
  return (
    <input
      type="date"
      value={value ? value.slice(0, 10) : ""}
      onChange={(e) => onSave(e.target.value || null)}
      className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary"
    />
  );
}

export function ApercuPanel({ mission, reload }: { mission: Mission; reload: () => void }) {
  const [description, setDescription] = useState(mission.description ?? "");
  const [etatDesc, setEtatDesc] = useState<"idle" | "saving" | "saved">("idle");
  useEffect(() => setDescription(mission.description ?? ""), [mission.id, mission.description]);

  async function patch(fields: Record<string, unknown>) {
    await updateMission(mission.id, fields);
    reload();
  }

  async function enregistrerDescription() {
    const nv = description.trim() || null;
    if (nv === (mission.description ?? null)) return;
    setEtatDesc("saving");
    await patch({ description: nv });
    setEtatDesc("saved");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
      <div>
        <div className="flex items-center justify-between gap-4 mb-2">
          <p className={LABEL}>Objectif / description</p>
          {etatDesc !== "idle" && (
            <span className="text-label-md text-on-surface-variant">
              {etatDesc === "saving" ? "Enregistrement…" : "Enregistré"}
            </span>
          )}
        </div>
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
          <textarea
            className="w-full min-h-[16rem] p-4 bg-transparent text-body-md text-on-surface outline-none resize-y"
            placeholder="Décrivez l'objectif de la mission…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={enregistrerDescription}
          />
        </div>
      </div>

      <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
        <MetaRow label="Statut">
          <select
            value={mission.statut}
            onChange={(e) => patch({ statut: e.target.value })}
            className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm font-semibold text-on-surface outline-none focus:border-primary"
          >
            {Object.entries(STATUT_MISSION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </MetaRow>
        <MetaRow label="Type de mission">
          <TextValue value={mission.type_mission} onSave={(v) => patch({ type_mission: v })} placeholder="Conseil, fiscal…" />
        </MetaRow>
        <MetaRow label="Département">
          <TextValue value={mission.departement} onSave={(v) => patch({ departement: v })} />
        </MetaRow>
        <MetaRow label="Priorité">
          <select
            value={mission.priorite}
            onChange={(e) => patch({ priorite: e.target.value })}
            className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary"
          >
            {Object.entries(PRIORITE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </MetaRow>
        <MetaRow label="Responsable">
          <TextValue
            value={mission.responsable_user_id ? String(mission.responsable_user_id) : null}
            onSave={(v) => patch({ responsable_user_id: v ? Number(v) : null })}
            placeholder="ID utilisateur"
          />
        </MetaRow>
        <MetaRow label="Début">
          <DateValue value={mission.start_date} onSave={(v) => patch({ start_date: v })} />
        </MetaRow>
        <MetaRow label="Échéance">
          <DateValue value={mission.due_date} onSave={(v) => patch({ due_date: v })} />
        </MetaRow>
        <MetaRow label="Budget">
          <NumberValue value={mission.budget} onSave={(v) => patch({ budget: v })} />
        </MetaRow>
        <MetaRow label="Heures prévues">
          <NumberValue value={mission.heures_prevues} onSave={(v) => patch({ heures_prevues: v })} step="0.5" />
        </MetaRow>
        <MetaRow label="Code">
          <span className="font-mono text-body-sm text-on-surface" title="Non modifiable">{mission.code}</span>
        </MetaRow>
      </aside>
    </div>
  );
}

// ───────────────────────── Phases ─────────────────────────
// Même présentation que la liste des phases dans le module Projets :
// tableau à en-tête, pastille de statut, décompte des tâches, ouverture
// en RightDrawer. BFM reste plus simple — pas de sous-page dédiée par
// phase, la gestion des tâches se fait directement dans le tiroir.

const STATUT_PHASE_TONES: Record<Phase["statut"], { dot: string; chip: string }> = {
  A_VENIR: { dot: "bg-status-backlog", chip: "bg-status-backlog-container text-status-backlog-on" },
  EN_COURS: { dot: "bg-status-doing", chip: "bg-status-doing-container text-status-doing" },
  CLOTUREE: { dot: "bg-status-done", chip: "bg-status-done-container text-status-done" },
};

function StatutPhasePill({ statut }: { statut: Phase["statut"] }) {
  const tone = STATUT_PHASE_TONES[statut];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-md font-semibold ${tone.chip}`}>
      <span className={`w-[6px] h-[6px] rounded-full ${tone.dot}`} />
      {STATUT_PHASE_LABELS[statut]}
    </span>
  );
}

export function PhasesPanel({
  missionId,
  phases,
  taches,
  reload,
}: {
  missionId: number;
  phases: Phase[];
  taches: Tache[];
  reload: () => void;
}) {
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
      reload();
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
        <p className="text-label-md text-outline">
          Supprimer une phase supprime aussi ses tâches.
        </p>
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
  reload: () => void;
}) {
  const [nom, setNom] = useState(phase?.nom ?? "");
  const [description, setDescription] = useState(phase?.description ?? "");
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
    const desc = description.trim() || undefined;
    try {
      if (phase) await updatePhase(missionId, phase.id, { nom: nom.trim(), description: desc ?? null, statut });
      else await createPhase(missionId, { nom: nom.trim(), description: desc });
      reload();
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
    reload();
  }

  return (
    <RightDrawer
      title={phase ? "Aperçu de la phase" : "Nouvelle phase"}
      onClose={onClose}
      width="md:w-[560px] md:max-w-[92vw]"
      footer={
        <div className="flex items-center gap-2 w-full">
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
          <textarea
            className={`${FIELD} w-full`}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Objectif de la phase…"
          />
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

// ───────────────────────── Paramètres (dont l'équipe) ─────────────────────────

function EquipeSection({ missionId }: { missionId: number }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listEquipeMission>> | null>(null);
  const [userId, setUserId] = useState("");

  function reload() { listEquipeMission(missionId).then(setItems); }
  useEffect(reload, [missionId]);

  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 space-y-2">
      <p className="text-body-md font-semibold text-on-surface">Collaborateurs affectés</p>
      <div className="flex items-end gap-2">
        <input className={FIELD} placeholder="ID utilisateur" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <button onClick={() => userId && addEquipeMission(missionId, Number(userId)).then(() => { setUserId(""); reload(); })} className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">
          Ajouter
        </button>
      </div>
      {items && items.length > 0 && (
        <ul className="space-y-1">
          {items.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-body-sm">
              <span className="flex-1">{m.user_name ?? `Utilisateur #${m.user_id}`}</span>
              <button onClick={() => removeEquipeMission(missionId, m.user_id).then(reload)} className="text-outline hover:text-error transition-colors">
                <DeleteOutlineOutlined style={{ fontSize: 15 }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ParametresPanel({ mission }: { mission: Mission }) {
  return (
    <div className="space-y-4">
      <EquipeSection missionId={mission.id} />
    </div>
  );
}
