"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AddOutlined,
  DeleteOutlineOutlined,
  PersonOutlined,
  ViewKanbanOutlined,
  ViewListOutlined,
} from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { ViewModeSwitch } from "@repo/ui/ViewModeSwitch";
import {
  createTache,
  deleteTache,
  updateTache,
  PRIORITE_LABELS,
  STATUT_TACHE_LABELS,
  type Mission,
  type Phase,
  type StatutTache,
  type Tache,
} from "@/lib/bfm-missions-api";
import type { Membre } from "@/lib/membres-api";
import { ChampMembre } from "@/components/SelecteurMembre";
import { KanbanTaches } from "@/components/KanbanTaches";
import { TacheDrawer } from "@/components/TacheDrawer";
import { FIELD } from "@/app/missions/[id]/ui";

type Vue = "liste" | "kanban";
const CLE_VUE = "bfm.taches.vue";

// Une commodité par personne, jamais un état qui doive survivre : sans stockage (navigation privée,
// données bloquées) la vue retombe simplement sur la liste.
function vueEnregistree(): Vue {
  try {
    return window.localStorage.getItem(CLE_VUE) === "kanban" ? "kanban" : "liste";
  } catch {
    return "liste";
  }
}

function Puce({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={actif}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-[38px] px-3 rounded-lg border text-body-sm font-medium whitespace-nowrap transition-colors ${
        actif
          ? "border-primary bg-primary/10 text-primary"
          : "border-outline-soft bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
      }`}
    >
      {children}
    </button>
  );
}

/** Les tâches d'une mission ou d'une phase : liste ou kanban, avec leurs filtres.
 *
 *  Un seul composant pour les deux niveaux — l'onglet Tâches de la mission (toutes les phases, en
 *  sections) et celui d'une phase (`phaseFixe`) : deux écrans qui filtreraient et glisseraient
 *  chacun à leur façon finiraient par ne plus se ressembler. */
export function VueTaches({
  missionId,
  mission,
  membres,
  taches,
  phases,
  phaseFixe,
  reload,
}: {
  missionId: number;
  mission: Mission;
  membres: Membre[];
  taches: Tache[];
  phases: Phase[];
  /** Tâches d'UNE phase : pas de regroupement, pas de filtre par phase. */
  phaseFixe?: Phase;
  reload: () => Promise<void>;
}) {
  const moi = useSessionStore((s) => s.user?.id);
  const [vue, setVue] = useState<Vue>("liste");
  const [recherche, setRecherche] = useState("");
  const [aMoi, setAMoi] = useState(false);
  const [duClient, setDuClient] = useState(false);
  const [phase, setPhase] = useState<number | "">("");
  const [statut, setStatut] = useState<StatutTache | "">("");
  const [drawer, setDrawer] = useState<Tache | null | false>(false);
  const [aSupprimer, setASupprimer] = useState<Tache | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ajout, setAjout] = useState(false);
  const [titre, setTitre] = useState("");

  useEffect(() => setVue(vueEnregistree()), []);
  function choisirVue(v: Vue) {
    setVue(v);
    try {
      window.localStorage.setItem(CLE_VUE, v);
    } catch {
      /* la vue reste choisie pour cette visite */
    }
  }

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }
  const modifier = (t: Tache, patch: Partial<Tache>) => run(() => updateTache(missionId, t.id, patch));

  const ordre = useMemo(
    () => [...phases].sort((a, b) => a.position - b.position || a.id - b.id),
    [phases],
  );
  const nomPhase = (id: number) => phases.find((p) => p.id === id)?.nom ?? null;

  const nbAMoi = taches.filter((t) => t.assignee_user_id === moi).length;
  const nbClient = taches.filter((t) => t.assignee_client).length;

  const visibles = taches.filter((t) => {
    if (aMoi && t.assignee_user_id !== moi) return false;
    if (duClient && !t.assignee_client) return false;
    if (phase !== "" && t.phase_id !== phase) return false;
    // Le kanban EST un regroupement par statut : un filtre de statut n'y aurait pas de sens.
    if (vue === "liste" && statut !== "" && t.statut !== statut) return false;
    const q = recherche.trim().toLowerCase();
    if (q && !t.titre.toLowerCase().includes(q)) return false;
    return true;
  });
  const filtre = aMoi || duClient || phase !== "" || statut !== "" || recherche.trim() !== "";
  function reinitialiser() {
    setAMoi(false);
    setDuClient(false);
    setPhase("");
    setStatut("");
    setRecherche("");
  }

  const parPhase = phaseFixe ? [{ phase: phaseFixe, taches: visibles }] : ordre
    .map((p) => ({ phase: p, taches: visibles.filter((t) => t.phase_id === p.id) }))
    .filter((g) => g.taches.length > 0);

  // Une FONCTION de rendu et non un composant : déclaré ici, un composant serait un nouveau type à
  // chaque rendu, React remonterait toutes les lignes, et un champ date perdrait le focus en pleine saisie.
  const ligne = (t: Tache) => {
    return (
      <div key={t.id} className="flex flex-wrap md:flex-nowrap items-center gap-x-4 gap-y-2 px-4 md:px-5 py-2.5 border-b border-hairline last:border-b-0">
        <button
          onClick={() => setDrawer(t)}
          className="w-full md:flex-1 min-w-0 flex items-center gap-2 text-left text-body-md text-on-surface hover:text-primary transition-colors"
        >
          <span className={`truncate ${t.statut === "TERMINEE" ? "text-outline line-through" : ""}`}>{t.titre}</span>
          {t.assignee_client && (
            <span
              className="flex-none inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-px text-label-sm font-semibold text-primary"
              title="Assignée au client"
            >
              <PersonOutlined style={{ fontSize: 12 }} />
              Client
            </span>
          )}
        </button>
        <span className="md:w-[190px] flex-none">
          <ChampMembre
            valeur={t.assignee_user_id}
            membres={membres}
            placeholder="Non assignée"
            onChange={(id) => modifier(t, { assignee_user_id: id })}
          />
        </span>
        <select
          className={`${FIELD} md:w-[110px] flex-none`}
          value={t.priorite}
          onChange={(e) => modifier(t, { priorite: e.target.value as Tache["priorite"] })}
        >
          {Object.entries(PRIORITE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input
          type="date"
          className={`${FIELD} md:w-[140px] flex-none`}
          value={t.due_date ? t.due_date.slice(0, 10) : ""}
          onChange={(e) => modifier(t, { due_date: e.target.value || null })}
        />
        <select
          className={`${FIELD} md:w-[120px] flex-none`}
          value={t.statut}
          onChange={(e) => modifier(t, { statut: e.target.value as StatutTache })}
        >
          {Object.entries(STATUT_TACHE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span className="md:w-[40px] flex-none flex md:justify-end">
          <button
            onClick={() => setASupprimer(t)}
            title="Supprimer"
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors"
          >
            <DeleteOutlineOutlined style={{ fontSize: 16 }} />
          </button>
        </span>
      </div>
    );
  }

  const enTete = (
    <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
      <span className="flex-1 min-w-0">Tâche</span>
      <span className="w-[190px] flex-none">Assigné à</span>
      <span className="w-[110px] flex-none">Priorité</span>
      <span className="w-[140px] flex-none">Échéance</span>
      <span className="w-[120px] flex-none">Statut</span>
      <span className="w-[40px] flex-none" />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher une tâche…"
          aria-label="Rechercher une tâche"
          className="h-[38px] w-full sm:w-[220px] rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary"
        />
        <Puce actif={aMoi} onClick={() => setAMoi((v) => !v)}>
          Assignées à moi
          <span className="tabular-nums text-label-md opacity-70">{nbAMoi}</span>
        </Puce>
        {mission.tiers_id !== null && (
          <Puce actif={duClient} onClick={() => setDuClient((v) => !v)}>
            <PersonOutlined style={{ fontSize: 15 }} />
            Assignées au client
            <span className="tabular-nums text-label-md opacity-70">{nbClient}</span>
          </Puce>
        )}
        {!phaseFixe && phases.length > 1 && (
          <select
            aria-label="Filtrer par phase"
            value={phase}
            onChange={(e) => setPhase(e.target.value === "" ? "" : Number(e.target.value))}
            className="h-[38px] rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary"
          >
            <option value="">Toutes les phases</option>
            {ordre.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
          </select>
        )}
        {vue === "liste" && (
          <select
            aria-label="Filtrer par statut"
            value={statut}
            onChange={(e) => setStatut(e.target.value as StatutTache | "")}
            className="h-[38px] rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUT_TACHE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
        <span className="flex-1" />
        <ViewModeSwitch
          value={vue}
          onChange={choisirVue}
          options={[
            { value: "liste", icon: <ViewListOutlined style={{ fontSize: 18 }} />, label: "Liste" },
            { value: "kanban", icon: <ViewKanbanOutlined style={{ fontSize: 18 }} />, label: "Kanban" },
          ]}
        />
        <button
          onClick={() => setDrawer(null)}
          className="inline-flex items-center gap-1.5 h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
        >
          <AddOutlined style={{ fontSize: 16 }} />
          Nouvelle tâche
        </button>
      </div>

      {filtre && (
        <p className="text-label-md text-outline">
          {visibles.length} tâche{visibles.length > 1 ? "s" : ""} sur {taches.length} ·{" "}
          <button onClick={reinitialiser} className="font-semibold text-primary hover:underline">
            réinitialiser les filtres
          </button>
        </p>
      )}

      {error && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}

      {vue === "kanban" ? (
        <KanbanTaches
          taches={visibles}
          phaseDe={phaseFixe ? undefined : (t) => nomPhase(t.phase_id)}
          onOuvrir={setDrawer}
          onDeplacer={(t, s) => modifier(t, { statut: s })}
        />
      ) : (
        <div className="space-y-4">
          {visibles.length === 0 && (!phaseFixe || filtre) && (
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-5 py-4 text-body-sm text-on-surface-variant">
              {filtre ? "Aucune tâche ne correspond à ces filtres." : "Aucune tâche pour le moment."}
            </div>
          )}
          {parPhase.map(({ phase: p, taches: liste }) =>
            liste.length === 0 && filtre && !phaseFixe ? null : (
              <section key={p.id}>
                {!phaseFixe && (
                  <p className="mb-1.5 flex items-center gap-2 text-body-sm font-semibold text-on-surface">
                    {p.nom}
                    <span className="text-label-md font-normal text-outline">{liste.length}</span>
                  </p>
                )}
                <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
                  {enTete}
                  {liste.map(ligne)}
                  {phaseFixe && (
                    <div className="px-4 md:px-5 py-3 border-t border-hairline">
                      {ajout ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            void run(async () => {
                              await createTache(missionId, p.id, { titre: titre.trim() });
                              setTitre("");
                              setAjout(false);
                            });
                          }}
                          className="flex items-end gap-2"
                        >
                          <input
                            className={`${FIELD} flex-1`}
                            placeholder="Nouvelle tâche"
                            value={titre}
                            onChange={(e) => setTitre(e.target.value)}
                            required
                            autoFocus
                          />
                          <button type="button" onClick={() => setAjout(false)} className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                            Annuler
                          </button>
                          <button type="submit" disabled={!titre.trim()} className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold disabled:opacity-50">
                            Ajouter
                          </button>
                        </form>
                      ) : (
                        <button
                          onClick={() => setAjout(true)}
                          className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline"
                        >
                          <AddOutlined style={{ fontSize: 16 }} />
                          Ajout rapide
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>
            ),
          )}
        </div>
      )}

      {drawer !== false && (
        <TacheDrawer
          missionId={missionId}
          phaseId={drawer ? drawer.phase_id : (phaseFixe?.id ?? ordre[0]?.id ?? 0)}
          phases={phaseFixe ? undefined : ordre}
          tache={drawer}
          membres={membres}
          clientDisponible={mission.tiers_id !== null}
          onClose={() => setDrawer(false)}
          onSaved={reload}
        />
      )}

      {aSupprimer && (
        <ConfirmDialog
          title={`Supprimer « ${aSupprimer.titre} » ?`}
          message="La tâche, sa discussion et ses documents seront retirés. C'est définitif."
          confirmLabel="Supprimer"
          onConfirm={() => {
            const t = aSupprimer;
            setASupprimer(null);
            void run(() => deleteTache(missionId, t.id));
          }}
          onCancel={() => setASupprimer(null)}
        />
      )}
    </div>
  );
}
