"use client";

import { useMemo, useState } from "react";
import { AddOutlined, CloseOutlined, SearchOutlined } from "@mui/icons-material";
import { setGroupPermissions, ApiError } from "@/app/lib/api";
import type { AppPermissionGroup, Group } from "@/app/lib/types";

/** Les droits d'un groupe : on en retire sur place, on en ajoute par un tiroir.
 *
 *  L'ajout passe par un tiroir plutôt que par une liste à cocher permanente :
 *  le catalogue compte des dizaines de droits répartis sur dix applications, et
 *  l'afficher en entier noierait les quelques-uns que le groupe possède
 *  réellement — qui sont pourtant ce qu'on vient lire. */
export function OngletDroits({
  workspaceId,
  groupe,
  catalogue,
  onChange,
  onErreur,
}: {
  workspaceId: number;
  groupe: Group;
  catalogue: AppPermissionGroup[];
  onChange: (g: Group, message: string) => void;
  onErreur: (message: string) => void;
}) {
  const [tiroir, setTiroir] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const possedes = useMemo(() => new Set(groupe.permissions.map((p) => p.id)), [groupe]);

  async function appliquer(ids: number[], message: string) {
    setEnCours(true);
    try {
      onChange(await setGroupPermissions(workspaceId, groupe.id, ids), message);
    } catch (e) {
      onErreur(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setEnCours(false);
    }
  }

  // Les droits du groupe, regroupés par application — comme le catalogue, pour
  // qu'on lise « ce que ce groupe peut faire dans Facturation » d'un bloc.
  const parApp = useMemo(() => {
    const index = new Map<number, { app: string; noms: { id: number; name: string }[] }>();
    for (const app of catalogue) {
      for (const p of app.permissions) {
        if (possedes.has(p.id)) {
          const cle = app.id ?? -1;
          const entree = index.get(cle) ?? { app: app.name, noms: [] };
          entree.noms.push({ id: p.id, name: p.name });
          index.set(cle, entree);
        }
      }
    }
    return [...index.values()].sort((a, b) => a.app.localeCompare(b.app, "fr"));
  }, [catalogue, possedes]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-body-sm text-on-surface-variant">
          Ce que les membres de ce groupe ont le droit de faire.
        </p>
        <button
            type="button"
            onClick={() => setTiroir(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Ajouter un droit
          </button>
      </div>

      {groupe.is_system && (
        <p className="mt-3 rounded-lg bg-surface-container px-3 py-2 text-body-sm text-on-surface-variant">
          Ce groupe est alimenté par la plateforme : activer une application y ajoute
          automatiquement ses droits. Vos ajustements restent possibles, mais une
          réactivation d&apos;application peut les recouvrir.
        </p>
      )}

      {parApp.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
          <p className="text-body-md text-on-surface">Aucun droit.</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Les membres de ce groupe n&apos;héritent d&apos;aucune autorisation par lui.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {parApp.map((bloc) => (
            <section
              key={bloc.app}
              className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
            >
              <h2 className="text-body-md font-medium text-on-surface">{bloc.app}</h2>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {bloc.noms.map((p) => (
                  <li
                    key={p.id}
                    className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2.5 py-1 text-label-md text-on-surface"
                  >
                    {p.name}
                    <button
                        type="button"
                        disabled={enCours}
                        aria-label={`Retirer ${p.name}`}
                        onClick={() =>
                          appliquer(
                            groupe.permissions.filter((x) => x.id !== p.id).map((x) => x.id),
                            `« ${p.name} » retiré.`,
                          )
                        }
                        className="text-on-surface-variant transition-colors hover:text-error disabled:opacity-40"
                      >
                        <CloseOutlined style={{ fontSize: 13 }} />
                      </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {tiroir && (
        <TiroirAjoutDroits
          catalogue={catalogue}
          possedes={possedes}
          enCours={enCours}
          onClose={() => setTiroir(false)}
          onAjouter={(ids) => {
            void appliquer(
              [...possedes, ...ids],
              `${ids.length} droit${ids.length > 1 ? "s" : ""} ajouté${ids.length > 1 ? "s" : ""}.`,
            ).then(() => setTiroir(false));
          }}
        />
      )}
    </>
  );
}

/** Le tiroir de sélection. On y coche, puis on ajoute d'un geste — plutôt
 *  qu'un aller-retour serveur par case, qui rendrait la saisie hachée. */
function TiroirAjoutDroits({
  catalogue,
  possedes,
  enCours,
  onClose,
  onAjouter,
}: {
  catalogue: AppPermissionGroup[];
  possedes: Set<number>;
  enCours: boolean;
  onClose: () => void;
  onAjouter: (ids: number[]) => void;
}) {
  const [recherche, setRecherche] = useState("");
  const [choisis, setChoisis] = useState<number[]>([]);

  const q = recherche.trim().toLowerCase();
  const blocs = catalogue
    .map((app) => ({
      ...app,
      // On ne propose que ce que le groupe n'a pas : lui reproposer ce qu'il
      // possède déjà ferait chercher parmi du bruit.
      permissions: app.permissions.filter(
        (p) =>
          !possedes.has(p.id) &&
          (!q || p.name.toLowerCase().includes(q) || app.name.toLowerCase().includes(q)),
      ),
    }))
    .filter((app) => app.permissions.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay animate-overlay-in" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-[30rem] flex-col bg-surface-container-lowest shadow-drawer animate-drawer-in"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-outline-soft px-5 py-4">
          <div>
            <h2 className="text-body-lg font-medium text-on-surface">Ajouter des droits</h2>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">
              Seuls les droits que ce groupe n&apos;a pas encore sont proposés.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low"
          >
            <CloseOutlined style={{ fontSize: 18 }} />
          </button>
        </header>

        <div className="border-b border-outline-soft px-5 py-3">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-outline-soft px-3">
            <SearchOutlined style={{ fontSize: 16 }} className="text-on-surface-variant" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un droit ou une application…"
              className="w-full bg-transparent text-body-sm text-on-surface outline-none"
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {blocs.length === 0 ? (
            <p className="py-8 text-center text-body-sm text-on-surface-variant">
              {q ? "Aucun droit ne correspond." : "Ce groupe a déjà tous les droits du catalogue."}
            </p>
          ) : (
            blocs.map((app) => (
              <section key={app.key ?? "general"} className="mb-4">
                <h3 className="text-label-md uppercase tracking-wide text-outline">{app.name}</h3>
                <div className="mt-1.5 flex flex-col gap-1">
                  {app.permissions.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-container-low"
                    >
                      <input
                        type="checkbox"
                        checked={choisis.includes(p.id)}
                        onChange={(e) =>
                          setChoisis(
                            e.target.checked
                              ? [...choisis, p.id]
                              : choisis.filter((x) => x !== p.id),
                          )
                        }
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block text-body-sm text-on-surface">{p.name}</span>
                        {p.description && (
                          <span className="block text-label-md text-on-surface-variant">
                            {p.description}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-outline-soft px-5 py-3">
          <span className="text-label-md text-on-surface-variant">
            {choisis.length} sélectionné{choisis.length > 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-lg px-4 text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={enCours || choisis.length === 0}
              onClick={() => onAjouter(choisis)}
              className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50"
            >
              {enCours ? "…" : "Ajouter"}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
