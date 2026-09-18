"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getMission,
  updateMission,
  listPhases,
  createPhase,
  updatePhase,
  deletePhase,
  listTaches,
  createTache,
  updateTache,
  deleteTache,
  listEquipeMission,
  addEquipeMission,
  removeEquipeMission,
  STATUT_MISSION_LABELS,
  STATUT_PHASE_LABELS,
  STATUT_TACHE_LABELS,
  type Mission,
  type Phase,
  type Tache,
  type StatutMission,
  type StatutTache,
} from "@/lib/bfm-missions-api";
import { ArrowBackOutlined, AddOutlined, DeleteOutlineOutlined } from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

function PhaseCard({
  mission,
  phase,
  taches,
  reload,
}: {
  mission: Mission;
  phase: Phase;
  taches: Tache[];
  reload: () => void;
}) {
  const [ajout, setAjout] = useState(false);
  const [titre, setTitre] = useState("");

  async function ajouterTache(e: React.FormEvent) {
    e.preventDefault();
    await createTache(mission.id, phase.id, { titre });
    setTitre("");
    setAjout(false);
    reload();
  }

  async function supprimerPhase() {
    try {
      await deletePhase(mission.id, phase.id);
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
          onChange={(e) => updatePhase(mission.id, phase.id, { nom: e.target.value }).then(reload)}
        />
        <select
          className={FIELD}
          value={phase.statut}
          onChange={(e) => updatePhase(mission.id, phase.id, { statut: e.target.value as Phase["statut"] }).then(reload)}
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
                onChange={(e) => updateTache(mission.id, t.id, { statut: e.target.value as StatutTache }).then(reload)}
              >
                {Object.entries(STATUT_TACHE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={() => deleteTache(mission.id, t.id).then(reload)} className="text-outline hover:text-error transition-colors">
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

function EquipeSection({ missionId }: { missionId: number }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listEquipeMission>> | null>(null);
  const [userId, setUserId] = useState("");

  function reload() { listEquipeMission(missionId).then(setItems); }
  useEffect(reload, [missionId]);

  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 space-y-2">
      <p className="text-body-md font-semibold text-on-surface">Équipe</p>
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

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const missionId = Number(id);
  const [mission, setMission] = useState<Mission | null>(null);
  const [phases, setPhases] = useState<Phase[] | null>(null);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [ajoutPhase, setAjoutPhase] = useState(false);
  const [nomPhase, setNomPhase] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reload() {
    getMission(missionId).then(setMission).catch((err) => setError(err instanceof Error ? err.message : "Erreur inattendue"));
    listPhases(missionId).then(setPhases);
    listTaches(missionId).then(setTaches);
  }
  useEffect(reload, [missionId]);

  async function ajouterPhase(e: React.FormEvent) {
    e.preventDefault();
    await createPhase(missionId, { nom: nomPhase });
    setNomPhase("");
    setAjoutPhase(false);
    reload();
  }

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
          <select
            className={FIELD}
            value={mission.statut}
            onChange={(e) => updateMission(missionId, { statut: e.target.value as StatutMission }).then(reload)}
          >
            {Object.entries(STATUT_MISSION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {mission.description && (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <p className="text-label-sm uppercase text-outline mb-1">Objectif / description</p>
            <p className="text-body-sm text-on-surface">{mission.description}</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {mission.type_mission && (
            <div className="rounded-xl border border-outline-soft px-3 py-2">
              <p className="text-label-sm uppercase text-outline">Type de mission</p>
              <p className="text-body-sm text-on-surface">{mission.type_mission}</p>
            </div>
          )}
          {mission.departement && (
            <div className="rounded-xl border border-outline-soft px-3 py-2">
              <p className="text-label-sm uppercase text-outline">Département</p>
              <p className="text-body-sm text-on-surface">{mission.departement}</p>
            </div>
          )}
        </div>

        <EquipeSection missionId={missionId} />

        <div className="space-y-3">
          {phases.map((phase) => (
            <PhaseCard
              key={phase.id}
              mission={mission}
              phase={phase}
              taches={taches.filter((t) => t.phase_id === phase.id)}
              reload={reload}
            />
          ))}
        </div>

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
    </DashboardShell>
  );
}
