import { creerNoeud, creerSectionDisposition } from "./catalogue";
import type { Lien, Noeud } from "./types";

/** Le langage commun des modèles de section et des thèmes de site : fabriquer
 *  un arbre de widgets ordinaires à la demande, sans jamais garder de lien
 *  vers ce qui l'a produit. Extrait de `modeles.ts` pour que `themes.ts`
 *  (des PAGES entières, pas des sections isolées) parle le même langage sans
 *  dupliquer ces petites fonctions.
 */

export function texteRiche(contenu: string) {
  // Le format de BlockNote, réduit à ce qu'un modèle a besoin de produire.
  return [{ type: "paragraph", content: [{ type: "text", text: contenu }] }];
}

export function poser(noeud: Noeud, props: Record<string, unknown>): Noeud {
  return { ...noeud, props: { ...noeud.props, ...props } };
}

export function titre(contenu: string, niveau = "h2", alignement = "left", extra: Record<string, unknown> = {}) {
  return poser(creerNoeud("titre"), { texte: contenu, niveau, alignement, ...extra });
}

export function paragraphe(contenu: string, alignement = "left", extra: Record<string, unknown> = {}) {
  return poser(creerNoeud("texte_riche"), { contenu: texteRiche(contenu), alignement, ...extra });
}

export function bouton(libelle: string, alignement = "left", extra: Record<string, unknown> = {}) {
  return poser(creerNoeud("bouton"), { libelle, alignement, ...extra });
}

/** Même bouton, avec un lien — signature séparée plutôt qu'un paramètre `lien`
 *  entre `libelle` et `alignement` : la moitié des appels de `modeles.ts`
 *  passent déjà `(libelle, alignement)` sans lien, et décaler l'ordre des
 *  paramètres les aurait tous cassés en silence (l'alignement serait devenu
 *  un lien, sans erreur de type). */
export function boutonLien(libelle: string, lien: Lien, alignement = "left", extra: Record<string, unknown> = {}) {
  return poser(creerNoeud("bouton"), { libelle, lien, alignement, ...extra });
}

export function image(extra: Record<string, unknown> = {}) {
  return poser(creerNoeud("image"), extra);
}

export function espaceur(hauteur: number) {
  return poser(creerNoeud("espaceur"), { hauteur });
}

export interface ElementIcone {
  icone: string;
  texte: string;
}

export function listeIcones(
  elements: ElementIcone[],
  disposition: "verticale" | "horizontale" = "verticale",
  extra: Record<string, unknown> = {},
) {
  return poser(creerNoeud("liste_icones"), { elements, disposition, ...extra });
}

export interface ElementMenu {
  libelle: string;
  lien?: Lien;
}

export function menu(elements: ElementMenu[], alignement: "left" | "center" | "right" = "right", extra: Record<string, unknown> = {}) {
  return poser(creerNoeud("menu"), { elements, alignement, espacement: 28, ...extra });
}

/** Remplit les colonnes d'une section, dans l'ordre. */
export function garnir(section: Noeud, contenus: Noeud[][]): Noeud {
  return {
    ...section,
    enfants: (section.enfants ?? []).map((colonne, i) => ({
      ...colonne,
      enfants: contenus[i] ?? [],
    })),
  };
}

/** Une section 1 colonne, avec ses marges par défaut — le socle de la moitié
 *  des modèles et des thèmes. */
export function bande(espacementVertical = 64, props: Record<string, unknown> = {}) {
  return poser(creerSectionDisposition("1"), {
    espacement: { haut: espacementVertical, droite: 24, bas: espacementVertical, gauche: 24 },
    ...props,
  });
}

/** Une section à colonnes ÉGALES, choisies parmi les dispositions du
 *  catalogue (`1-1`, `1-1-1`…) — la forme la plus courante. */
export function colonnes(cle: string, espacementVertical = 56, props: Record<string, unknown> = {}) {
  return poser(creerSectionDisposition(cle), {
    espacement: { haut: espacementVertical, droite: 24, bas: espacementVertical, gauche: 24 },
    ...props,
  });
}

interface DefColonne {
  largeur: number;
  enfants: Noeud[];
  props?: Record<string, unknown>;
}

/** Une section à largeurs LIBRES — pour les grilles qu'aucune disposition du
 *  catalogue ne couvre (ex. la dernière ligne d'une grille de services dont
 *  le compte ne divise pas 3). Construit ses propres colonnes plutôt que de
 *  passer par `creerSectionDisposition`, dont le catalogue est fixe. */
export function sectionLibre(colonnesDefs: DefColonne[], props: Record<string, unknown> = {}): Noeud {
  const cols = colonnesDefs.map((cd) => {
    const colonne = poser(creerNoeud("colonne"), {
      largeur: { valeur: cd.largeur, unite: "%" },
      espacement: { haut: 0, droite: 12, bas: 0, gauche: 12 },
      alignement_vertical: "haut",
      ...(cd.props ?? {}),
    });
    colonne.reactif = { mobile: { largeur: { valeur: 100, unite: "%" } } };
    colonne.enfants = cd.enfants;
    return colonne;
  });
  return poser(
    { ...creerNoeud("section"), enfants: cols },
    { fond: "", largeur: "contenue", espacement: { haut: 64, droite: 24, bas: 64, gauche: 24 }, alignement_vertical: "haut", ...props },
  );
}

export function racine(sections: Noeud[]): Noeud {
  return { id: "racine", type: "racine", props: {}, enfants: sections };
}
