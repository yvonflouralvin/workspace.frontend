"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AddOutlined, DeleteOutlineOutlined, EditOutlined, FolderOpenOutlined } from "@mui/icons-material";
import { FormDrawer } from "@repo/ui/FormDrawer";
import { useConfirmSuppression } from "@repo/ui/hooks/useConfirmSuppression";
import { ChampMembre } from "@/components/SelecteurMembre";
import {
  NATURES,
  NATURE_LABELS,
  STATUT_ACTION_LABELS,
  addElement,
  deleteElement,
  listElements,
  updateElement,
  type ElementSuivi,
  type NatureElement,
  type StatutAction,
} from "@/lib/bfm-suivi-api";
import { useDiffere } from "@/lib/differe";
import { dateHeureFr, enRetard, jourFr } from "@/lib/format";
import type { Membre } from "@/lib/membres-api";
import { useMission } from "../../../../mission-context";
import { FIELD, LABEL } from "../../../../ui";
import { useTache } from "./tache-context";

const CHAMP = `${FIELD} w-full`;

function ElementTiroir({
  nature,
  initial,
  membres,
  onSubmit,
  onClose,
}: {
  nature: NatureElement;
  initial?: ElementSuivi;
  membres: Membre[];
  onSubmit: (v: { texte: string; responsable_user_id: number | null; echeance: string | null }) => Promise<void>;
  onClose: () => void;
}) {
  const [texte, setTexte] = useState(initial?.texte ?? "");
  const [responsable, setResponsable] = useState<number | null>(initial?.responsable_user_id ?? null);
  const [echeance, setEcheance] = useState(initial?.echeance?.slice(0, 10) ?? "");
  const labels = NATURE_LABELS[nature];

  return (
    <FormDrawer
      title={initial ? labels.modifier : labels.nouveau}
      submitLabel={initial ? "Enregistrer" : "Ajouter"}
      onClose={onClose}
      onSubmit={() => onSubmit({ texte: texte.trim(), responsable_user_id: responsable, echeance: echeance || null })}
    >
      <div>
        <label className={LABEL}>Description *</label>
        <textarea
          className={`${CHAMP} min-h-[9rem] resize-y`}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          required
          autoFocus
        />
      </div>
      {nature === "ACTION_CORRECTIVE" && (
        <>
          <div>
            <label className={LABEL}>Responsable</label>
            <ChampMembre valeur={responsable} membres={membres} placeholder="Non assignée" onChange={setResponsable} />
          </div>
          <div>
            <label className={LABEL}>Échéance</label>
            <input type="date" className={FIELD} value={echeance} onChange={(e) => setEcheance(e.target.value)} />
          </div>
        </>
      )}
    </FormDrawer>
  );
}

/** Ce qu'un contrôle porte en plus d'une tâche ordinaire : son observation, ses constats et le suivi
 *  de ses actions correctives. Vit DANS l'aperçu de la tâche — le contrôle est un type de tâche, pas
 *  une autre page. */
export function SuiviControle() {
  const { tache, enregistrer } = useTache();
  const { membres, missionId } = useMission();
  // Faire le travail du contrôle : l'exécutant, et celui qui modifie les tâches.
  const ecriture = tache.peut_contribuer;
  const { confirmer, dialogue } = useConfirmSuppression();

  const [elements, setElements] = useState<ElementSuivi[] | null>(null);
  const [probleme, setProbleme] = useState<string | null>(null);
  // `null` : rien d'ouvert · sinon la nature à ajouter, ou l'élément à modifier.
  const [tiroir, setTiroir] = useState<{ nature: NatureElement; element?: ElementSuivi } | null>(null);
  const [observation, setObservation] = useState(tache.observation ?? "");

  const charger = useCallback(async () => {
    try {
      setElements(await listElements(tache.id));
      setProbleme(null);
    } catch (err) {
      setProbleme(err instanceof Error ? err.message : "Impossible de charger le contrôle.");
    }
  }, [tache.id]);

  useEffect(() => {
    void charger();
  }, [charger]);
  useEffect(() => setObservation(tache.observation ?? ""), [tache.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pousserObservation = useDiffere((v: string) => enregistrer({ observation: v }));

  async function action(fn: () => Promise<unknown>) {
    setProbleme(null);
    try {
      await fn();
      await charger();
    } catch (err) {
      setProbleme(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }

  const base = `/missions/${missionId}/phases/${tache.phase_id}/taches/${tache.id}`;

  return (
    <div className="space-y-5">
      {probleme && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{probleme}</p>}

      <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5">
        <label className={LABEL} htmlFor="observation">Observation</label>
        <textarea
          id="observation"
          className={`${CHAMP} min-h-[7rem] resize-y`}
          placeholder="Ce qui a été constaté pendant le contrôle…"
          value={observation}
          readOnly={!ecriture}
          onChange={(e) => {
            setObservation(e.target.value);
            pousserObservation(e.target.value);
          }}
        />
      </section>

      {NATURES.map((nature) => {
        const liste = (elements ?? []).filter((e) => e.nature === nature);
        const labels = NATURE_LABELS[nature];
        return (
          <section key={nature} className="rounded-2xl border border-outline-soft bg-surface-container-lowest">
            <div className="flex items-center gap-2 px-4 md:px-5 py-3 border-b border-hairline">
              <h2 className="flex-1 text-body-md font-semibold text-on-surface">
                {labels.pluriel}
                <span className="ml-2 text-label-md font-normal text-outline">{liste.length}</span>
              </h2>
              {ecriture && (
                <button
                  onClick={() => setTiroir({ nature })}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors"
                >
                  <AddOutlined style={{ fontSize: 15 }} /> Ajouter
                </button>
              )}
            </div>

            {elements === null ? (
              <p className="px-4 md:px-5 py-3 text-body-sm text-on-surface-variant">Chargement…</p>
            ) : liste.length === 0 ? (
              <p className="px-4 md:px-5 py-3 text-body-sm text-on-surface-variant">{labels.vide}</p>
            ) : (
              <ul className="divide-y divide-hairline">
                {liste.map((e) => (
                  <li key={e.id} className="px-4 md:px-5 py-3 space-y-1.5">
                    <div className="flex items-start gap-3">
                      <p className="flex-1 min-w-0 whitespace-pre-wrap text-body-sm text-on-surface">{e.texte}</p>
                      {nature === "ACTION_CORRECTIVE" && e.statut && (
                        <select
                          aria-label="Statut de l'action corrective"
                          value={e.statut}
                          // Le validateur valide le résultat d'une action sans « contribuer » au contrôle.
                          disabled={!ecriture && !tache.peut_valider}
                          onChange={(ev) =>
                            void action(() => updateElement(tache.id, e.id, { statut: ev.target.value as StatutAction }))
                          }
                          className={`${FIELD} flex-none font-semibold`}
                        >
                          {Object.entries(STATUT_ACTION_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                      )}
                      {ecriture && (
                        <>
                          <button
                            onClick={() => setTiroir({ nature, element: e })}
                            aria-label="Modifier"
                            className="flex-none mt-1 text-outline hover:text-primary transition-colors"
                          >
                            <EditOutlined style={{ fontSize: 17 }} />
                          </button>
                          <button
                            onClick={() =>
                              confirmer({
                                title: `Supprimer ${labels.defini.toLowerCase().startsWith("l'") ? "cette" : "ce"} ${labels.defini.replace(/^(L'|Le |La )/, "").toLowerCase()} ?`,
                                message: (
                                  <>
                                    {labels.defini} <strong className="text-on-surface">« {e.texte.length > 80 ? `${e.texte.slice(0, 79)}…` : e.texte} »</strong>{" "}
                                    sera {labels.supprime}. Cette action est irréversible.
                                  </>
                                ),
                                action: () => action(() => deleteElement(tache.id, e.id)),
                              })
                            }
                            aria-label="Supprimer"
                            className="flex-none mt-1 text-outline hover:text-error transition-colors"
                          >
                            <DeleteOutlineOutlined style={{ fontSize: 17 }} />
                          </button>
                        </>
                      )}
                    </div>

                    {nature === "ACTION_CORRECTIVE" && (
                      <div className="text-label-md text-outline space-y-0.5">
                        <p>
                          Responsable : {e.responsable_nom ?? "non assignée"}
                          {e.echeance && (
                            <span className={enRetard(e.echeance, e.statut === "RESULTAT_VALIDE") ? "text-error font-semibold" : ""}>
                              {" "}· Échéance : {jourFr(e.echeance)}
                            </span>
                          )}
                        </p>
                        {e.execute_par && e.execute_le && (
                          <p>Exécutée par {e.execute_par_nom ?? "un membre"} le {dateHeureFr(e.execute_le)}</p>
                        )}
                        {e.valide_par && e.valide_le && (
                          <p className="text-status-done font-medium">
                            Résultat validé par {e.valide_par_nom ?? "un membre"} le {dateHeureFr(e.valide_le)}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <section className="flex items-center gap-3 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 md:px-5 py-3">
        <FolderOpenOutlined style={{ fontSize: 18 }} className="flex-none text-outline" />
        <p className="flex-1 text-body-sm text-on-surface-variant">
          Les pièces justificatives se déposent dans l&apos;onglet dédié.
        </p>
        <Link href={`${base}/documents`} className="text-body-sm font-semibold text-primary hover:underline">
          Ouvrir les pièces justificatives
        </Link>
      </section>

      {tiroir && (
        <ElementTiroir
          key={tiroir.element?.id ?? `nouveau-${tiroir.nature}`}
          nature={tiroir.nature}
          initial={tiroir.element}
          membres={membres}
          onClose={() => setTiroir(null)}
          onSubmit={async (v) => {
            if (tiroir.element) {
              await updateElement(tache.id, tiroir.element.id, {
                texte: v.texte,
                ...(tiroir.nature === "ACTION_CORRECTIVE"
                  ? { responsable_user_id: v.responsable_user_id, echeance: v.echeance }
                  : {}),
              });
            } else {
              await addElement(tache.id, {
                nature: tiroir.nature,
                texte: v.texte,
                ...(tiroir.nature === "ACTION_CORRECTIVE"
                  ? { responsable_user_id: v.responsable_user_id, echeance: v.echeance }
                  : {}),
              });
            }
            setTiroir(null);
            await charger();
          }}
        />
      )}
      {dialogue}
    </div>
  );
}
