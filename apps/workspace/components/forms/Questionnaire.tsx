"use client";

import { useMemo, useState } from "react";
import {
  ArrowBackOutlined,
  ArrowForwardOutlined,
  CheckCircleOutlineOutlined,
  SendOutlined,
} from "@mui/icons-material";
import { ChampReponse } from "./ChampReponse";
import type { Depot, Question, Section } from "@/app/lib/forms-api";

/** Le questionnaire à remplir.
 *
 *  UN SEUL composant pour l'écran interne et pour la page publique. Deux copies
 *  divergeraient au premier type de question ajouté, et c'est la version
 *  publique — celle qu'on regarde le moins — qui resterait en arrière.
 *
 *  Il ne valide rien : le serveur seul décide, et son refus nomme la question.
 *  Rejouer les règles ici les ferait exister à deux endroits, donc diverger.
 */
export function Questionnaire({
  titre,
  description,
  sections = [],
  questions,
  busy,
  erreur,
  confirmation,
  identite,
  onDeposer,
  onEnvoyer,
}: {
  titre: string;
  description?: string | null;
  /** Étapes du formulaire. Vide = tout tient sur un écran. */
  sections?: Section[];
  questions: Question[];
  busy: boolean;
  erreur: string | null;
  /** Message affiché à la place du formulaire, une fois envoyé. */
  confirmation: string | null;
  /** Demande le nom et l'e-mail — seulement quand le répondant n'a pas de compte. */
  identite?: boolean;
  onDeposer?: (question: Question, fichier: File) => Promise<Depot>;
  onEnvoyer: (
    reponses: { question_id: number; valeur: unknown }[],
    identite: { nom: string | null; email: string | null }
  ) => void;
}) {
  const [valeurs, setValeurs] = useState<Record<number, unknown>>({});
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [etape, setEtape] = useState(0);
  const [manquantes, setManquantes] = useState<number[]>([]);

  /** Les étapes réellement servies.
   *
   *  Les questions sans section forment une étape « Questions » en tête, et non
   *  une étape par question orpheline : c'est ce qu'on attend d'un formulaire
   *  auquel on vient d'ajouter des sections. */
  const etapes = useMemo(() => {
    const orphelines = questions.filter((q) => q.section_id === null);
    const parSection = sections.map((section) => ({
      section,
      questions: questions.filter((q) => q.section_id === section.id),
    }));
    const liste = orphelines.length
      ? [{ section: null as Section | null, questions: orphelines }, ...parSection]
      : parSection;
    // Une étape vide n'a rien à montrer et casserait la progression.
    return liste.filter((e) => e.questions.length > 0);
  }, [sections, questions]);

  const parEtapes = etapes.length > 1;
  const courante = parEtapes ? etapes[Math.min(etape, etapes.length - 1)]! : null;
  const affichees = courante ? courante.questions : questions;
  const derniere = !parEtapes || etape >= etapes.length - 1;

  /** Contrôle de CONFORT avant de passer à l'étape suivante.
   *
   *  Le serveur reste l'autorité — il refuse et nomme la question. Mais sans ce
   *  garde-fou, une obligatoire oubliée à l'étape 1 ne se découvrirait qu'après
   *  avoir rempli les quatre suivantes. */
  function incompletes(liste: Question[]): number[] {
    return liste
      .filter((q) => q.obligatoire)
      .filter((q) => {
        const valeur = valeurs[q.id];
        if (valeur === null || valeur === undefined) return true;
        if (typeof valeur === "string") return !valeur.trim();
        if (Array.isArray(valeur)) return valeur.length === 0;
        return false;
      })
      .map((q) => q.id);
  }

  if (confirmation) {
    return (
      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-6 py-10 text-center">
        <span className="inline-flex text-secondary">
          <CheckCircleOutlineOutlined style={{ fontSize: 40 }} />
        </span>
        <p className="mt-3 text-body-lg text-on-surface">{confirmation}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-5 border-t-4 border-t-primary">
        <h1 className="font-display text-headline-md text-on-surface">{titre}</h1>
        {description && (
          <p className="mt-1.5 whitespace-pre-wrap text-body-sm text-on-surface-variant">
            {description}
          </p>
        )}
      </div>

      {identite && (
        <div className="mt-3 rounded-2xl border border-outline-soft bg-surface-container-lowest p-5">
          <p className="text-body-md font-medium text-on-surface">Vous</p>
          <p className="mt-0.5 text-label-md text-outline">
            Facultatif — cela aide seulement à recontacter, si besoin.
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              aria-label="Votre nom"
              className="h-9 w-full px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Votre nom"
            />
            <input
              aria-label="Votre adresse e-mail"
              type="email"
              className="h-9 w-full px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nom@exemple.cd"
            />
          </div>
        </div>
      )}

      {parEtapes && (
        <div className="mt-3 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-body-md font-medium text-on-surface">
              {courante?.section?.titre ?? "Questions"}
            </span>
            <span className="flex-none text-label-md text-outline">
              Étape {etape + 1} sur {etapes.length}
            </span>
          </p>
          {courante?.section?.description && (
            <p className="mt-0.5 text-body-sm text-on-surface-variant">
              {courante.section.description}
            </p>
          )}
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-track">
            <span
              className="block h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(((etape + 1) / etapes.length) * 100)}%` }}
            />
          </span>
        </div>
      )}

      <div className="mt-3 space-y-3">
        {affichees.map((question) => (
          <div
            key={question.id}
            className={`rounded-2xl border bg-surface-container-lowest p-5 ${
              manquantes.includes(question.id) ? "border-error" : "border-outline-soft"
            }`}
          >
            <p className="text-body-md text-on-surface">
              {question.libelle}
              {question.obligatoire && (
                <span className="ml-1 text-error" aria-label="obligatoire">
                  *
                </span>
              )}
            </p>
            {question.aide && (
              <p className="mt-0.5 text-label-md text-outline">{question.aide}</p>
            )}
            <div className="mt-3">
              <ChampReponse
                question={question}
                valeur={valeurs[question.id]}
                disabled={busy}
                onDeposer={onDeposer}
                onChange={(valeur) => {
                  setValeurs((prec) => ({ ...prec, [question.id]: valeur }));
                  setManquantes((prec) => prec.filter((id) => id !== question.id));
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {erreur && (
        <p className="mt-3 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {parEtapes && etape > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setEtape((n) => n - 1);
              setManquantes([]);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-outline-soft text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <ArrowBackOutlined style={{ fontSize: 16 }} />
            Précédent
          </button>
        )}

        {!derniere ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const trous = incompletes(affichees);
              setManquantes(trous);
              if (!trous.length) setEtape((n) => n + 1);
            }}
            className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            Suivant
            <ArrowForwardOutlined style={{ fontSize: 16 }} />
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || questions.length === 0}
            onClick={() => {
              const trous = incompletes(affichees);
              setManquantes(trous);
              if (trous.length) return;
              // On envoie TOUTES les questions, pas seulement l'étape visible :
              // le découpage est un confort d'affichage, la soumission est
              // entière.
              onEnvoyer(
                questions.map((q) => ({ question_id: q.id, valeur: valeurs[q.id] ?? null })),
                { nom: nom.trim() || null, email: email.trim() || null }
              );
            }}
            className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            <SendOutlined style={{ fontSize: 16 }} />
            Envoyer
          </button>
        )}

        <span className="text-label-md text-outline">* question obligatoire</span>
        {manquantes.length > 0 && (
          <span className="text-label-md text-error">
            {manquantes.length} question{manquantes.length > 1 ? "s" : ""} obligatoire
            {manquantes.length > 1 ? "s" : ""} à remplir.
          </span>
        )}
      </div>
    </div>
  );
}
