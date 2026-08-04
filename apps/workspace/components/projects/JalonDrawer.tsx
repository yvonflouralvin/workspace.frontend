"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { SelecteurPersonne } from "./SelecteurPersonne";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { Switch } from "@repo/ui/Switch";
import {
  JALON_ROLE_HINTS,
  JALON_ROLE_LABELS,
  JALON_ROLE_ORDER,
  jalonsApi,
  type Jalon,
  type JalonRole,
} from "@/app/lib/jalons-api";
import { projectsApi, type ProjectGroup } from "@/app/lib/projects-api";
import { useProject } from "@/app/(dashboard)/projects/[id]/project-context";

const FIELD =
  "w-full h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";

/** Création et édition d'un jalon. Le STATUT n'y figure pas : il ne s'écrit que
 *  par une décision, jamais à la main. */
export function JalonDrawer({
  jalon,
  phaseParDefaut,
  onClose,
  onSaved,
  onDeleted,
}: {
  jalon: Jalon | null;
  phaseParDefaut?: number | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  /** Non fourni = la suppression n'est pas proposée depuis cet écran. */
  onDeleted?: () => void | Promise<void>;
}) {
  const { projectId, phases, members } = useProject();

  const [nom, setNom] = useState(jalon?.nom ?? "");
  const [role, setRole] = useState<JalonRole>(jalon?.role ?? "sortie_de_phase");
  // À la création, on rattache par défaut à la première phase : un jalon de
  // « sortie de phase » sans phase ne veut rien dire, et l'écran projet ne
  // transmet aucun contexte de phase.
  const [phaseId, setPhaseId] = useState<number | null>(() => {
    if (jalon) return jalon.phase_id;
    if (phaseParDefaut != null) return phaseParDefaut;
    const premiere = [...phases].sort((a, b) => a.position - b.position || a.id - b.id)[0];
    return premiere?.id ?? null;
  });
  const [bloquant, setBloquant] = useState(jalon?.bloquant ?? true);
  const [datePrevue, setDatePrevue] = useState(jalon?.date_prevue?.slice(0, 10) ?? "");
  const [description, setDescription] = useState(jalon?.description ?? "");
  const [decideurUser, setDecideurUser] = useState<number | null>(
    jalon?.decideur_attendu_user_id ?? null
  );
  const [decideurGroupe, setDecideurGroupe] = useState<number | null>(
    jalon?.decideur_attendu_groupe_id ?? null
  );
  const [groupes, setGroupes] = useState<ProjectGroup[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppression, setSuppression] = useState(false);

  useEffect(() => {
    projectsApi.listGroups(projectId).then(setGroupes).catch(() => setGroupes([]));
  }, [projectId]);

  const ordered = [...phases].sort((a, b) => a.position - b.position || a.id - b.id);

  async function save() {
    if (!nom.trim()) {
      setError("Le nom du jalon est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      nom: nom.trim(),
      description: description.trim() || null,
      role,
      // Un jalon de projet n'appartient à aucune phase, par définition.
      phase_id: role === "projet" ? null : phaseId,
      bloquant,
      date_prevue: datePrevue ? new Date(datePrevue).toISOString() : null,
      decideur_attendu_user_id: decideurUser,
      decideur_attendu_groupe_id: decideurGroupe,
    };
    try {
      if (jalon) await jalonsApi.update(jalon.id, body);
      else await jalonsApi.create(projectId, body);
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
      setSaving(false);
    }
  }

  return (
    <RightDrawer
      title={jalon ? "Modifier le jalon" : "Nouveau jalon"}
      onClose={onClose}
      width="md:w-[560px] md:max-w-[92vw]"
      footer={
        <div className="flex items-center gap-2 w-full">
          {jalon && onDeleted && (
            <button
              onClick={() => setSuppression(true)}
              className="h-9 px-3 rounded-lg text-body-sm font-medium text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
            >
              Supprimer
            </button>
          )}
          <span className="flex-1" />
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving || !nom.trim()}
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : jalon ? "Enregistrer" : "Créer"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={LABEL}>Nom</label>
          <input
            className={FIELD}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Go/No-go de faisabilité, Revue de conception…"
            autoFocus={!jalon}
          />
        </div>

        <div>
          <label className={LABEL}>Rôle</label>
          <select
            className={FIELD}
            value={role}
            onChange={(e) => {
              const suivant = e.target.value as JalonRole;
              setRole(suivant);
              // Le rôle décide de la phase, pas l'inverse : un jalon de projet
              // n'en a aucune, tout autre rôle en exige une.
              if (suivant === "projet") setPhaseId(null);
              else if (phaseId === null) setPhaseId(ordered[0]?.id ?? null);
            }}
          >
            {JALON_ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {JALON_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-label-md text-outline">{JALON_ROLE_HINTS[role]}</p>
        </div>

        {role !== "projet" && (
          <div>
            <label className={LABEL}>Phase</label>
            {/* Pas d'option « aucune » : un jalon de phase sans phase ne serait
                cherché par aucune règle de blocage. */}
            <select
              className={FIELD}
              value={phaseId ?? ""}
              onChange={(e) => setPhaseId(Number(e.target.value))}
            >
              {ordered.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-label-md text-outline">
              Ce rôle garde une porte : le jalon doit nommer la phase concernée.
            </p>
          </div>
        )}

        <div className="flex items-start justify-between gap-3 rounded-xl border border-outline-soft px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-body-sm font-medium text-on-surface">Bloquant</p>
            <p className="text-label-md text-outline">
              Tant qu&apos;il n&apos;est pas franchi, la phase ne se clôture pas et les suivantes
              ne s&apos;ouvrent pas — sauf passage en force justifié.
            </p>
          </div>
          <Switch checked={bloquant} onChange={setBloquant} label="Jalon bloquant" />
        </div>

        <div>
          <label className={LABEL}>Échéance prévue</label>
          <input
            type="date"
            className={`${FIELD} w-[180px]`}
            value={datePrevue}
            onChange={(e) => setDatePrevue(e.target.value)}
          />
        </div>

        <div>
          <label className={LABEL}>Décideur désigné</label>
          {/* UN seul champ : deux listes séparées laissaient remplir les deux, et
              obligeaient à savoir d'avance si l'on cherchait une personne ou un
              groupe. Le backend n'en attend qu'un. */}
          <SelecteurPersonne
            valeur={{ userId: decideurUser, groupeId: decideurGroupe }}
            membres={members}
            groupes={groupes}
            onChange={(choix) => {
              setDecideurUser(choix.userId);
              setDecideurGroupe(choix.groupeId);
            }}
            placeholder="Rechercher une personne ou un groupe…"
            vide="Non désigné"
          />
        </div>
        <p className="-mt-1 text-label-md text-outline">
          Sans décideur désigné, toute personne autorisée à décider peut trancher. Avec un
          décideur désigné, un propriétaire du projet reste un recours en son absence.
        </p>

        <div>
          <label className={LABEL}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Ce que cette gate vérifie, et ce qui se joue derrière…"
            className="w-full resize-none rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
          />
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}
      </div>

      {/* Un jalon déjà décidé n'est pas supprimable : le backend refuse, parce
          qu'une décision est immuable. Le message d'erreur le dit tel quel. */}
      {suppression && jalon && (
        <ConfirmDialog
          title="Supprimer ce jalon ?"
          confirmLabel="Supprimer"
          busy={saving}
          onCancel={() => setSuppression(false)}
          onConfirm={async () => {
            setSaving(true);
            setError(null);
            try {
              await jalonsApi.remove(jalon.id);
              await onDeleted!();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Suppression impossible.");
              setSuppression(false);
              setSaving(false);
            }
          }}
          message="Ses critères seront supprimés avec lui. Un jalon qui porte déjà une décision ne peut plus être supprimé."
        />
      )}
    </RightDrawer>
  );
}
