"use client";

/** Un fil, et de quoi y répondre.
 *
 *  Le fil se RECHARGE tant qu'un collaborateur travaille : sa réponse arrive
 *  par un autre chemin que le nôtre (le service `agent` la repose quand sa
 *  mission est finie), et sans cette boucle elle n'apparaîtrait qu'au
 *  prochain clic.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorOutlineOutlined, SendOutlined, SmartToyOutlined } from "@mui/icons-material";
import { Avatar } from "@repo/ui/Avatar";
import { Markdown } from "@repo/agent-chat/lib/markdown";

import { lireFil, repondre } from "../api/client";
import type { FilDetail, MessageFil } from "../types";

const RYTHME_MS = 4000;

export function VueFil({
  filId,
  peutEcrire,
  onChange,
}: {
  filId: number;
  peutEcrire: boolean;
  onChange?: () => void;
}) {
  const [fil, setFil] = useState<FilDetail | null>(null);
  const [brouillon, setBrouillon] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const bas = useRef<HTMLDivElement>(null);

  const charger = useCallback(
    async (silencieux = false) => {
      try {
        const detail = await lireFil(filId);
        setFil(detail);
        if (!silencieux) setErreur(null);
      } catch {
        if (!silencieux) setErreur("Ce fil n'a pas pu être ouvert.");
      }
    },
    [filId],
  );

  useEffect(() => {
    setFil(null);
    setBrouillon("");
    void charger();
  }, [charger]);

  useEffect(() => {
    if (!fil?.en_cours) return;
    const minuteur = setInterval(() => void charger(true), RYTHME_MS);
    return () => clearInterval(minuteur);
  }, [fil?.en_cours, charger]);

  // Toujours sur le dernier message : un fil qui s'ouvre en haut oblige à
  // faire défiler pour lire ce qui vient d'arriver.
  useEffect(() => {
    bas.current?.scrollIntoView({ block: "end" });
  }, [fil?.messages.length, fil?.en_cours]);

  async function envoyer() {
    const texte = brouillon.trim();
    if (!texte || envoi) return;
    setEnvoi(true);
    setErreur(null);
    try {
      setFil(await repondre(filId, texte));
      setBrouillon("");
      onChange?.();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'envoi a échoué.");
    } finally {
      setEnvoi(false);
    }
  }

  if (fil === null)
    return (
      <p className="p-6 text-body-sm text-on-surface-variant">
        {erreur ?? "Chargement…"}
      </p>
    );

  const agent = fil.correspondants.find((p) => p.collaborateur);

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-outline-variant bg-surface-container-lowest px-6 py-3.5">
        <h2 className="flex items-center gap-1.5 truncate font-display text-headline-sm text-on-surface">
          {agent && <SmartToyOutlined style={{ fontSize: 18 }} />}
          {fil.correspondants.map((p) => p.nom).join(", ")}
        </h2>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <div className="mx-auto flex max-w-[760px] flex-col gap-4">
          {fil.messages.map((m) => (
            <Message key={m.id} message={m} />
          ))}
          {fil.en_cours && agent && (
            <p className="flex items-center gap-2 text-body-sm text-primary">
              <SmartToyOutlined style={{ fontSize: 16 }} />
              {agent.nom} travaille… vous pouvez lui écrire, il le prendra ensuite.
            </p>
          )}
          <div ref={bas} />
        </div>
      </div>

      <footer className="shrink-0 border-t border-outline-variant bg-surface-container-lowest px-6 py-3">
        <div className="mx-auto max-w-[760px]">
          {erreur && <p className="mb-2 text-body-sm text-error">{erreur}</p>}
          {peutEcrire ? (
            <div className="flex items-end gap-2">
              <textarea
                value={brouillon}
                onChange={(e) => setBrouillon(e.target.value)}
                onKeyDown={(e) => {
                  // Entrée envoie, Maj+Entrée va à la ligne : c'est le geste
                  // d'une messagerie, pas celui d'un formulaire.
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void envoyer();
                  }
                }}
                rows={2}
                // ON N'EMPÊCHE PLUS D'ÉCRIRE PENDANT QU'IL TRAVAILLE. Le
                // champ était figé parce que le serveur refusait le second
                // message ; il le met maintenant en file et le traite en
                // terminant. Geler la saisie obligeait à guetter la fin
                // d'un travail pour pouvoir poser sa question — et une
                // conversation dont on doit surveiller l'état n'en est pas
                // une.
                placeholder={
                  fil.en_cours
                    ? "Écrire — il le traitera après ce qu'il fait…"
                    : "Écrire un message… (Maj+Entrée : nouvelle ligne)"
                }
                className="flex-1 resize-none rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => void envoyer()}
                disabled={envoi || !brouillon.trim()}
                className="mb-0.5 inline-flex h-[38px] items-center gap-1.5 rounded-lg bg-primary px-3.5 text-label-md text-on-primary shadow-button transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <SendOutlined style={{ fontSize: 16 }} />
                Envoyer
              </button>
            </div>
          ) : (
            <p className="text-body-sm text-on-surface-variant">
              Confier du travail à un collaborateur demande le droit
              «&nbsp;confier du travail à un collaborateur virtuel&nbsp;». Demandez-le à un
              administrateur de cet espace.
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}

function Message({ message }: { message: MessageFil }) {
  if (message.erreur)
    return (
      <div className="flex items-start gap-2.5 rounded-2xl border border-error/30 bg-error-container/40 px-4 py-3">
        <ErrorOutlineOutlined style={{ fontSize: 18 }} className="mt-0.5 shrink-0 text-error" />
        <div className="min-w-0">
          <p className="text-body-sm font-semibold text-on-surface">
            {message.auteur_nom} n&apos;a pas pu faire le travail
          </p>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">{message.erreur}</p>
        </div>
      </div>
    );

  return (
    <article className="flex items-start gap-3">
      <Avatar name={message.auteur_nom} size={32} />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2">
          <span className="text-body-sm font-semibold text-on-surface">{message.auteur_nom}</span>
          <span className="text-label-sm text-outline">
            {new Date(message.cree_le).toLocaleString("fr-FR", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </p>
        <div className="mt-1 text-body-md text-on-surface">
          <Markdown texte={message.contenu} />
        </div>
      </div>
    </article>
  );
}
