"use client";

import { useState } from "react";
import Link from "next/link";
import { EditOutlined, InsightsOutlined } from "@mui/icons-material";
import { Questionnaire } from "@/components/forms/Questionnaire";
import { formsApi, type Question } from "@/app/lib/forms-api";
import { useFormulaire } from "../form-context";

export default function RemplirPage() {
  const { forme, recharger } = useFormulaire();
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [recu, setRecu] = useState<string | null>(null);

  const questions = forme.questions.filter((q) => !q.supprimee);
  // Un concepteur qui vient voir son formulaire le voit tel qu'il sera, sans
  // pouvoir l'envoyer : sinon il polluerait ses propres résultats en vérifiant.
  const lectureSeule = !forme.peut_repondre;

  return (
    <div className="max-w-[760px]">
      {lectureSeule && (
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
        busy={busy || lectureSeule}
        erreur={erreur}
        confirmation={confirmation}
        banniereUrl={forme.a_banniere ? formsApi.banniereUrl(forme.id) : null}
        recuUrl={recu ? formsApi.recuUrl(recu) : null}
        onDeposer={(question: Question, fichier: File) =>
          formsApi.deposer(forme.id, question.id, fichier)
        }
        onEnvoyer={async (reponses) => {
          setBusy(true);
          setErreur(null);
          try {
            const soumission = await formsApi.soumettre(forme.id, reponses);
            setRecu(soumission.jeton_recu);
            setConfirmation(
              forme.message_confirmation ||
                // Ce qui se passe ENSUITE n'est pas le même selon le
                // formulaire : dire « enregistrée » à quelqu'un qui attend une
                // décision lui ferait croire que c'est fini.
                (soumission.approbation_request_id
                  ? "Merci, votre demande est partie en approbation. Vous serez prévenu de la décision."
                  : "Merci, votre réponse a bien été enregistrée.")
            );
            await recharger();
          } catch (e) {
            setErreur(e instanceof Error ? e.message : "Envoi impossible.");
          } finally {
            setBusy(false);
          }
        }}
      />

      {/* EN BAS, et pas en haut : concevoir et dépouiller ne sont pas ce qu'on
          vient faire ici. Ils n'apparaissent qu'à qui y a droit. */}
      {(forme.peut_modifier || forme.peut_voir_resultats) && (
        <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-outline-soft pt-4">
          {forme.peut_modifier && (
            <Link
              href={`/forms/${forme.id}`}
              className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
            >
              <EditOutlined style={{ fontSize: 16 }} />
              Modifier ce formulaire
            </Link>
          )}
          {forme.peut_voir_resultats && (
            <Link
              href={`/forms/${forme.id}/resultats`}
              className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
            >
              <InsightsOutlined style={{ fontSize: 16 }} />
              Voir les résultats ({forme.nb_soumissions})
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
