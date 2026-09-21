"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OpenInFullOutlined } from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
import { Switch } from "@repo/ui/Switch";
import {
  createTache,
  listMembresMission,
  updateTache,
  PRIORITE_LABELS,
  STATUT_TACHE_LABELS,
  TYPE_TACHE_LABELS,
  type MembreMission,
  type Phase,
  type PrioriteTache,
  type StatutTache,
  type Tache,
  type TypeTache,
} from "@/lib/bfm-missions-api";
import { ChampMembre } from "@/components/SelecteurMembre";
import type { Membre } from "@/lib/membres-api";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1";

const TYPES: { type: TypeTache; aide: string }[] = [
  { type: "STANDARD", aide: "Une tâche ordinaire." },
  { type: "DOCUMENT_A_FOURNIR", aide: "Le client doit remettre un document." },
  { type: "CONTROLE", aide: "Constats, risques, recommandations et actions correctives." },
];

/** L'aperçu d'une tâche en tiroir — le pendant de celui d'une phase.
 *
 *  « Ouvrir la page » mène au détail complet (discussion, documents) : le tiroir sert à corriger
 *  vite, pas à tenir une conversation. */
export function TacheDrawer({
  missionId,
  phaseId,
  tache,
  membres,
  clientDisponible,
  phases,
  onClose,
  onSaved,
}: {
  missionId: number;
  /** La phase de la tâche — ou celle proposée par défaut à la création. */
  phaseId: number;
  /** Fournies, elles laissent choisir la phase à la création (vue de toute la mission). */
  phases?: Phase[];
  /** null = création. */
  tache: Tache | null;
  membres: Membre[];
  /** La mission a un client : sans lui, une tâche ne peut pas lui être assignée. */
  clientDisponible: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState(phaseId);
  const [type, setType] = useState<TypeTache>(tache?.type_tache ?? "STANDARD");
  const [titre, setTitre] = useState(tache?.titre ?? "");
  const [statut, setStatut] = useState<StatutTache>(tache?.statut ?? "A_FAIRE");
  const [priorite, setPriorite] = useState<PrioriteTache>(tache?.priorite ?? "AUCUNE");
  const [echeance, setEcheance] = useState(tache?.due_date ? tache.due_date.slice(0, 10) : "");
  const [assigne, setAssigne] = useState<number | null>(tache?.assignee_user_id ?? null);
  const [client, setClient] = useState(tache?.assignee_client ?? false);
  const [validateur, setValidateur] = useState<number | null>(tache?.validateur_user_id ?? null);
  const moi = useSessionStore((s) => s.user?.id);
  // Ceux qui travaillent sur CETTE mission, avec leurs droits : à eux seuls on assigne une tâche, et parmi
  // eux seuls ceux qui ont le droit de valider peuvent en être le validateur.
  const [equipe, setEquipe] = useState<MembreMission[] | null>(null);
  useEffect(() => {
    listMembresMission(missionId).then(setEquipe).catch(() => setEquipe([]));
  }, [missionId]);
  const complet = equipe?.find((m) => m.user_id === moi)?.complet ?? false;
  const enNom = (m: MembreMission): Membre => ({ id: m.user_id, name: m.user_name ?? `Utilisateur #${m.user_id}` });
  const avecCourant = (liste: Membre[], id: number | null): Membre[] =>
    id === null || liste.some((m) => m.id === id)
      ? liste
      : [...liste, membres.find((m) => m.id === id) ?? { id, name: `Utilisateur #${id}` }];
  const choixExecutants = avecCourant(equipe ? equipe.map(enNom) : membres, assigne);
  const choixValidateurs = avecCourant(
    (equipe ?? []).filter((m) => m.peut_valider && m.user_id !== assigne).map(enNom),
    validateur,
  );
  // Une tâche que l'on ne peut pas modifier reste ouverte pour agir dessus — démarrer, terminer, valider —
  // sans rien laisser éditer d'autre : tout est en lecture, seul le statut se change.
  const lecture = tache !== null && !tache.peut_modifier;
  const statutsOfferts: StatutTache[] = tache ? [tache.statut, ...tache.statuts_possibles] : [];
  // Le riche n'est envoyé que s'il a été TOUCHÉ : renvoyer la valeur d'origine ne coûte rien, mais
  // renvoyer « rien » effacerait la description d'une tâche qu'on n'a fait que renommer.
  const [description, setDescription] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enregistrer() {
    if (!titre.trim()) {
      setError("Le titre est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const commun = {
        type_tache: type,
        priorite,
        assignee_user_id: assigne,
        assignee_client: client,
        due_date: echeance || null,
        validateur_user_id: validateur,
        ...(description !== null ? { description_rich: description } : {}),
      };
      if (tache && lecture) await updateTache(missionId, tache.id, { statut });
      else if (tache) await updateTache(missionId, tache.id, { titre: titre.trim(), statut, ...commun });
      else await createTache(missionId, phase, { titre: titre.trim(), ...commun });
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
      setSaving(false);
    }
  }

  return (
    <RightDrawer
      title={tache ? "Aperçu de la tâche" : "Nouvelle tâche"}
      onClose={onClose}
      width="md:w-[560px] md:max-w-[92vw]"
      footer={
        <div className="flex items-center gap-2 w-full">
          {tache && (
            <button
              onClick={() => router.push(`/missions/${missionId}/phases/${tache.phase_id}/taches/${tache.id}`)}
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
            onClick={enregistrer}
            disabled={saving || !titre.trim() || (lecture && statut === tache?.statut)}
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : tache ? "Enregistrer" : "Créer"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={LABEL}>Type de tâche</label>
          <div role="radiogroup" aria-label="Type de tâche" className="grid grid-cols-3 gap-2">
            {TYPES.map(({ type: t, aide }) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                disabled={lecture}
                onClick={() => {
                  setType(t);
                  // « Document à fournir » : c'est le client qui doit remettre le document, donc la tâche
                  // lui revient. Proposé, jamais imposé — et seulement à la création : sur une tâche
                  // existante, on ne réassigne pas en douce en changeant un libellé.
                  if (!tache && t === "DOCUMENT_A_FOURNIR" && clientDisponible) setClient(true);
                }}
                className={`rounded-xl border px-2.5 py-2 text-left transition-colors disabled:cursor-not-allowed ${
                  type === t
                    ? "border-primary bg-primary/5"
                    : "border-outline-soft bg-surface-container-lowest hover:bg-surface-container-low"
                }`}
              >
                <span className={`block text-body-sm font-semibold ${type === t ? "text-primary" : "text-on-surface"}`}>
                  {TYPE_TACHE_LABELS[t]}
                </span>
                <span className="block text-label-md text-outline leading-snug">{aide}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={LABEL}>Titre</label>
          <input
            className={`${FIELD} w-full`}
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Ce qu'il y a à faire"
            autoFocus={!tache}
            readOnly={lecture}
          />
        </div>

        {!tache && phases && phases.length > 1 && (
          <div>
            <label className={LABEL}>Phase</label>
            <select className={`${FIELD} w-[240px]`} value={phase} onChange={(e) => setPhase(Number(e.target.value))}>
              {phases.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </select>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          {tache && (
            <div>
              <label className={LABEL}>Statut</label>
              <select
                className={`${FIELD} w-[170px]`}
                value={statut}
                disabled={statutsOfferts.length <= 1}
                onChange={(e) => setStatut(e.target.value as StatutTache)}
              >
                {(Object.keys(STATUT_TACHE_LABELS) as StatutTache[])
                  .filter((v) => statutsOfferts.includes(v))
                  .map((v) => <option key={v} value={v}>{STATUT_TACHE_LABELS[v]}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className={LABEL}>Priorité</label>
            <select className={`${FIELD} w-[130px]`} value={priorite} disabled={lecture} onChange={(e) => setPriorite(e.target.value as PrioriteTache)}>
              {Object.entries(PRIORITE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Échéance</label>
            <input type="date" className={FIELD} value={echeance} disabled={lecture} onChange={(e) => setEcheance(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={LABEL}>Assignée à</label>
          <ChampMembre valeur={assigne} membres={choixExecutants} placeholder="Non assignée" onChange={setAssigne} disabled={lecture} />
          <p className="mt-1 text-label-md text-outline">L&apos;exécutant démarre la tâche puis la termine.</p>
        </div>

        <div>
          <label className={LABEL}>Validateur</label>
          <ChampMembre
            valeur={validateur}
            membres={choixValidateurs}
            placeholder="Aucun désigné"
            onChange={setValidateur}
            disabled={lecture || !complet}
          />
          <p className="mt-1 text-label-md text-outline">
            {complet
              ? "Passe la tâche de « Terminée » à « Validée », ou la remet à revoir. Il doit en avoir le droit dans l'équipe ; sans validateur désigné, tout membre habilité peut valider."
              : "Désigné par le responsable de la mission."}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-outline-soft px-3 py-2.5">
          <span className="min-w-0">
            <span className="block text-body-sm text-on-surface">Assignée au client</span>
            <span className="block text-label-md text-outline">
              {clientDisponible
                ? "Le client la voit dans son portail, avec le fil et les documents."
                : "Cette mission n'est rattachée à aucun client."}
            </span>
          </span>
          <Switch
            checked={client}
            disabled={lecture || (!clientDisponible && !client)}
            label="Assigner cette tâche au client"
            onChange={setClient}
          />
        </div>

        <div>
          <label className={LABEL}>{type === "CONTROLE" ? "Description du contrôle" : "Description"}</label>
          <div className={`rounded-xl border border-outline-soft bg-surface-container-lowest overflow-hidden ${lecture ? "pointer-events-none opacity-70" : ""}`}>
            <RichTextEditor
              value={tache?.description_rich ?? null}
              fallbackText={tache?.description ?? null}
              placeholder={
                type === "CONTROLE"
                  ? "Ce qu'il faut contrôler, le périmètre, la méthode…"
                  : "Ce qu'il y a à faire, le contexte, les critères d'acceptation…"
              }
              className="min-h-[9rem]"
              onChange={(json) => setDescription(json)}
            />
          </div>
        </div>

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}
      </div>
    </RightDrawer>
  );
}
