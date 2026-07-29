"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { refusBlocage, type ErreurApi, type RefusBlocage, type RefusWip } from "./projects-api";

export type EtatSauvegarde = "idle" | "saving" | "saved" | "error";

/** Pourquoi la sauvegarde a échoué — pas seulement QU'ELLE a échoué.
 *
 *  Les files d'autosauvegarde du module ne remontaient qu'un booléen : une
 *  réponse parfaitement explicite du backend (« 2 livrables en attente, 1 jalon
 *  non franchi ») n'arrivait jamais à l'œil de l'utilisateur, qui voyait
 *  « Échec de l'enregistrement » et ne pouvait rien en faire. */
export interface EchecSauvegarde {
  message: string;
  /** Verrou de gouvernance : motifs nommés et cliquables. */
  refus: RefusBlocage | null;
  /** Limite de travail simultané franchie. */
  wip: RefusWip | null;
}

function lireEchec(e: unknown): EchecSauvegarde {
  const message = e instanceof Error ? e.message : "Enregistrement impossible.";
  const detail = (e as ErreurApi)?.detail as Record<string, unknown> | undefined;
  const wip =
    detail && typeof detail === "object" && "etat_id" in detail ? (detail as unknown as RefusWip) : null;
  return { message, refus: refusBlocage(e), wip };
}

const DELAI_MS = 800;

/** File d'écriture différée qui conserve le MOTIF de son échec.
 *
 *  Le patch refusé n'est pas remis dans la file : le réessayer en boucle
 *  rejouerait indéfiniment une écriture que le backend refuse pour une raison
 *  qui, elle, ne changera pas toute seule.
 */
export function useAutosave<T>(
  enregistrer: (patch: Partial<T>) => Promise<unknown>,
  apres?: () => Promise<unknown>
) {
  const [etat, setEtat] = useState<EtatSauvegarde>("idle");
  const [echec, setEchec] = useState<EchecSauvegarde | null>(null);

  const enAttente = useRef<Partial<T>>({});
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enregistrerRef = useRef(enregistrer);
  const apresRef = useRef(apres);
  enregistrerRef.current = enregistrer;
  apresRef.current = apres;

  const flush = useCallback(async () => {
    const corps = enAttente.current;
    enAttente.current = {};
    if (!Object.keys(corps).length) return;
    setEtat("saving");
    setEchec(null);
    try {
      await enregistrerRef.current(corps);
      await apresRef.current?.();
      setEtat("saved");
    } catch (e) {
      setEchec(lireEchec(e));
      setEtat("error");
    }
  }, []);

  const queue = useCallback(
    (patch: Partial<T>) => {
      enAttente.current = { ...enAttente.current, ...patch };
      if (minuteur.current) clearTimeout(minuteur.current);
      minuteur.current = setTimeout(flush, DELAI_MS);
    },
    [flush]
  );

  // Quitter l'écran ne doit pas perdre une frappe en cours.
  useEffect(
    () => () => {
      if (minuteur.current) clearTimeout(minuteur.current);
      void flush();
    },
    [flush]
  );

  return { queue, flush, etat, echec, oublierEchec: () => setEchec(null) };
}
