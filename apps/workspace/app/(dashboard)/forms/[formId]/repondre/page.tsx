"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowBackOutlined } from "@mui/icons-material";
import { Questionnaire } from "@/components/forms/Questionnaire";
import { formsApi, type Formulaire } from "@/app/lib/forms-api";

export default function RepondrePage() {
  const { formId } = useParams<{ formId: string }>();
  const id = Number(formId);
  const [forme, setForme] = useState<Formulaire | null>(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [introuvable, setIntrouvable] = useState(false);

  const charger = useCallback(async () => {
    try {
      setForme(await formsApi.get(id));
    } catch {
      setIntrouvable(true);
    }
  }, [id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (introuvable) {
    return (
      <div className="p-4 md:p-8 max-w-[760px] mx-auto space-y-4">
        <Retour />
        <p className="text-body-md text-error">Formulaire introuvable.</p>
      </div>
    );
  }
  if (!forme) {
    return <p className="p-4 md:p-8 text-body-md text-on-surface-variant">Chargement…</p>;
  }

  const questions = forme.questions.filter((q) => !q.supprimee);
  // Un concepteur qui vient en aperçu voit le formulaire tel qu'il sera, sans
  // pouvoir l'envoyer : sinon il polluerait ses propres résultats en vérifiant.
  const apercuSeul = !forme.peut_repondre;

  return (
    <div className="p-4 md:p-8 max-w-[760px] mx-auto">
      <Retour />
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
        questions={questions}
        busy={busy || apercuSeul}
        erreur={erreur}
        confirmation={confirmation}
        onEnvoyer={async (reponses) => {
          setBusy(true);
          setErreur(null);
          try {
            await formsApi.soumettre(id, reponses);
            setConfirmation(
              forme.message_confirmation || "Merci, votre réponse a bien été enregistrée."
            );
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

function Retour() {
  return (
    <Link
      href="/forms"
      className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
    >
      <ArrowBackOutlined style={{ fontSize: 15 }} /> Formulaires
    </Link>
  );
}
