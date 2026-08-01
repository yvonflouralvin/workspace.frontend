"use client";

import { useState } from "react";
import { CheckCircleOutlineOutlined, SendOutlined } from "@mui/icons-material";
import { ChampReponse } from "./ChampReponse";
import type { Question } from "@/app/lib/forms-api";

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
  questions,
  busy,
  erreur,
  confirmation,
  identite,
  onEnvoyer,
}: {
  titre: string;
  description?: string | null;
  questions: Question[];
  busy: boolean;
  erreur: string | null;
  /** Message affiché à la place du formulaire, une fois envoyé. */
  confirmation: string | null;
  /** Demande le nom et l'e-mail — seulement quand le répondant n'a pas de compte. */
  identite?: boolean;
  onEnvoyer: (
    reponses: { question_id: number; valeur: unknown }[],
    identite: { nom: string | null; email: string | null }
  ) => void;
}) {
  const [valeurs, setValeurs] = useState<Record<number, unknown>>({});
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");

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

      <div className="mt-3 space-y-3">
        {questions.map((question) => (
          <div
            key={question.id}
            className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-5"
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
                onChange={(valeur) =>
                  setValeurs((prec) => ({ ...prec, [question.id]: valeur }))
                }
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

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={busy || questions.length === 0}
          onClick={() =>
            onEnvoyer(
              questions.map((q) => ({ question_id: q.id, valeur: valeurs[q.id] ?? null })),
              { nom: nom.trim() || null, email: email.trim() || null }
            )
          }
          className="inline-flex items-center gap-1.5 h-9 px-5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
        >
          <SendOutlined style={{ fontSize: 16 }} />
          Envoyer
        </button>
        <span className="text-label-md text-outline">* question obligatoire</span>
      </div>
    </div>
  );
}
