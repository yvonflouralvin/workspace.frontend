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
  type StatutMission,
  type StatutTache,
  type PrioriteTache,
} from "@/lib/bfm-missions-api";
import { AddOutlined, DeleteOutlineOutlined } from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1";

function montant(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("fr-FR");
}

// ───────────────────────── Aperçu ─────────────────────────

export function ApercuPanel({ mission }: { mission: Mission }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
        <p className="text-label-sm uppercase text-outline mb-1">Objectif / description</p>
        <p className="text-body-sm text-on-surface whitespace-pre-wrap">{mission.description || "Aucune description."}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-outline-soft px-3 py-2">
          <p className="text-label-sm uppercase text-outline">Type de mission</p>
          <p className="text-body-sm text-on-surface">{mission.type_mission ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-outline-soft px-3 py-2">
          <p className="text-label-sm uppercase text-outline">Département</p>
          <p className="text-body-sm text-on-surface">{mission.departement ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-outline-soft px-3 py-2">
          <p className="text-label-sm uppercase text-outline">Priorité</p>
          <p className="text-body-sm text-on-surface">{PRIORITE_LABELS[mission.priorite]}</p>
        </div>
        <div className="rounded-xl border border-outline-soft px-3 py-2">
          <p className="text-label-sm uppercase text-outline">Responsable</p>
          <p className="text-body-sm text-on-surface">{mission.responsable_user_id ? `Utilisateur #${mission.responsable_user_id}` : "—"}</p>
        </div>
        <div className="rounded-xl border border-outline-soft px-3 py-2">
          <p className="text-label-sm uppercase text-outline">Budget</p>
          <p className="text-body-sm text-on-surface">{montant(mission.budget)}</p>
        </div>
        <div className="rounded-xl border border-outline-soft px-3 py-2">
          <p className="text-label-sm uppercase text-outline">Heures prévues</p>
          <p className="text-body-sm text-on-surface">{mission.heures_prevues ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-outline-soft px-3 py-2">
          <p className="text-label-sm uppercase text-outline">Date de début</p>
          <p className="text-body-sm text-on-surface">{mission.start_date ?? "—"}</p>
        </div>
        <div className="rounded-xl border border-outline-soft px-3 py-2">
          <p className="text-label-sm uppercase text-outline">Date de clôture prévue</p>
          <p className="text-body-sm text-on-surface">{mission.due_date ?? "—"}</p>
        </div>
      </div>
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

export function ParametresPanel({ mission, reload }: { mission: Mission; reload: () => void }) {
  const [form, setForm] = useState({
    description: mission.description ?? "",
    type_mission: mission.type_mission ?? "",
    departement: mission.departement ?? "",
    responsable_user_id: mission.responsable_user_id ? String(mission.responsable_user_id) : "",
    priorite: mission.priorite,
    budget: mission.budget ? String(mission.budget) : "",
    heures_prevues: mission.heures_prevues ? String(mission.heures_prevues) : "",
    start_date: mission.start_date ?? "",
    due_date: mission.due_date ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await updateMission(mission.id, {
        description: form.description || null,
        type_mission: form.type_mission || null,
        departement: form.departement || null,
        responsable_user_id: form.responsable_user_id ? Number(form.responsable_user_id) : null,
        priorite: form.priorite,
        budget: form.budget ? Number(form.budget) : null,
        heures_prevues: form.heures_prevues ? Number(form.heures_prevues) : null,
        start_date: form.start_date || null,
        due_date: form.due_date || null,
      });
      reload();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={enregistrer} className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 space-y-4">
        <div>
          <span className={LABEL}>Objectif / description</span>
          <textarea className={`${FIELD} w-full`} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <span className={LABEL}>Statut</span>
          <select
            className={`${FIELD} w-full`}
            value={mission.statut}
            onChange={(e) => updateMission(mission.id, { statut: e.target.value as StatutMission }).then(reload)}
          >
            {Object.entries(STATUT_MISSION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className={LABEL}>Type de mission</span>
            <input className={`${FIELD} w-full`} value={form.type_mission} onChange={(e) => setForm({ ...form, type_mission: e.target.value })} />
          </div>
          <div>
            <span className={LABEL}>Département</span>
            <input className={`${FIELD} w-full`} value={form.departement} onChange={(e) => setForm({ ...form, departement: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className={LABEL}>Responsable (ID utilisateur)</span>
            <input className={`${FIELD} w-full`} value={form.responsable_user_id} onChange={(e) => setForm({ ...form, responsable_user_id: e.target.value.replace(/\D/g, "") })} />
          </div>
          <div>
            <span className={LABEL}>Priorité</span>
            <select className={`${FIELD} w-full`} value={form.priorite} onChange={(e) => setForm({ ...form, priorite: e.target.value as PrioriteTache })}>
              {Object.entries(PRIORITE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className={LABEL}>Budget</span>
            <input className={`${FIELD} w-full`} type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          </div>
          <div>
            <span className={LABEL}>Heures prévues</span>
            <input className={`${FIELD} w-full`} type="number" value={form.heures_prevues} onChange={(e) => setForm({ ...form, heures_prevues: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className={LABEL}>Date de début</span>
            <input className={`${FIELD} w-full`} type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <span className={LABEL}>Date de clôture prévue</span>
            <input className={`${FIELD} w-full`} type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          {saved && <span className="text-body-sm text-member-active">Enregistré.</span>}
        </div>
      </form>

      <EquipeSection missionId={mission.id} />
    </div>
  );
}
