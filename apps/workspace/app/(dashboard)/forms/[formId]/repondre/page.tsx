"use client";

import { useState } from "react";
import { Questionnaire } from "@/components/forms/Questionnaire";
import { formsApi, type Question } from "@/app/lib/forms-api";
import { useFormulaire } from "../form-context";

export default function ApercuPage() {
  const { forme, recharger } = useFormulaire();
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const questions = forme.questions.filter((q) => !q.supprimee);
  // Un concepteur qui vient en aperçu voit le formulaire tel qu'il sera, sans
  // pouvoir l'envoyer : sinon il polluerait ses propres résultats en vérifiant.
  const apercuSeul = !forme.peut_repondre;

  return (
    <div className="max-w-[760px]">
      {apercuSeul && (
        <p className="mb-3 rounded-lg bg-surface-container px-3 py-2 text-body-sm text-on-surface-variant">
          {forme.deja_repondu
            ? "Vous avez déjà répondu à ce formulaire."
            : forme.statut !== "PUBLIE"
              ? "Aperçu — ce formulaire n'est pas ouvert aux réponses."
              : "Vous ne pouvez pas répondre à ce formulaire."}
        </p>
      )}
      <Questionnaire
        titre={forme.titre}
        description={forme.description}
        sections={forme.sections}
        questions={questions}
        busy={busy || apercuSeul}
        erreur={erreur}
        confirmation={confirmation}
        onDeposer={(question: Question, fichier: File) =>
          formsApi.deposer(forme.id, question.id, fichier)
        }
        onEnvoyer={async (reponses) => {
          setBusy(true);
          setErreur(null);
          try {
            await formsApi.soumettre(forme.id, reponses);
            setConfirmation(
              forme.message_confirmation || "Merci, votre réponse a bien été enregistrée."
            );
            await recharger();
          } catch (e) {
            setErreur(e instanceof Error ? e.message : "Envoi impossible.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}
