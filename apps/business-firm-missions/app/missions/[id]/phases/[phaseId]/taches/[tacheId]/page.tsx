"use client";

import { useEffect, useMemo, useState } from "react";
import { InfoOutlined } from "@mui/icons-material";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
import { FilCommentaires } from "@repo/ui/FilCommentaires";
import { Switch } from "@repo/ui/Switch";
import {
  PRIORITE_LABELS,
  STATUT_TACHE_LABELS,
  type PrioriteTache,
  type StatutTache,
} from "@/lib/bfm-missions-api";
import { apiFilTache } from "@/lib/fil-tache-api";
import { useDiffere } from "@/lib/differe";
import { ChampMembre } from "@/components/SelecteurMembre";
import { getTiers } from "@/lib/tiers-api";
import { useMission } from "../../../../mission-context";
import { LABEL, MetaRow } from "../../../../ui";
import { useTache } from "./tache-context";

const CONTROLE =
  "h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary";

export default function ApercuTachePage() {
  const { mission, membres } = useMission();
  const { tache, enregistrer, erreur } = useTache();
  const [nomClient, setNomClient] = useState<string | null>(null);

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

        <p className={`${LABEL} mb-2`}>Description</p>
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
          <RichTextEditor
            key={tache.id}
            value={tache.description_rich}
            fallbackText={tache.description}
            placeholder="Ce qu'il y a à faire, le contexte, les critères d'acceptation…"
            className="min-h-[12rem]"
            onChange={pousserDescription}
          />
        </div>

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
          <FilCommentaires api={api} membres={personnes} canWrite optionInterne />
        </div>
      </div>

      <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
        <MetaRow label="Statut">
          <select
            value={tache.statut}
            onChange={(e) => void enregistrer({ statut: e.target.value as StatutTache })}
            className={`${CONTROLE} font-semibold`}
          >
            {Object.entries(STATUT_TACHE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </MetaRow>

        <MetaRow label="Priorité">
          <select
            value={tache.priorite}
            onChange={(e) => void enregistrer({ priorite: e.target.value as PrioriteTache })}
            className={CONTROLE}
          >
            {Object.entries(PRIORITE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </MetaRow>

        <MetaRow label="Assigné à">
          <ChampMembre
            valeur={tache.assignee_user_id}
            membres={membres}
            placeholder="Non assignée"
            onChange={(id) => void enregistrer({ assignee_user_id: id })}
          />
        </MetaRow>

        <MetaRow label="Échéance">
          <input
            type="date"
            value={tache.due_date ? tache.due_date.slice(0, 10) : ""}
            onChange={(e) => void enregistrer({ due_date: e.target.value || null })}
            className={CONTROLE}
          />
        </MetaRow>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-body-sm text-on-surface-variant">Assignée au client</span>
            <Switch
              checked={tache.assignee_client}
              disabled={sansClient && !tache.assignee_client}
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
