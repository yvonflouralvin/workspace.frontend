"use client";

import { create } from "zustand";

import { arbreVide } from "@repo/site-widgets/arbre";
import type { Cible, Noeud } from "@repo/site-widgets/types";

/** L'état du builder.
 *
 *  L'historique est une pile d'ARBRES ENTIERS, et non une pile d'opérations
 *  inversibles. C'est possible parce que toutes les transformations d'arbre
 *  sont pures : chaque geste produit un nouvel arbre, et annuler devient une
 *  affectation. Une pile de commandes inversibles obligerait à écrire — et à
 *  tenir juste — un `defaire()` pour chacune des quinze opérations.
 *
 *  Le coût est en mémoire, borné : `PROFONDEUR_HISTORIQUE` arbres d'au plus
 *  512 Kio, la limite que le serveur impose de toute façon.
 */
const PROFONDEUR_HISTORIQUE = 50;

interface EtatBuilder {
  arbre: Noeud;
  /** La révision que le serveur nous a donnée. Renvoyée à chaque sauvegarde :
   *  c'est le verrou optimiste qui empêche deux onglets de se recouvrir. */
  revision: number;
  selection: string | null;
  cible: Cible;
  passe: Noeud[];
  futur: Noeud[];
  /** Des modifications non enregistrées existent. */
  sale: boolean;
  enregistrement: "repos" | "en_cours" | "erreur";
  messageErreur: string | null;

  charger: (arbre: Noeud, revision: number) => void;
  /** Applique une transformation et empile l'état précédent. */
  appliquer: (transformer: (arbre: Noeud) => Noeud) => void;
  /** Applique SANS empiler — pour les gestes continus (glissière, sélecteur
   *  de couleur) qui produiraient sinon une entrée d'historique par pixel. */
  appliquerSansHistorique: (transformer: (arbre: Noeud) => Noeud) => void;
  /** Ferme le geste continu en cours : le prochain `appliquer` repartira d'un
   *  point d'annulation propre. */
  jalonner: () => void;
  annuler: () => void;
  refaire: () => void;
  selectionner: (id: string | null) => void;
  viser: (cible: Cible) => void;
  marquerEnregistre: (revision: number) => void;
  marquerEnregistrement: (etat: EtatBuilder["enregistrement"], message?: string | null) => void;
}

export const useBuilder = create<EtatBuilder>((set, get) => ({
  arbre: arbreVide(),
  revision: 0,
  selection: null,
  cible: "bureau",
  passe: [],
  futur: [],
  sale: false,
  enregistrement: "repos",
  messageErreur: null,

  charger: (arbre, revision) =>
    set({
      arbre: arbre && arbre.type ? arbre : arbreVide(),
      revision,
      passe: [],
      futur: [],
      selection: null,
      sale: false,
      enregistrement: "repos",
      messageErreur: null,
    }),

  appliquer: (transformer) => {
    const { arbre, passe } = get();
    const suivant = transformer(arbre);
    if (suivant === arbre) return;
    set({
      arbre: suivant,
      passe: [...passe, arbre].slice(-PROFONDEUR_HISTORIQUE),
      // Refaire disparaît dès qu'on repart dans une autre direction : garder
      // un futur devenu incohérent avec le présent produit des retours en
      // avant qui rétablissent du contenu supprimé entre-temps.
      futur: [],
      sale: true,
    });
  },

  appliquerSansHistorique: (transformer) => {
    const { arbre } = get();
    const suivant = transformer(arbre);
    if (suivant === arbre) return;
    set({ arbre: suivant, sale: true });
  },

  jalonner: () => {
    const { arbre, passe } = get();
    const dernier = passe[passe.length - 1];
    if (dernier === arbre) return;
    set({ passe: [...passe, arbre].slice(-PROFONDEUR_HISTORIQUE), futur: [] });
  },

  annuler: () => {
    const { passe, futur, arbre } = get();
    if (!passe.length) return;
    const precedent = passe[passe.length - 1]!;
    set({
      arbre: precedent,
      passe: passe.slice(0, -1),
      futur: [arbre, ...futur].slice(0, PROFONDEUR_HISTORIQUE),
      sale: true,
    });
  },

  refaire: () => {
    const { passe, futur, arbre } = get();
    if (!futur.length) return;
    const suivant = futur[0]!;
    set({
      arbre: suivant,
      passe: [...passe, arbre].slice(-PROFONDEUR_HISTORIQUE),
      futur: futur.slice(1),
      sale: true,
    });
  },

  selectionner: (id) => set({ selection: id }),
  viser: (cible) => set({ cible }),
  marquerEnregistre: (revision) =>
    set({ revision, sale: false, enregistrement: "repos", messageErreur: null }),
  marquerEnregistrement: (etat, message = null) =>
    set({ enregistrement: etat, messageErreur: message }),
}));
