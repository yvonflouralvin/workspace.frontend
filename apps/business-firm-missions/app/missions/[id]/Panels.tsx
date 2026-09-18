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
  STATUT_TACHE_LABELS,
  PRIORITE_LABELS,
  type Mission,
  type Phase,
  type Tache,
  type StatutTache,
} from "@/lib/bfm-missions-api";
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

function PhaseCard({
  missionId,
  phase,
  taches,
  reload,
}: {
  missionId: number;
  phase: Phase;
  taches: Tache[];
  reload: () => void;
}) {
  const [ajout, setAjout] = useState(false);
  const [titre, setTitre] = useState("");

  async function ajouterTache(e: React.FormEvent) {
    e.preventDefault();
    await createTache(missionId, phase.id, { titre });
    setTitre("");
    setAjout(false);
    reload();
  }

  async function supprimerPhase() {
    try {
      await deletePhase(missionId, phase.id);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 space-y-3">
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-transparent text-body-md font-semibold text-on-surface outline-none focus:underline"
          value={phase.nom}
          onChange={(e) => updatePhase(missionId, phase.id, { nom: e.target.value }).then(reload)}
        />
        <select
          className={FIELD}
          value={phase.statut}
          onChange={(e) => updatePhase(missionId, phase.id, { statut: e.target.value as Phase["statut"] }).then(reload)}
        >
          <option value="A_VENIR">À venir</option>
          <option value="EN_COURS">En cours</option>
          <option value="CLOTUREE">Clôturée</option>
        </select>
        <button onClick={supprimerPhase} className="text-outline hover:text-error transition-colors">
          <DeleteOutlineOutlined style={{ fontSize: 17 }} />
        </button>
      </div>

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
          <input className={`${FIELD} flex-1`} placeholder="Nouvelle tâche" value={titre} onChange={(e) => setTitre(e.target.value)} required autoFocus />
          <button type="button" onClick={() => setAjout(false)} className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">Annuler</button>
          <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
        </form>
      ) : (
        <button onClick={() => setAjout(true)} className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline">
          <AddOutlined style={{ fontSize: 15 }} /> Ajouter une tâche
        </button>
      )}
    </div>
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
  const [ajoutPhase, setAjoutPhase] = useState(false);
  const [nomPhase, setNomPhase] = useState("");

  async function ajouterPhase(e: React.FormEvent) {
    e.preventDefault();
    await createPhase(missionId, { nom: nomPhase });
    setNomPhase("");
    setAjoutPhase(false);
    reload();
  }

  return (
    <div className="space-y-3">
      {phases.map((phase) => (
        <PhaseCard
          key={phase.id}
          missionId={missionId}
          phase={phase}
          taches={taches.filter((t) => t.phase_id === phase.id)}
          reload={reload}
        />
      ))}

      {ajoutPhase ? (
        <form onSubmit={ajouterPhase} className="flex items-end gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <input className={`${FIELD} flex-1`} placeholder="Nom de la phase" value={nomPhase} onChange={(e) => setNomPhase(e.target.value)} required autoFocus />
          <button type="button" onClick={() => setAjoutPhase(false)} className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">Annuler</button>
          <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Créer</button>
        </form>
      ) : (
        <button
          onClick={() => setAjoutPhase(true)}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-dashed border-outline-soft text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
        >
          <AddOutlined style={{ fontSize: 16 }} /> Ajouter une phase
        </button>
      )}
    </div>
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
