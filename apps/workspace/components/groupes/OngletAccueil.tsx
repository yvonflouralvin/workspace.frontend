"use client";

import { useState } from "react";
import {
  AddOutlined,
  ArrowDownwardOutlined,
  ArrowUpwardOutlined,
  DeleteOutlineOutlined,
} from "@mui/icons-material";
import { PLATFORM_APPS } from "@repo/ui/shell/platform";
import { setGroupAccueil, ApiError } from "@/app/lib/api";
import type { Group, LienRapide } from "@/app/lib/types";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary";

/** Icônes proposées, liste FERMÉE.
 *
 *  Laisser saisir un nom d'icône libre ferait afficher du vide au premier faux
 *  frappe, sur l'écran d'accueil de gens qui n'y peuvent rien. */
const ICONES = [
  "MeetingRoom", "Bolt", "LocalGasStation", "Event", "ReceiptLong",
  "ShoppingCart", "Inventory2", "People", "Assignment", "Description",
  "QueryStats", "Place", "Schedule", "Home",
] as const;

/** L'écran d'accueil d'un groupe : où l'on atterrit, et ce qu'on y voit. */
export function OngletAccueil({
  workspaceId,
  groupe,
  onChange,
  onErreur,
}: {
  workspaceId: number;
  groupe: Group;
  onChange: (g: Group, message: string) => void;
  onErreur: (message: string) => void;
}) {
  const [landing, setLanding] = useState(groupe.landing_app_key ?? "");
  const [perso, setPerso] = useState(groupe.accueil_personnalise);
  const [priorite, setPriorite] = useState(String(groupe.priorite_accueil));
  const [liens, setLiens] = useState<LienRapide[]>(groupe.liens_rapides);
  const [enCours, setEnCours] = useState(false);

  const bouger = (index: number, pas: number) => {
    const cible = index + pas;
    if (cible < 0 || cible >= liens.length) return;
    const copie = [...liens];
    [copie[index], copie[cible]] = [copie[cible], copie[index]];
    setLiens(copie.map((l, i) => ({ ...l, position: i })));
  };

  async function enregistrer() {
    setEnCours(true);
    try {
      const g = await setGroupAccueil(workspaceId, groupe.id, {
        landing_app_key: landing || null,
        accueil_personnalise: perso,
        priorite_accueil: Number(priorite) || 0,
        liens_rapides: liens.map(({ id: _id, ...reste }, i) => ({ ...reste, position: i })),
      });
      onChange(g, "Écran d'accueil enregistré.");
    } catch (e) {
      onErreur(e instanceof ApiError ? e.message : "Enregistrement impossible.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
        <h2 className="text-body-md font-medium text-on-surface">Après la connexion</h2>
        <p className="mt-0.5 max-w-[70ch] text-body-sm text-on-surface-variant">
          Par défaut, tout le monde arrive sur Workspace. Un groupe peut envoyer ses membres
          ailleurs — un comptable directement dans Facturation, par exemple.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Application d&apos;accueil</span>
            <select value={landing} onChange={(e) => setLanding(e.target.value)} className={CHAMP}>
              <option value="">Workspace (par défaut)</option>
              {PLATFORM_APPS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">
              Priorité <span className="text-outline">(le plus petit l&apos;emporte)</span>
            </span>
            <input
              type="number"
              min={0}
              value={priorite}
              onChange={(e) => setPriorite(e.target.value)}
              className={CHAMP}
            />
          </label>
        </div>
        <p className="mt-2 text-label-md text-outline">
          Un membre peut appartenir à plusieurs groupes configurés : c&apos;est la priorité qui
          départage, pour qu&apos;il atterrisse toujours au même endroit.
        </p>
      </section>

      <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
        <h2 className="text-body-md font-medium text-on-surface">Accueil Workspace</h2>
        <p className="mt-0.5 max-w-[70ch] text-body-sm text-on-surface-variant">
          Au lieu des widgets (tâches, notifications), afficher des cartes d&apos;accès rapide.
          Pratique pour des membres qui n&apos;ont que quelques gestes à faire — un agent de
          sécurité y trouvera le planning des salles et le démarrage d&apos;un groupe.
        </p>

        <label className="mt-3 flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={perso}
            onChange={(e) => setPerso(e.target.checked)}
            className="mt-0.5"
          />
          <span className="text-body-sm text-on-surface">
            Remplacer les widgets par des accès rapides
          </span>
        </label>

        {perso && liens.length === 0 && (
          <p className="mt-2 text-label-md text-error">
            Aucun raccourci : l&apos;accueil serait vide, et la configuration sera ignorée.
          </p>
        )}

        {perso && (
          <div className="mt-3 flex flex-col gap-2">
            {liens.map((lien, index) => (
              <div
                key={index}
                className="rounded-xl border border-outline-soft p-3"
              >
                <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-label-md text-on-surface-variant">Libellé</span>
                    <input
                      value={lien.libelle}
                      onChange={(e) =>
                        setLiens(liens.map((l, i) => (i === index ? { ...l, libelle: e.target.value } : l)))
                      }
                      className={CHAMP}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-label-md text-on-surface-variant">Application</span>
                    <select
                      value={lien.app_key}
                      onChange={(e) =>
                        setLiens(liens.map((l, i) => (i === index ? { ...l, app_key: e.target.value } : l)))
                      }
                      className={CHAMP}
                    >
                      {PLATFORM_APPS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-label-md text-on-surface-variant">
                      Chemin <span className="text-outline">(facultatif)</span>
                    </span>
                    <input
                      value={lien.chemin ?? ""}
                      placeholder="/salles"
                      onChange={(e) =>
                        setLiens(liens.map((l, i) => (i === index ? { ...l, chemin: e.target.value } : l)))
                      }
                      className={CHAMP}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-label-md text-on-surface-variant">Icône</span>
                    <select
                      value={lien.icone ?? ""}
                      onChange={(e) =>
                        setLiens(liens.map((l, i) => (i === index ? { ...l, icone: e.target.value } : l)))
                      }
                      className={CHAMP}
                    >
                      <option value="">Aucune</option>
                      {ICONES.map((i) => (
                        <option key={i} value={i}>
                          {i}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="flex min-w-[16rem] flex-1 flex-col gap-1">
                    <span className="text-label-md text-on-surface-variant">
                      Description <span className="text-outline">(facultative)</span>
                    </span>
                    <input
                      value={lien.description ?? ""}
                      onChange={(e) =>
                        setLiens(
                          liens.map((l, i) => (i === index ? { ...l, description: e.target.value } : l)),
                        )
                      }
                      className={CHAMP}
                    />
                  </label>
                  <button
                    type="button"
                    aria-label="Monter"
                    onClick={() => bouger(index, -1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant hover:bg-surface-container-low"
                  >
                    <ArrowUpwardOutlined style={{ fontSize: 16 }} />
                  </button>
                  <button
                    type="button"
                    aria-label="Descendre"
                    onClick={() => bouger(index, 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant hover:bg-surface-container-low"
                  >
                    <ArrowDownwardOutlined style={{ fontSize: 16 }} />
                  </button>
                  <button
                    type="button"
                    aria-label="Retirer ce raccourci"
                    onClick={() => setLiens(liens.filter((_, i) => i !== index))}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant hover:text-error"
                  >
                    <DeleteOutlineOutlined style={{ fontSize: 16 }} />
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setLiens([
                  ...liens,
                  {
                    libelle: "",
                    description: null,
                    app_key: PLATFORM_APPS[0]?.id ?? "workspace",
                    chemin: null,
                    icone: null,
                    position: liens.length,
                  },
                ])
              }
              className="inline-flex h-9 w-fit items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Ajouter un raccourci
            </button>
          </div>
        )}
      </section>

      <div>
        <button
          type="button"
          disabled={enCours}
          onClick={() => void enregistrer()}
          className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50"
        >
          {enCours ? "…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
