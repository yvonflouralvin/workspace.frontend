"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Révèle son contenu quand il entre dans l'écran.
 *
 *  POURQUOI UN OBSERVATEUR ET NON UN ÉCOUTEUR DE DÉFILEMENT : un écouteur se
 *  déclenche à chaque pixel parcouru et fait recalculer la position de tous
 *  les éléments observés, sur le fil principal. `IntersectionObserver` laisse
 *  ce travail au navigateur, hors du fil, et ne nous rappelle qu'au
 *  franchissement.
 *
 *  LE CONTENU EST RENDU DANS LE HTML, toujours. On ne monte rien à
 *  l'apparition : seules l'opacité et la position changent. Un contenu
 *  conditionné à l'affichage serait absent du HTML servi — donc absent pour
 *  un moteur de recherche, et absent pour qui n'exécute pas le script.
 *
 *  ET IL SE RÉVÈLE AUSSI SANS SCRIPT : la classe de départ n'est posée qu'au
 *  premier rendu du composant client. Si le script ne s'exécute jamais, le
 *  HTML servi n'a pas `data-cache` et le contenu est simplement visible.
 */
export function Reveal({
  children,
  delai = 0,
  className = "",
}: {
  children: ReactNode;
  /** Décalage en millisecondes, pour faire entrer une rangée en cascade. */
  delai?: number;
  className?: string;
}) {
  const cible = useRef<HTMLDivElement | null>(null);
  const [vu, setVu] = useState(false);
  // Posé après le montage seulement : voir « ET IL SE RÉVÈLE AUSSI SANS
  // SCRIPT » ci-dessus.
  const [arme, setArme] = useState(false);

  useEffect(() => {
    setArme(true);
    const noeud = cible.current;
    if (!noeud) return;

    // Déjà visible au chargement (le haut de page) : on ne fait pas attendre
    // un franchissement qui n'arrivera jamais.
    if (typeof IntersectionObserver === "undefined") {
      setVu(true);
      return;
    }

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (entree.isIntersecting) {
            setVu(true);
            // UNE SEULE FOIS. Un contenu qui se re-cache en remontant donne
            // l'impression d'une page qui clignote.
            observateur.disconnect();
          }
        }
      },
      // Le déclenchement un peu avant le bord : l'animation doit être finie
      // quand l'œil arrive, pas commencer sous son nez.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    observateur.observe(noeud);
    return () => observateur.disconnect();
  }, []);

  return (
    <div
      ref={cible}
      data-cache={arme && !vu ? "oui" : undefined}
      data-revele={vu ? "oui" : undefined}
      style={delai ? { transitionDelay: `${delai}ms` } : undefined}
      className={className}
    >
      {children}
    </div>
  );
}
