"use client";

import { useCallback, useEffect, useRef } from "react";

/** Une sauvegarde différée : on pousse la dernière valeur, elle part après `delai` ms de calme.
 *
 *  Un éditeur riche émet à chaque frappe ; une requête par touche saturerait le serveur et ferait
 *  courir les réponses entre elles. Ce qui reste en attente PART À LA FERMETURE de l'écran — sans
 *  cela, quitter la page une seconde après avoir écrit perdrait le dernier paragraphe. */
export function useDiffere<T>(action: (valeur: T) => unknown, delai = 800) {
  const minuteur = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const attente = useRef<{ valeur: T } | null>(null);
  const derniere = useRef(action);
  derniere.current = action;

  const vider = useCallback(() => {
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = undefined;
    if (attente.current) {
      const { valeur } = attente.current;
      attente.current = null;
      void derniere.current(valeur);
    }
  }, []);

  const pousser = useCallback(
    (valeur: T) => {
      attente.current = { valeur };
      if (minuteur.current) clearTimeout(minuteur.current);
      minuteur.current = setTimeout(vider, delai);
    },
    [vider, delai],
  );

  useEffect(() => vider, [vider]);

  return pousser;
}
