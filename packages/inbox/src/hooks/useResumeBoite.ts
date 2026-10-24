"use client";

/** Le compteur de la boîte, pour la pastille de la barre latérale.
 *
 *  Un SONDAGE, pas un temps réel. Le hub pousse déjà un signal par WebSocket
 *  pour la cloche (`useNotifications`), mais la pastille de la boîte compte
 *  AUSSI les fils, qui n'ont pas de canal temps réel. Plutôt qu'ouvrir une
 *  seconde socket pour un nombre, on redemande de loin en loin : c'est un
 *  chiffre, pas une conversation.
 */
import { useEffect, useState } from "react";

import { resume as lireResume } from "../api/client";
import type { Resume } from "../types";

const RYTHME_MS = 60_000;

export function useResumeBoite(actif = true): Resume | null {
  const [resume, setResume] = useState<Resume | null>(null);

  useEffect(() => {
    if (!actif) return;
    let vivant = true;
    const demander = () => {
      lireResume()
        .then((r) => {
          if (vivant) setResume(r);
        })
        .catch(() => {});
    };
    demander();
    const minuteur = setInterval(demander, RYTHME_MS);
    return () => {
      vivant = false;
      clearInterval(minuteur);
    };
  }, [actif]);

  return resume;
}
