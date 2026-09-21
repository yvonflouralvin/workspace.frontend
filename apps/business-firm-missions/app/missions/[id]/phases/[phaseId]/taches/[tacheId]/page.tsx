"use client";

import { useEffect, useMemo, useState } from "react";
import { InfoOutlined } from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
import { FilCommentaires } from "@repo/ui/FilCommentaires";
import { Switch } from "@repo/ui/Switch";
import {
  PRIORITE_LABELS,
  TYPE_TACHE_LABELS,
  listMembresMission,
  type MembreMission,
  type PrioriteTache,
  type TypeTache,
} from "@/lib/bfm-missions-api";
import { apiFilTache } from "@/lib/fil-tache-api";
import { useDiffere } from "@/lib/differe";
import { ChampMembre } from "@/components/SelecteurMembre";
import { getTiers } from "@/lib/tiers-api";
import { useMission } from "../../../../mission-context";
import { LABEL, MetaRow, StatutTachePill, libelleAction } from "../../../../ui";
import { SuiviControle } from "./suivi-controle";
import { useTache } from "./tache-context";

const CONTROLE =
  "h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary";

export default function ApercuTachePage() {
  const { mission, membres, missionId } = useMission();
  const { tache, enregistrer, erreur } = useTache();
  const [nomClient, setNomClient] = useState<string | null>(null);
  // Les gens de la mission, avec leurs droits : à eux seuls on assigne, et seuls certains valident.
  const [equipe, setEquipe] = useState<MembreMission[] | null>(null);
  useEffect(() => {
    listMembresMission(missionId).then(setEquipe).catch(() => setEquipe([]));
  }, [missionId]);
  const enNom = (m: MembreMission) => ({ id: m.user_id, name: m.user_name ?? `Utilisateur #${m.user_id}` });
  const avecCourant = (liste: { id: number; name: string }[], id: number | null) =>
    id === null || liste.some((m) => m.id === id)
      ? liste
      : [...liste, membres.find((m) => m.id === id) ?? { id, name: `Utilisateur #${id}` }];
  const choixExecutants = avecCourant(equipe ? equipe.map(enNom) : membres, tache.assignee_user_id);
  const choixValidateurs = avecCourant(
    (equipe ?? []).filter((m) => m.peut_valider && m.user_id !== tache.assignee_user_id).map(enNom),
    tache.validateur_user_id,
  );
  const moi = useSessionStore((s) => s.user?.id);
  const complet = equipe?.find((m) => m.user_id === moi)?.complet ?? false;
  const modifiable = tache.peut_modifier;

  const pousserDescription = useDiffere((json: string) => enregistrer({ description_rich: json }));

  const api = useMemo(() => apiFilTache("equipe", tache.id), [tache.id]);
  const personnes = useMemo(() => membres.map((m) => ({ id: m.id, nom: m.name })), [membres]);

  useEffect(() => {
    if (mission.tiers_id === null) return;
    getTiers(mission.tiers_id)
      .then((t) => setNomClient(t.nom))
      .catch(() => setNomClient(null));
  }, [mission.tiers_id]);

  const sansClient = mission.tiers_id === null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
      <div className="min-w-0">
        {erreur && (
          <p className="mb-3 text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{erreur}</p>
        )}

        <p className={`${LABEL} mb-2`}>{tache.type_tache === "CONTROLE" ? "Description du contrôle" : "Description"}</p>
        <div className={`rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden ${modifiable ? "" : "pointer-events-none opacity-80"}`}>
          <RichTextEditor
            key={tache.id}
            value={tache.description_rich}
            fallbackText={tache.description}
            placeholder={
              tache.type_tache === "CONTROLE"
                ? "Ce qu'il faut contrôler, le périmètre, la méthode…"
                : "Ce qu'il y a à faire, le contexte, les critères d'acceptation…"
            }
            className="min-h-[12rem]"
            onChange={pousserDescription}
          />
        </div>

        {tache.type_tache === "CONTROLE" && (
          <div className="mt-6">
            <SuiviControle />
          </div>
        )}

        {tache.type_tache === "DOCUMENT_A_FOURNIR" && (
          <p className="mt-6 flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2 text-body-sm text-on-surface-variant">
            <InfoOutlined style={{ fontSize: 16 }} className="mt-0.5 flex-none text-primary" />
            <span>
              {tache.assignee_client
                ? "Le client doit remettre un document : il le dépose depuis son portail, et vous le retrouvez dans l'onglet Documents."
                : "Le client doit remettre un document, mais cette tâche ne lui est pas assignée : il ne la voit pas dans son portail. Activez « Assignée au client »."}
            </span>
          </p>
        )}

        <div className="mt-6">
          {tache.assignee_client && (
            <p className="mb-3 flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2 text-body-sm text-on-surface-variant">
              <InfoOutlined style={{ fontSize: 16 }} className="mt-0.5 flex-none text-primary" />
              <span>
                Cette tâche est assignée au client : il voit ce fil et les documents. Cochez « Note
                interne » pour un message que seule l&apos;équipe lira.
              </span>
            </p>
          )}
          <FilCommentaires api={api} membres={personnes} canWrite={tache.peut_commenter} optionInterne />
        </div>
      </div>

      <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
        <MetaRow label="Type">
          <select
            value={tache.type_tache}
            disabled={!modifiable}
            onChange={(e) => void enregistrer({ type_tache: e.target.value as TypeTache })}
            className={`${CONTROLE} disabled:opacity-60`}
          >
            {Object.entries(TYPE_TACHE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </MetaRow>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-body-sm text-on-surface-variant">Statut</span>
            <StatutTachePill statut={tache.statut} />
          </div>
          {tache.statuts_possibles.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {tache.statuts_possibles.map((suivant) => (
                <button
                  key={suivant}
                  type="button"
                  onClick={() => void enregistrer({ statut: suivant })}
                  className={`h-8 rounded-lg px-3 text-body-sm font-semibold transition-colors ${
                    suivant === "A_REVOIR"
                      ? "border border-error/40 text-error hover:bg-error-container/40"
                      : "bg-primary text-on-primary hover:bg-primary-container"
                  }`}
                >
                  {libelleAction(tache.statut, suivant)}
                </button>
              ))}
            </div>
          )}
          {tache.statuts_possibles.length === 0 && tache.statut !== "VALIDEE" && (
            <p className="mt-2 text-label-md text-outline">
              {tache.statut === "TERMINEE"
                ? "En attente de validation."
                : tache.assignee_user_id === null
                  ? "Personne n'est assigné à cette tâche."
                  : "Seul l'exécutant fait avancer cette tâche."}
            </p>
          )}
        </div>

        <MetaRow label="Priorité">
          <select
            value={tache.priorite}
            disabled={!modifiable}
            onChange={(e) => void enregistrer({ priorite: e.target.value as PrioriteTache })}
            className={`${CONTROLE} disabled:opacity-60`}
          >
            {Object.entries(PRIORITE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </MetaRow>

        <MetaRow label="Exécutant">
          <ChampMembre
            valeur={tache.assignee_user_id}
            membres={choixExecutants}
            placeholder="Non assignée"
            disabled={!modifiable}
            onChange={(id) => void enregistrer({ assignee_user_id: id })}
          />
        </MetaRow>

        <MetaRow label="Validateur">
          <ChampMembre
            valeur={tache.validateur_user_id}
            membres={choixValidateurs}
            placeholder="Aucun désigné"
            disabled={!complet}
            onChange={(id) => void enregistrer({ validateur_user_id: id })}
          />
        </MetaRow>

        <MetaRow label="Échéance">
          <input
            type="date"
            value={tache.due_date ? tache.due_date.slice(0, 10) : ""}
            disabled={!modifiable}
            onChange={(e) => void enregistrer({ due_date: e.target.value || null })}
            className={`${CONTROLE} disabled:opacity-60`}
          />
        </MetaRow>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-body-sm text-on-surface-variant">Assignée au client</span>
            <Switch
              checked={tache.assignee_client}
              disabled={!modifiable || (sansClient && !tache.assignee_client)}
              label="Assigner cette tâche au client"
              onChange={(v) => void enregistrer({ assignee_client: v })}
            />
          </div>
          <p className="mt-1.5 text-label-md text-outline">
            {sansClient
              ? "Cette mission n'est rattachée à aucun client."
              : tache.assignee_client
                ? `${nomClient ?? "Le client"} voit la tâche, son fil et ses documents — jamais les notes internes.`
                : `Assignée, la tâche apparaît dans le portail de ${nomClient ?? "son client"}.`}
          </p>
        </div>
      </aside>
    </div>
  );
}
