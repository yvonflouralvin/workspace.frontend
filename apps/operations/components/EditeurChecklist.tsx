"use client";

import { useState } from "react";
import {
  AddOutlined,
  ArrowDownwardOutlined,
  ArrowUpwardOutlined,
  DeleteOutlineOutlined,
  ExpandLessOutlined,
  ExpandMoreOutlined,
} from "@mui/icons-material";

import type { Process, TypePoint } from "@/lib/operations-api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";
const PETIT = `${CHAMP} h-8 text-label-md`;

/** Un point de contrôle est une QUESTION, du vocabulaire du module Formulaire :
 *  « les extincteurs sont-ils en place ? » se coche, « quel est l'index du
 *  compteur ? » se relève, « qu'avez-vous constaté ? » s'écrit. */
export const TYPES: { cle: TypePoint; libelle: string }[] = [
  { cle: "CASE", libelle: "Fait / pas fait" },
  { cle: "NOMBRE", libelle: "Valeur à relever" },
  { cle: "TEXTE_COURT", libelle: "Texte court" },
  { cle: "TEXTE_LONG", libelle: "Commentaire" },
  { cle: "CHOIX_UNIQUE", libelle: "Choix unique" },
  { cle: "CHOIX_MULTIPLE", libelle: "Choix multiple" },
  { cle: "DATE", libelle: "Date" },
  { cle: "HEURE", libelle: "Heure" },
];

export interface PointBrouillon {
  libelle: string;
  aide: string | null;
  type: TypePoint;
  options: string[];
  obligatoire: boolean;
  minimum: number | null;
  maximum: number | null;
  unite: string | null;
}

export interface SectionBrouillon {
  titre: string;
  consigne: string | null;
  points: PointBrouillon[];
}

export function pointVide(): PointBrouillon {
  return {
    libelle: "",
    aide: null,
    type: "CASE",
    options: [],
    obligatoire: true,
    minimum: null,
    maximum: null,
    unite: null,
  };
}

/** Ce que le serveur a enregistré, ramené à la forme éditable. La comparaison
 *  « modifié ou non » se fait sur CETTE forme des deux côtés : sinon un champ
 *  calculé côté serveur ferait croire à une modification permanente. */
export function versBrouillon(process: Process): SectionBrouillon[] {
  return process.sections.map((s) => ({
    titre: s.titre,
    consigne: s.consigne,
    points: s.points.map((p) => ({
      libelle: p.libelle,
      aide: p.aide,
      type: p.type,
      options: [...p.options],
      obligatoire: p.obligatoire,
      minimum: p.minimum,
      maximum: p.maximum,
      unite: p.unite,
    })),
  }));
}

function deplacer<T>(liste: T[], de: number, vers: number): T[] {
  if (vers < 0 || vers >= liste.length) return liste;
  const copie = [...liste];
  const [item] = copie.splice(de, 1);
  copie.splice(vers, 0, item);
  return copie;
}

/** Le constructeur de checklist : des sections (les étapes d'une ronde), et
 *  dans chacune des points de contrôle.
 *
 *  Les sections ne sont pas décoratives : sur un téléphone, quarante points
 *  d'un bloc sont illisibles et l'agent perd sa place.
 */
export function EditeurChecklist({
  sections,
  onChange,
  lecture,
}: {
  sections: SectionBrouillon[];
  onChange: (sections: SectionBrouillon[]) => void;
  lecture: boolean;
}) {
  const [replies, setReplies] = useState<Record<number, boolean>>({});

  function majSection(i: number, patch: Partial<SectionBrouillon>) {
    onChange(sections.map((s, n) => (n === i ? { ...s, ...patch } : s)));
  }

  function majPoint(i: number, j: number, patch: Partial<PointBrouillon>) {
    majSection(i, {
      points: sections[i].points.map((p, n) => (n === j ? { ...p, ...patch } : p)),
    });
  }

  return (
    <div className="space-y-3">
      {sections.length === 0 && (
        <p className="rounded-xl border border-dashed border-outline-soft px-3 py-5 text-center text-body-sm text-on-surface-variant">
          Aucune étape. Un process sans point de contrôle ne s&apos;exécute pas.
        </p>
      )}

      {sections.map((section, i) => {
        const replie = replies[i] ?? false;
        return (
          <section
            key={i}
            className="rounded-xl border border-outline-soft bg-surface-container-low/40 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                aria-label={replie ? "Déplier l'étape" : "Replier l'étape"}
                onClick={() => setReplies((r) => ({ ...r, [i]: !replie }))}
                className="shrink-0 text-outline transition-colors hover:text-primary"
              >
                {replie ? (
                  <ExpandMoreOutlined style={{ fontSize: 20 }} />
                ) : (
                  <ExpandLessOutlined style={{ fontSize: 20 }} />
                )}
              </button>
              <input
                className={`${CHAMP} min-w-0 flex-1 font-semibold`}
                placeholder={`Étape ${i + 1} — ex. « Sous-sol »`}
                value={section.titre}
                disabled={lecture}
                onChange={(e) => majSection(i, { titre: e.target.value })}
              />
              <span className="shrink-0 text-label-md text-outline">
                {section.points.length} point{section.points.length > 1 ? "s" : ""}
              </span>
              {!lecture && (
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label="Monter l'étape"
                    onClick={() => onChange(deplacer(sections, i, i - 1))}
                    className="text-outline transition-colors hover:text-primary disabled:opacity-30"
                    disabled={i === 0}
                  >
                    <ArrowUpwardOutlined style={{ fontSize: 16 }} />
                  </button>
                  <button
                    type="button"
                    aria-label="Descendre l'étape"
                    onClick={() => onChange(deplacer(sections, i, i + 1))}
                    className="text-outline transition-colors hover:text-primary disabled:opacity-30"
                    disabled={i === sections.length - 1}
                  >
                    <ArrowDownwardOutlined style={{ fontSize: 16 }} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Supprimer l'étape ${i + 1}`}
                    onClick={() => onChange(sections.filter((_, n) => n !== i))}
                    className="text-outline transition-colors hover:text-error"
                  >
                    <DeleteOutlineOutlined style={{ fontSize: 18 }} />
                  </button>
                </span>
              )}
            </div>

            {!replie && (
              <>
                <input
                  className={`${PETIT} mt-2`}
                  placeholder="Consigne pour l'agent (facultatif)"
                  value={section.consigne ?? ""}
                  disabled={lecture}
                  onChange={(e) => majSection(i, { consigne: e.target.value || null })}
                />

                <ol className="mt-2 space-y-2">
                  {section.points.map((point, j) => (
                    <li
                      key={j}
                      className="rounded-lg border border-outline-soft bg-surface-container-lowest p-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-5 shrink-0 text-right text-label-md text-outline">
                          {j + 1}.
                        </span>
                        <input
                          className={`${CHAMP} min-w-[12rem] flex-1`}
                          placeholder="La question posée à l'agent"
                          value={point.libelle}
                          disabled={lecture}
                          onChange={(e) => majPoint(i, j, { libelle: e.target.value })}
                        />
                        <select
                          className={`${CHAMP} w-[11rem] shrink-0`}
                          value={point.type}
                          disabled={lecture}
                          onChange={(e) =>
                            majPoint(i, j, { type: e.target.value as TypePoint })
                          }
                        >
                          {TYPES.map((t) => (
                            <option key={t.cle} value={t.cle}>
                              {t.libelle}
                            </option>
                          ))}
                        </select>
                        {!lecture && (
                          <span className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              aria-label="Monter le point"
                              onClick={() =>
                                majSection(i, { points: deplacer(section.points, j, j - 1) })
                              }
                              className="text-outline transition-colors hover:text-primary disabled:opacity-30"
                              disabled={j === 0}
                            >
                              <ArrowUpwardOutlined style={{ fontSize: 16 }} />
                            </button>
                            <button
                              type="button"
                              aria-label="Descendre le point"
                              onClick={() =>
                                majSection(i, { points: deplacer(section.points, j, j + 1) })
                              }
                              className="text-outline transition-colors hover:text-primary disabled:opacity-30"
                              disabled={j === section.points.length - 1}
                            >
                              <ArrowDownwardOutlined style={{ fontSize: 16 }} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Supprimer le point ${j + 1}`}
                              onClick={() =>
                                majSection(i, {
                                  points: section.points.filter((_, n) => n !== j),
                                })
                              }
                              className="text-outline transition-colors hover:text-error"
                            >
                              <DeleteOutlineOutlined style={{ fontSize: 18 }} />
                            </button>
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
                        <input
                          className={`${PETIT} min-w-[10rem] flex-1`}
                          placeholder="Aide affichée sous la question (facultatif)"
                          value={point.aide ?? ""}
                          disabled={lecture}
                          onChange={(e) => majPoint(i, j, { aide: e.target.value || null })}
                        />
                        <label className="flex shrink-0 items-center gap-1.5 text-label-md text-on-surface-variant">
                          <input
                            type="checkbox"
                            checked={point.obligatoire}
                            disabled={lecture}
                            onChange={(e) => majPoint(i, j, { obligatoire: e.target.checked })}
                            className="accent-primary"
                          />
                          obligatoire
                        </label>
                      </div>

                      {point.type === "NOMBRE" && (
                        <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
                          <span className="text-label-md text-outline">Attendu entre</span>
                          <input
                            type="number"
                            className={`${PETIT} w-24`}
                            placeholder="min"
                            value={point.minimum ?? ""}
                            disabled={lecture}
                            onChange={(e) =>
                              majPoint(i, j, {
                                minimum: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                          />
                          <span className="text-label-md text-outline">et</span>
                          <input
                            type="number"
                            className={`${PETIT} w-24`}
                            placeholder="max"
                            value={point.maximum ?? ""}
                            disabled={lecture}
                            onChange={(e) =>
                              majPoint(i, j, {
                                maximum: e.target.value === "" ? null : Number(e.target.value),
                              })
                            }
                          />
                          <input
                            className={`${PETIT} w-24`}
                            placeholder="unité"
                            value={point.unite ?? ""}
                            disabled={lecture}
                            onChange={(e) => majPoint(i, j, { unite: e.target.value || null })}
                          />
                          <span className="text-label-md text-outline">
                            hors bornes = anomalie signalée, jamais un blocage
                          </span>
                        </div>
                      )}

                      {(point.type === "CHOIX_UNIQUE" || point.type === "CHOIX_MULTIPLE") && (
                        <div className="mt-2 pl-7">
                          <input
                            className={PETIT}
                            placeholder="Les réponses possibles, séparées par des virgules"
                            value={point.options.join(", ")}
                            disabled={lecture}
                            onChange={(e) =>
                              majPoint(i, j, {
                                options: e.target.value
                                  .split(",")
                                  .map((o) => o.trim())
                                  .filter(Boolean),
                              })
                            }
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ol>

                {!lecture && (
                  <button
                    type="button"
                    onClick={() => majSection(i, { points: [...section.points, pointVide()] })}
                    className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-outline-soft px-2.5 text-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
                  >
                    <AddOutlined style={{ fontSize: 16 }} />
                    Ajouter un point de contrôle
                  </button>
                )}
              </>
            )}
          </section>
        );
      })}

      {!lecture && (
        <button
          type="button"
          onClick={() =>
            onChange([...sections, { titre: "", consigne: null, points: [pointVide()] }])
          }
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          <AddOutlined style={{ fontSize: 18 }} />
          Ajouter une étape
        </button>
      )}
    </div>
  );
}
