"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AddOutlined,
  ArrowDownwardOutlined,
  ArrowUpwardOutlined,
  DeleteOutlineOutlined,
  LockOutlined,
  SwapHorizOutlined,
  ViewAgendaOutlined,
} from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import {
  TAILLE_MAX_MO,
  TYPES_QUESTION,
  formsApi,
  type QuestionEcrite,
  type SectionEcrite,
  type TypeQuestion,
} from "@/app/lib/forms-api";
import { useFormulaire } from "./form-context";

const CHAMP =
  "h-9 w-full px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors disabled:opacity-60";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";

/** Une question en cours d'édition. `gelees` porte le nombre de réponses déjà
 *  reçues — au-delà de zéro, ce qui change son sens se verrouille. */
interface Brouillon extends QuestionEcrite {
  cle: string;
  nb_reponses: number;
}

/** Les sections neuves portent un identifiant NÉGATIF : le serveur les
 *  reconnaît comme provisoires et rend la correspondance vers l'identifiant
 *  réel, ce qui permet de créer sections et questions dans le même envoi. */
let compteurProvisoire = -1;

export default function EditionFormulairePage() {
  const { forme, recharger } = useFormulaire();
  const [titre, setTitre] = useState(forme.titre);
  const [description, setDescription] = useState(forme.description ?? "");
  const [sections, setSections] = useState<(SectionEcrite & { cle: string })[]>([]);
  const [questions, setQuestions] = useState<Brouillon[]>([]);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setTitre(forme.titre);
    setDescription(forme.description ?? "");
    setSections(
      forme.sections.map((s) => ({
        cle: `s-${s.id}`,
        id: s.id,
        titre: s.titre,
        description: s.description,
      }))
    );
    // Les questions retirées ne reviennent pas dans l'éditeur : elles ne vivent
    // plus que dans les résultats.
    setQuestions(
      forme.questions
        .filter((q) => !q.supprimee)
        .map((q) => ({
          cle: `q-${q.id}`,
          id: q.id,
          section_id: q.section_id,
          type: q.type,
          libelle: q.libelle,
          aide: q.aide,
          obligatoire: q.obligatoire,
          options: q.options,
          config: q.config,
          nb_reponses: q.nb_reponses,
        }))
    );
  }, [forme]);

  if (!forme.peut_modifier) {
    return (
      <p className="text-body-md text-on-surface-variant">
        Vous consultez ce formulaire sans pouvoir le modifier.
      </p>
    );
  }

  /** Groupes affichés : l'étape implicite d'abord, puis chaque section. */
  const groupes = useMemo(
    () => [
      { cle: "libre", section: null as (SectionEcrite & { cle: string }) | null },
      ...sections.map((s) => ({ cle: s.cle, section: s })),
    ],
    [sections]
  );

  function questionsDe(sectionId: number | null | undefined) {
    return questions.filter((q) => (q.section_id ?? null) === (sectionId ?? null));
  }

  function modifier(cle: string, patch: Partial<Brouillon>) {
    setQuestions((liste) => liste.map((q) => (q.cle === cle ? { ...q, ...patch } : q)));
  }

  function deplacer(cle: string, sens: number) {
    setQuestions((liste) => {
      const index = liste.findIndex((q) => q.cle === cle);
      const groupe = questionsDe(liste[index]!.section_id);
      const rang = groupe.findIndex((q) => q.cle === cle);
      const voisin = groupe[rang + sens];
      if (!voisin) return liste;
      const copie = [...liste];
      const cibleIndex = copie.findIndex((q) => q.cle === voisin.cle);
      [copie[index], copie[cibleIndex]] = [copie[cibleIndex]!, copie[index]!];
      return copie;
    });
  }

  /** Retire la question figée et en pose une neuve à sa place.
   *
   *  C'est la sortie que propose le refus du serveur : les anciennes réponses
   *  restent lisibles sous l'ancienne question, les nouvelles arrivent sur la
   *  nouvelle. Du versionnage à la granularité où il sert. */
  function remplacer(brouillon: Brouillon) {
    setQuestions((liste) =>
      liste.map((q) =>
        q.cle === brouillon.cle
          ? {
              cle: `n-${compteurProvisoire--}`,
              section_id: q.section_id,
              type: q.type,
              libelle: q.libelle,
              aide: q.aide,
              obligatoire: q.obligatoire,
              options: [...q.options],
              config: { ...q.config },
              nb_reponses: 0,
            }
          : q
      )
    );
    setToast("Question remplacée — enregistrez pour valider.");
  }

  async function enregistrer() {
    setBusy(true);
    setErreur(null);
    try {
      await formsApi.modifier(forme.id, {
        titre: titre.trim(),
        description: description.trim() || null,
        sections: sections.map((s) => ({
          id: s.id,
          titre: s.titre.trim(),
          description: s.description,
        })),
        questions: questions.map(({ cle, nb_reponses, ...q }) => ({
          ...q,
          libelle: q.libelle.trim(),
          options: q.options.map((o) => o.trim()).filter(Boolean),
        })),
      });
      await recharger();
      setToast("Formulaire enregistré.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[860px]">
      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
        <label className={LABEL}>Titre</label>
        <input className={CHAMP} value={titre} onChange={(e) => setTitre(e.target.value)} />
        <label className={`${LABEL} mt-3`}>Description</label>
        <textarea
          rows={2}
          className="w-full resize-y rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="À quoi sert ce formulaire, qui doit y répondre…"
        />
      </div>

      {forme.nb_soumissions > 0 && (
        <p className="mt-3 rounded-2xl border border-outline-soft bg-surface-container px-4 py-3 text-body-sm text-on-surface-variant">
          Ce formulaire a déjà reçu des réponses. Les questions qui en portent sont
          verrouillées sur ce qui changerait leur sens — intitulé, type, options existantes.
          Vous pouvez toujours en ajouter, les réordonner, ou <strong>remplacer</strong> une
          question figée : l&apos;ancienne se retire et le passé reste lisible.
        </p>
      )}

      {erreur && (
        <p className="mt-3 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      <div className="mt-4 space-y-4">
        {groupes.map(({ cle, section }) => {
          const liste = questionsDe(section?.id ?? null);
          if (!section && liste.length === 0 && sections.length > 0) return null;
          return (
            <section key={cle}>
              {section ? (
                <div className="rounded-2xl border border-outline-soft bg-surface-container-low/50 p-3">
                  <div className="flex items-start gap-2">
                    <span className="flex-none pt-2 text-outline">
                      <ViewAgendaOutlined style={{ fontSize: 17 }} />
                    </span>
                    <input
                      aria-label="Titre de la section"
                      className={`${CHAMP} flex-1 font-medium`}
                      value={section.titre}
                      onChange={(e) =>
                        setSections((l) =>
                          l.map((s) => (s.cle === cle ? { ...s, titre: e.target.value } : s))
                        )
                      }
                      placeholder="Titre de l'étape"
                    />
                    <button
                      type="button"
                      aria-label="Retirer la section"
                      onClick={() => {
                        setQuestions((l) =>
                          l.map((q) => (q.section_id === section.id ? { ...q, section_id: null } : q))
                        );
                        setSections((l) => l.filter((s) => s.cle !== cle));
                      }}
                      className="flex-none rounded-md p-2 text-outline transition-colors hover:bg-surface-container-low hover:text-error"
                    >
                      <DeleteOutlineOutlined style={{ fontSize: 16 }} />
                    </button>
                  </div>
                  <input
                    aria-label="Description de la section"
                    className={`${CHAMP} mt-2`}
                    value={section.description ?? ""}
                    onChange={(e) =>
                      setSections((l) =>
                        l.map((s) => (s.cle === cle ? { ...s, description: e.target.value } : s))
                      )
                    }
                    placeholder="Description de l'étape (facultatif)"
                  />
                </div>
              ) : (
                sections.length > 0 && (
                  <p className={LABEL}>Questions hors étape</p>
                )
              )}

              <div className="mt-2 space-y-3">
                {liste.map((question) => (
                  <CarteQuestion
                    key={question.cle}
                    question={question}
                    sections={sections}
                    onModifier={(patch) => modifier(question.cle, patch)}
                    onDeplacer={(sens) => deplacer(question.cle, sens)}
                    onRetirer={() =>
                      setQuestions((l) => l.filter((q) => q.cle !== question.cle))
                    }
                    onRemplacer={() => remplacer(question)}
                  />
                ))}
                {liste.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-outline-soft px-4 py-4 text-center text-body-sm text-outline-variant">
                    Aucune question dans cette étape.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setQuestions((l) => [
                      ...l,
                      {
                        cle: `n-${compteurProvisoire--}`,
                        section_id: section?.id ?? null,
                        type: "TEXTE_COURT",
                        libelle: "",
                        aide: null,
                        obligatoire: false,
                        options: [],
                        config: {},
                        nb_reponses: 0,
                      },
                    ])
                  }
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-4 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
                >
                  <AddOutlined style={{ fontSize: 16 }} />
                  Ajouter une question
                </button>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const id = compteurProvisoire--;
            setSections((l) => [
              ...l,
              { cle: `n-${id}`, id, titre: `Étape ${l.length + 1}`, description: null },
            ]);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-4 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
        >
          <ViewAgendaOutlined style={{ fontSize: 16 }} />
          Ajouter une étape
        </button>
        <span className="flex-1" />
        <button
          type="button"
          disabled={busy || !titre.trim()}
          onClick={enregistrer}
          className="h-9 rounded-lg bg-primary px-5 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container disabled:opacity-50"
        >
          Enregistrer
        </button>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function CarteQuestion({
  question,
  sections,
  onModifier,
  onDeplacer,
  onRetirer,
  onRemplacer,
}: {
  question: Brouillon;
  sections: (SectionEcrite & { cle: string })[];
  onModifier: (patch: Partial<Brouillon>) => void;
  onDeplacer: (sens: number) => void;
  onRetirer: () => void;
  onRemplacer: () => void;
}) {
  const type = TYPES_QUESTION.find((t) => t.cle === question.type)!;
  // Le verrou est affiché AVANT que le serveur ne refuse : un refus après coup
  // se lit comme une panne, pas comme une règle.
  const gelee = question.nb_reponses > 0;

  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      {gelee && (
        <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-surface-container px-2 py-0.5 text-label-md text-on-surface-variant">
          <LockOutlined style={{ fontSize: 13 }} />
          {question.nb_reponses} réponse{question.nb_reponses > 1 ? "s" : ""} — intitulé et
          type figés
        </p>
      )}

      <div className="flex flex-wrap items-start gap-2">
        <input
          aria-label="Intitulé de la question"
          className={`${CHAMP} min-w-[220px] flex-1`}
          value={question.libelle}
          disabled={gelee}
          onChange={(e) => onModifier({ libelle: e.target.value })}
          placeholder="Votre question…"
        />
        <select
          aria-label="Type de la question"
          className={`${CHAMP} w-[170px]`}
          value={question.type}
          disabled={gelee}
          onChange={(e) => {
            const nouveau = e.target.value as TypeQuestion;
            const cible = TYPES_QUESTION.find((t) => t.cle === nouveau)!;
            onModifier({
              type: nouveau,
              // Changer de type efface les options quand le nouveau n'en accepte
              // pas : les garder ferait refuser l'enregistrement sans que rien
              // ne se voie à l'écran.
              options: cible.aOptions ? question.options : [],
              config:
                nouveau === "ECHELLE"
                  ? { min: 1, max: 5 }
                  : nouveau === "FICHIER"
                    ? { extensions: [], taille_max_mo: 10 }
                    : {},
            });
          }}
        >
          {TYPES_QUESTION.map((t) => (
            <option key={t.cle} value={t.cle}>
              {t.libelle}
            </option>
          ))}
        </select>
        {sections.length > 0 && (
          <select
            aria-label="Étape de la question"
            className={`${CHAMP} w-[150px]`}
            value={question.section_id ?? ""}
            onChange={(e) =>
              onModifier({ section_id: e.target.value ? Number(e.target.value) : null })
            }
          >
            <option value="">Hors étape</option>
            {sections.map((s) => (
              <option key={s.cle} value={s.id ?? ""}>
                {s.titre}
              </option>
            ))}
          </select>
        )}
        <span className="inline-flex items-center gap-0.5">
          <button
            type="button"
            aria-label="Monter la question"
            onClick={() => onDeplacer(-1)}
            className="rounded-md p-1.5 text-outline transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <ArrowUpwardOutlined style={{ fontSize: 16 }} />
          </button>
          <button
            type="button"
            aria-label="Descendre la question"
            onClick={() => onDeplacer(1)}
            className="rounded-md p-1.5 text-outline transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <ArrowDownwardOutlined style={{ fontSize: 16 }} />
          </button>
          {gelee && (
            <button
              type="button"
              aria-label="Remplacer la question"
              title="Remplacer par une question neuve"
              onClick={onRemplacer}
              className="rounded-md p-1.5 text-outline transition-colors hover:bg-surface-container-low hover:text-primary"
            >
              <SwapHorizOutlined style={{ fontSize: 16 }} />
            </button>
          )}
          <button
            type="button"
            aria-label="Retirer la question"
            onClick={onRetirer}
            className="rounded-md p-1.5 text-outline transition-colors hover:bg-surface-container-low hover:text-error"
          >
            <DeleteOutlineOutlined style={{ fontSize: 16 }} />
          </button>
        </span>
      </div>

      {type.aOptions && (
        <div className="mt-3">
          <label className={LABEL}>Options</label>
          <div className="space-y-1.5">
            {question.options.map((option, rang) => {
              // Une option déjà proposée ne se renomme pas : les décomptes
              // établis deviendraient faux.
              const figee = gelee && rang < (question.options.length ?? 0);
              return (
                <div key={rang} className="flex items-center gap-2">
                  <input
                    aria-label={`Option ${rang + 1}`}
                    className={CHAMP}
                    value={option}
                    disabled={figee}
                    onChange={(e) =>
                      onModifier({
                        options: question.options.map((o, i) =>
                          i === rang ? e.target.value : o
                        ),
                      })
                    }
                  />
                  {!figee && (
                    <button
                      type="button"
                      aria-label={`Retirer l'option ${rang + 1}`}
                      onClick={() =>
                        onModifier({ options: question.options.filter((_, i) => i !== rang) })
                      }
                      className="rounded-md p-1.5 text-outline transition-colors hover:text-error"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => onModifier({ options: [...question.options, ""] })}
              className="text-body-sm font-medium text-primary hover:underline"
            >
              + Ajouter une option
            </button>
          </div>
        </div>
      )}

      {question.type === "ECHELLE" && (
        <div className="mt-3 flex items-center gap-3">
          <label className="text-body-sm text-on-surface-variant">
            De
            <input
              type="number"
              aria-label="Note minimale"
              className={`${CHAMP} ml-1.5 inline-block w-[70px]`}
              value={question.config.min ?? 1}
              disabled={gelee}
              onChange={(e) =>
                onModifier({ config: { ...question.config, min: Number(e.target.value) } })
              }
            />
          </label>
          <label className="text-body-sm text-on-surface-variant">
            à
            <input
              type="number"
              aria-label="Note maximale"
              className={`${CHAMP} ml-1.5 inline-block w-[70px]`}
              value={question.config.max ?? 5}
              disabled={gelee}
              onChange={(e) =>
                onModifier({ config: { ...question.config, max: Number(e.target.value) } })
              }
            />
          </label>
        </div>
      )}

      {question.type === "FICHIER" && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[220px]">
            <span className={LABEL}>Extensions acceptées</span>
            <input
              aria-label="Extensions acceptées"
              className={CHAMP}
              value={(question.config.extensions ?? []).join(", ")}
              onChange={(e) =>
                onModifier({
                  config: {
                    ...question.config,
                    extensions: e.target.value
                      .split(",")
                      .map((x) => x.trim().replace(/^\./, "").toLowerCase())
                      .filter(Boolean),
                  },
                })
              }
              placeholder="pdf, png, docx — vide : tout est accepté"
            />
          </label>
          <label>
            <span className={LABEL}>Taille max (Mo)</span>
            <input
              type="number"
              aria-label="Taille maximale en Mo"
              className={`${CHAMP} w-[110px]`}
              min={1}
              max={TAILLE_MAX_MO}
              value={question.config.taille_max_mo ?? 10}
              onChange={(e) =>
                onModifier({
                  config: { ...question.config, taille_max_mo: Number(e.target.value) },
                })
              }
            />
          </label>
          <p className="text-label-md text-outline">{TAILLE_MAX_MO} Mo au maximum.</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          aria-label="Texte d'aide de la question"
          className={`${CHAMP} min-w-[200px] flex-1`}
          value={question.aide ?? ""}
          onChange={(e) => onModifier({ aide: e.target.value || null })}
          placeholder="Texte d'aide (facultatif)"
        />
        <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={question.obligatoire}
            // On peut toujours ASSOUPLIR : durcir après coup rendrait invalides
            // des soumissions déjà acceptées.
            disabled={gelee && !question.obligatoire}
            onChange={(e) => onModifier({ obligatoire: e.target.checked })}
          />
          Obligatoire
        </label>
      </div>
    </div>
  );
}
