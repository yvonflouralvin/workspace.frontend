"use client";

import { useEffect, useState } from "react";
import {
  AutoAwesomeOutlined,
  CheckCircleOutlined,
  ErrorOutlineOutlined,
} from "@mui/icons-material";
import { useConfirmSuppression } from "@repo/ui/hooks/useConfirmSuppression";
import { brancherConnexion, lireConnexion, revoquerConnexion } from "../api/client";
import type { EtatConnexion } from "../types";

/** Écran d'administration : brancher l'abonnement Claude de l'organisation.
 *
 *  À placer derrière la permission `agent.manage`. Le jeton n'est jamais relu
 *  par personne — l'écran n'en montre que les quatre derniers caractères, parce
 *  qu'un administrateur qui en branche deux doit pouvoir dire lequel est là. */
export function ConnexionAssistant({ base }: { base?: string }) {
  const [etat, setEtat] = useState<EtatConnexion | null>(null);
  const [jeton, setJeton] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const { confirmer, dialogue } = useConfirmSuppression();

  useEffect(() => {
    let vivant = true;
    lireConnexion(base)
      .then((e) => vivant && setEtat(e))
      .catch((e: Error) => vivant && setErreur(e.message));
    return () => {
      vivant = false;
    };
  }, [base]);

  async function brancher() {
    if (!jeton.trim()) return;
    setOccupe(true);
    setErreur(null);
    try {
      setEtat(await brancherConnexion(jeton.trim(), base));
      setJeton("");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le jeton n'a pas pu être enregistré");
    } finally {
      setOccupe(false);
    }
  }

  return (
    <div className="max-w-[46rem] space-y-4">
      <div className="p-4 rounded-2xl border border-outline-soft bg-surface-container-lowest">
        <p className="flex items-center gap-2 font-display text-headline-sm text-on-surface">
          <AutoAwesomeOutlined style={{ fontSize: 20 }} className="text-primary" />
          Abonnement Claude
        </p>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          L'assistant répond avec l'abonnement Claude de votre organisation. Tant
          qu'aucun n'est branché, personne ne peut lui parler.
        </p>

        {etat?.connectee ? (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-secondary/8 border border-secondary/20">
            <CheckCircleOutlined style={{ fontSize: 18 }} className="text-secondary mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-on-surface">
                Connecté — jeton se terminant par « {etat.empreinte} »
              </p>
              {etat.connecte_le && (
                <p className="text-body-sm text-on-surface-variant">
                  Branché le {new Date(etat.connecte_le).toLocaleDateString("fr-FR")}
                </p>
              )}
            </div>
            <button
              onClick={() =>
                confirmer({
                  title: "Révoquer l'abonnement ?",
                  message:
                    "L'assistant cessera de répondre pour tout le monde dans cet espace de travail. Les conversations déjà tenues restent lisibles.",
                  confirmLabel: "Révoquer",
                  action: async () => setEtat(await revoquerConnexion(base)),
                })
              }
              className="flex-none text-body-sm text-error hover:underline underline-offset-2"
            >
              Révoquer
            </button>
          </div>
        ) : etat?.statut === "INVALIDE" ? (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-error-container/40 border border-error/20">
            <ErrorOutlineOutlined style={{ fontSize: 18 }} className="text-error mt-0.5" />
            <div className="min-w-0">
              <p className="text-body-sm font-medium text-on-surface">
                Le jeton a été refusé
              </p>
              <p className="text-body-sm text-on-surface-variant">
                {etat.dernier_echec ?? "Claude n'a pas accepté cet abonnement."} Branchez-en un nouveau ci-dessous.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <label
            htmlFor="jeton-claude"
            className="block text-label-md font-medium text-on-surface-variant"
          >
            {etat?.connectee ? "Remplacer le jeton" : "Jeton d'abonnement"}
          </label>
          <div className="mt-1.5 flex gap-2">
            <input
              id="jeton-claude"
              type="password"
              autoComplete="off"
              value={jeton}
              onChange={(e) => setJeton(e.target.value)}
              placeholder="sk-ant-oat…"
              className="flex-1 h-10 px-3 rounded-lg border border-outline-soft bg-background text-body-md text-on-surface placeholder:text-outline outline-none focus:border-primary/40 transition-colors font-mono"
            />
            <button
              onClick={() => void brancher()}
              disabled={occupe || !jeton.trim()}
              className="h-10 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-medium disabled:bg-track disabled:text-outline transition-colors"
            >
              {occupe ? "Enregistrement…" : "Brancher"}
            </button>
          </div>
          {erreur && <p className="mt-2 text-body-sm text-error">{erreur}</p>}
        </div>
      </div>

      <div className="p-4 rounded-2xl border border-outline-soft bg-surface-container-low">
        <p className="text-body-sm font-semibold text-on-surface">Où trouver ce jeton</p>
        <ol className="mt-2 space-y-1.5 pl-5 list-decimal marker:text-outline text-body-sm text-on-surface-variant">
          <li>
            Installez Claude Code sur votre machine :{" "}
            <code className="px-1 py-0.5 rounded-sm bg-surface-container font-mono text-[0.92em]">
              npm install -g @anthropic-ai/claude-code
            </code>
          </li>
          <li>
            Lancez{" "}
            <code className="px-1 py-0.5 rounded-sm bg-surface-container font-mono text-[0.92em]">
              claude setup-token
            </code>{" "}
            et connectez-vous avec le compte Claude de l'organisation.
          </li>
          <li>Copiez le jeton affiché et collez-le ci-dessus.</li>
        </ol>
        <p className="mt-3 text-body-sm text-on-surface-variant">
          Le jeton est chiffré avant d'être enregistré et ne ressort jamais de ce
          serveur. Il donne accès à l'abonnement : traitez-le comme un mot de passe.
        </p>
      </div>

      {dialogue}
    </div>
  );
}
