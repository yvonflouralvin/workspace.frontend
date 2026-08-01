"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Questionnaire } from "@/components/forms/Questionnaire";
import { formsApi, type FormulairePublic } from "@/app/lib/forms-api";

/** La page d'un formulaire PUBLIC.
 *
 *  Hors du shell : pas de barre latérale, pas de sélecteur de workspace, aucun
 *  élément du produit. Un visiteur sans compte vient répondre à une question,
 *  pas visiter une application — et rien de ce qu'il voit ne doit lui apprendre
 *  ce qu'il y a derrière.
 */
export default function FormulairePublicPage() {
  const { jeton } = useParams<{ jeton: string }>();
  const [forme, setForme] = useState<FormulairePublic | null>(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [introuvable, setIntrouvable] = useState(false);

  const charger = useCallback(async () => {
    try {
      setForme(await formsApi.publicGet(jeton));
    } catch {
      setIntrouvable(true);
    }
  }, [jeton]);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:py-14">
      <div className="mx-auto max-w-[720px]">
        {introuvable && (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-6 py-12 text-center">
            <p className="font-display text-headline-sm text-on-surface">
              Ce formulaire n&apos;est pas disponible
            </p>
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Le lien est peut-être erroné, ou le formulaire a été fermé.
            </p>
          </div>
        )}

        {!introuvable && !forme && (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        )}

        {forme && (
          <Questionnaire
            titre={forme.titre}
            description={forme.description}
            sections={forme.sections}
            questions={forme.questions}
            busy={busy}
            erreur={erreur}
            confirmation={confirmation}
            identite
            onDeposer={(question, fichier) =>
              formsApi.publicDeposer(jeton, question.id, fichier)
            }
            onEnvoyer={async (reponses, identite) => {
              setBusy(true);
              setErreur(null);
              try {
                const retour = await formsApi.publicSoumettre(jeton, {
                  reponses,
                  repondant_nom: identite.nom,
                  repondant_email: identite.email,
                });
                setConfirmation(retour.message);
              } catch (e) {
                setErreur(e instanceof Error ? e.message : "Envoi impossible.");
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
      </div>
    </main>
  );
}
