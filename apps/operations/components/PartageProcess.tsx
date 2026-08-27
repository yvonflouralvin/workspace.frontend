"use client";

import { useEffect, useMemo, useState } from "react";
import { DeleteOutlineOutlined, GroupsOutlined, PersonOutlined } from "@mui/icons-material";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { useSessionStore } from "@repo/auth/store/session.store";

import {
  operationsApi,
  type CollaborateurProcess,
  type GroupeEspace,
  type MembreEspace,
  type Process,
  type RoleProcess,
  type Visibilite,
} from "@/lib/operations-api";

const ROLES: { cle: RoleProcess; libelle: string; aide: string }[] = [
  { cle: "CONCEPTEUR", libelle: "Concepteur", aide: "Modifie la checklist, exécute et consulte" },
  { cle: "EXECUTANT", libelle: "Exécutant", aide: "Passe la checklist et consulte" },
  { cle: "CONSULTATEUR", libelle: "Consultateur", aide: "Lit les exécutions seulement" },
];

const VISIBILITES: { cle: Visibilite; libelle: string }[] = [
  { cle: "WORKSPACE", libelle: "Tout l'espace de travail" },
  { cle: "RESTREINTE", libelle: "Seulement les personnes et les groupes choisis" },
];

const SELECT =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** Qui peut passer ce process, qui peut lire son registre, et qui peut le
 *  réécrire.
 *
 *  **Deux visibilités et non une** : « tout le monde passe la ronde, seul le
 *  responsable lit le registre » est le cas courant, et une visibilité unique
 *  obligerait à choisir entre ouvrir le registre à tous ou fermer la ronde.
 *
 *  **Concevoir ne s'ouvre jamais à l'espace entier** : la liste des points à
 *  contrôler est ce que le process garantit. Elle se confie nommément.
 */
export function PartageProcess({
  process,
  onChange,
  lecture,
}: {
  process: Process;
  onChange: (process: Process) => void;
  lecture: boolean;
}) {
  const workspaceId = useSessionStore((s) => s.activeWorkspace?.id);
  const [membres, setMembres] = useState<MembreEspace[]>([]);
  const [groupes, setGroupes] = useState<GroupeEspace[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    operationsApi
      .membres(Number(workspaceId))
      .then((r) => setMembres(r.members ?? []))
      .catch(() => setMembres([]));
    operationsApi
      .groupesEspace(Number(workspaceId))
      .then((r) => setGroupes(r.groups ?? []))
      .catch(() => setGroupes([]));
  }, [workspaceId]);

  const nomDe = useMemo(() => {
    const index = new Map(membres.map((m) => [m.user.id, m.user.username || m.user.email]));
    return (userId: number, repli: string | null) => index.get(userId) ?? repli ?? `#${userId}`;
  }, [membres]);

  const libres = membres.filter(
    (m) =>
      m.user.id !== process.created_by &&
      !process.collaborateurs.some((c) => c.user_id === m.user.id),
  );

  async function appliquer(corps: Record<string, unknown>) {
    setBusy(true);
    setErreur(null);
    try {
      onChange(await operationsApi.modifierProcess(process.slug, corps));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Modification impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function appliquerCollaborateurs(suivants: CollaborateurProcess[]) {
    setBusy(true);
    setErreur(null);
    try {
      onChange(
        await operationsApi.poserCollaborateurs(
          process.slug,
          suivants.map((c) => ({ user_id: c.user_id, role: c.role })),
        ),
      );
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Modification impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      <h2 className="text-body-md font-semibold text-on-surface">Visibilité et collaborateurs</h2>
      <p className="mt-0.5 max-w-[70ch] text-label-md text-outline">
        Ces règles s&apos;ajoutent aux permissions de l&apos;application : il faut d&apos;abord
        avoir le droit d&apos;exécuter un process, puis celui d&apos;exécuter celui-ci.{" "}
        {/* Dit franchement plutôt que découvert : « réservé » ne veut pas dire
            secret pour le propriétaire de l'espace. */}
        Le propriétaire de l&apos;espace de travail garde accès à tous les process — sans
        quoi une checklist réservée deviendrait inaccessible le jour où celui qui l&apos;a
        écrite quitte l&apos;entreprise.
      </p>

      {erreur && (
        <p className="mt-3 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      <div className="mt-3 space-y-3">
        <Reglage
          titre="Qui peut passer la checklist"
          valeur={process.visibilite_execution}
          groupesAdmis={process.groupes_execution}
          groupes={groupes}
          disabled={lecture || busy}
          onVisibilite={(v) => void appliquer({ visibilite_execution: v })}
          onGroupes={(ids) => void appliquer({ groupes_execution: ids })}
        />
        <Reglage
          titre="Qui peut consulter les exécutions"
          aide="Qui exécute garde toujours accès à ce qu'il a lui-même relevé."
          valeur={process.visibilite_journal}
          groupesAdmis={process.groupes_journal}
          groupes={groupes}
          disabled={lecture || busy}
          onVisibilite={(v) => void appliquer({ visibilite_journal: v })}
          onGroupes={(ids) => void appliquer({ groupes_journal: ids })}
        />
      </div>

      <div className="mt-4 border-t border-outline-soft pt-3">
        <h3 className="text-body-sm font-semibold text-on-surface">Collaborateurs</h3>
        <p className="mt-0.5 max-w-[70ch] text-label-md text-outline">
          Réécrire la checklist ne s&apos;ouvre jamais à l&apos;espace entier : cela se confie
          nommément, ici.
        </p>

        <ul className="mt-2 space-y-1.5">
          <li className="flex flex-wrap items-center gap-2 rounded-lg bg-surface-container-low/50 px-3 py-2">
            <PersonOutlined style={{ fontSize: 17 }} className="text-outline" />
            <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface">
              {process.created_by
                ? nomDe(process.created_by, process.proprietaire_nom)
                : "Aucun propriétaire"}
            </span>
            <span className="shrink-0 text-label-md text-outline">
              {process.created_by ? "Propriétaire · concepteur" : "process créé avant le partage"}
            </span>
          </li>

          {process.collaborateurs.map((c) => (
            <li
              key={c.user_id}
              className="flex flex-wrap items-center gap-2 rounded-lg border border-outline-soft px-3 py-2"
            >
              <PersonOutlined style={{ fontSize: 17 }} className="text-outline" />
              <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface">
                {nomDe(c.user_id, c.nom)}
              </span>
              <select
                className={`${SELECT} shrink-0`}
                value={c.role}
                disabled={lecture || busy}
                onChange={(e) =>
                  void appliquerCollaborateurs(
                    process.collaborateurs.map((autre) =>
                      autre.user_id === c.user_id
                        ? { ...autre, role: e.target.value as RoleProcess }
                        : autre,
                    ),
                  )
                }
              >
                {ROLES.map((r) => (
                  <option key={r.cle} value={r.cle}>
                    {r.libelle} — {r.aide}
                  </option>
                ))}
              </select>
              {!lecture && (
                <button
                  type="button"
                  aria-label={`Retirer ${nomDe(c.user_id, c.nom)}`}
                  disabled={busy}
                  onClick={() =>
                    void appliquerCollaborateurs(
                      process.collaborateurs.filter((autre) => autre.user_id !== c.user_id),
                    )
                  }
                  className="shrink-0 text-outline transition-colors hover:text-error disabled:opacity-40"
                >
                  <DeleteOutlineOutlined style={{ fontSize: 18 }} />
                </button>
              )}
            </li>
          ))}
        </ul>

        {!lecture && (
          <div className="mt-2 max-w-[22rem]">
            <SearchSelect<MembreEspace>
              value={null}
              fetchOptions={async (q) => {
                const motif = q.trim().toLowerCase();
                return motif
                  ? libres.filter((m) =>
                      `${m.user.username} ${m.user.email}`.toLowerCase().includes(motif),
                    )
                  : libres;
              }}
              getOptionLabel={(m) => m.user.username || m.user.email}
              getOptionValue={(m) => m.user.id}
              onChange={(valeur) => {
                const userId = Number(valeur);
                if (!userId) return;
                // Exécutant par défaut : c'est le rôle le moins large, et
                // ajouter quelqu'un ne doit pas lui donner d'emblée le droit de
                // réécrire la checklist.
                void appliquerCollaborateurs([
                  ...process.collaborateurs,
                  { user_id: userId, nom: null, role: "EXECUTANT", role_libelle: "" },
                ]);
              }}
              placeholder="Ajouter une personne…"
              disabled={busy || libres.length === 0}
            />
          </div>
        )}
      </div>
    </section>
  );
}

/** Un réglage de visibilité : d'abord l'étendue, puis — si elle est restreinte
 *  — les groupes admis.
 *
 *  Les groupes n'apparaissent QUE dans ce cas : les proposer sous « tout
 *  l'espace de travail » laisserait croire qu'ils y changent quelque chose.
 */
function Reglage({
  titre,
  aide,
  valeur,
  groupesAdmis,
  groupes,
  disabled,
  onVisibilite,
  onGroupes,
}: {
  titre: string;
  aide?: string;
  valeur: Visibilite;
  groupesAdmis: number[];
  groupes: GroupeEspace[];
  disabled: boolean;
  onVisibilite: (valeur: Visibilite) => void;
  onGroupes: (ids: number[]) => void;
}) {
  return (
    <div className="rounded-xl border border-outline-soft p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 flex-1">
          <span className="block text-body-sm text-on-surface">{titre}</span>
          {aide && <span className="block text-label-md text-outline">{aide}</span>}
        </span>
        <select
          className={`${SELECT} w-[21rem] shrink-0`}
          value={valeur}
          disabled={disabled}
          onChange={(e) => onVisibilite(e.target.value as Visibilite)}
        >
          {VISIBILITES.map((v) => (
            <option key={v.cle} value={v.cle}>
              {v.libelle}
            </option>
          ))}
        </select>
      </div>

      {valeur === "RESTREINTE" && (
        <div className="mt-2.5 border-t border-hairline pt-2.5">
          <span className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
            <GroupsOutlined style={{ fontSize: 16 }} />
            Groupes admis — s&apos;ajoutent aux personnes nommées plus bas
          </span>
          {groupes.length === 0 ? (
            <p className="mt-1.5 text-label-md text-outline">
              Cet espace n&apos;a aucun groupe. L&apos;accès se confie alors personne par
              personne.
            </p>
          ) : (
            <div className="mt-1.5">
              <MultiSelect
                options={groupes.map((g) => ({ id: g.id, label: g.name }))}
                selectedIds={groupesAdmis}
                onChange={(ids) => onGroupes(ids.map(Number))}
                placeholder="Rechercher un groupe…"
                emptyLabel="Aucun groupe ne porte ce nom."
                disabled={disabled}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
