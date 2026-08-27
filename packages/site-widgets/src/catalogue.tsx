import type { DefinitionWidget, Noeud } from "./types";
import { nouvelId } from "./arbre";
import { BOUTON, LISTE_ICONES, TEXTE_RICHE, TITRE } from "./widgets/base";
import { ABONNEMENT } from "./widgets/formulaire";
import { IMAGE } from "./widgets/media";
import { COLONNE, ESPACEUR, SECTION, SEPARATEUR } from "./widgets/miseEnPage";

/** Le catalogue vit côté FRONTEND, pas au backend.
 *
 *  C'est ce qui permet au même composant `Rendu` de servir le canevas de
 *  l'éditeur et la page publique. Un catalogue au backend obligerait à écrire
 *  le rendu deux fois, et « ce que je vois est ce qui sera publié » deviendrait
 *  une promesse à tenir à la main, widget par widget.
 *
 *  Le prix : le backend ne valide pas le contenu des `props`. Il valide la
 *  grammaire, la taille, la profondeur et l'unicité des identifiants — rien
 *  d'autre. C'est acceptable parce que le seul écrivain est notre propre
 *  éditeur, et parce que la sécurité repose sur l'échappement au rendu et non
 *  sur la validation des props. */
export const CATALOGUE: Record<string, DefinitionWidget> = {
  section: SECTION,
  colonne: COLONNE,
  titre: TITRE,
  texte_riche: TEXTE_RICHE,
  image: IMAGE,
  bouton: BOUTON,
  liste_icones: LISTE_ICONES,
  abonnement: ABONNEMENT,
  espaceur: ESPACEUR,
  separateur: SEPARATEUR,
};

/** Ce que la palette propose. Section et colonne n'y sont pas : on ajoute une
 *  section par le bouton dédié du canevas, et une colonne en réglant la
 *  disposition de sa section. */
export const WIDGETS_PALETTE: DefinitionWidget[] = [
  TITRE,
  TEXTE_RICHE,
  IMAGE,
  BOUTON,
  LISTE_ICONES,
  ABONNEMENT,
  ESPACEUR,
  SEPARATEUR,
];

export const CATEGORIES: { cle: DefinitionWidget["categorie"]; libelle: string }[] = [
  { cle: "base", libelle: "Contenu" },
  { cle: "media", libelle: "Média" },
  { cle: "mise_en_page", libelle: "Mise en page" },
  { cle: "interaction", libelle: "Interaction" },
];

export function definition(type: string): DefinitionWidget | undefined {
  return CATALOGUE[type];
}

export function creerNoeud(type: string): Noeud {
  const def = CATALOGUE[type];
  const noeud: Noeud = {
    id: nouvelId(),
    type,
    props: JSON.parse(JSON.stringify(def?.defauts ?? {})),
  };
  if (def?.accepteEnfants) noeud.enfants = [];
  return noeud;
}

/** Une section neuve arrive avec ses colonnes : une section vide est refusée
 *  par le backend, et surtout elle ne sert à rien. */
export function creerSection(colonnes = 1): Noeud {
  const largeur = Math.round(100 / Math.max(1, colonnes));
  const section = creerNoeud("section");
  section.enfants = Array.from({ length: colonnes }, () => {
    const colonne = creerNoeud("colonne");
    colonne.props = { ...colonne.props, largeur: { valeur: largeur, unite: "%" } };
    // Sur mobile, une colonne prend toute la largeur : empiler est le seul
    // comportement lisible sous 640 px, et c'est ce qu'on attend sans avoir à
    // le demander.
    colonne.reactif = { mobile: { largeur: { valeur: 100, unite: "%" } } };
    return colonne;
  });
  return section;
}

export const DISPOSITIONS: { cle: string; libelle: string; parts: number[] }[] = [
  { cle: "1", libelle: "Une colonne", parts: [100] },
  { cle: "1-1", libelle: "Deux colonnes", parts: [50, 50] },
  { cle: "1-1-1", libelle: "Trois colonnes", parts: [33, 33, 34] },
  { cle: "1-2", libelle: "Un tiers / deux tiers", parts: [33, 67] },
  { cle: "2-1", libelle: "Deux tiers / un tiers", parts: [67, 33] },
  { cle: "1-1-1-1", libelle: "Quatre colonnes", parts: [25, 25, 25, 25] },
];

export function creerSectionDisposition(cle: string): Noeud {
  const disposition = DISPOSITIONS.find((d) => d.cle === cle) ?? DISPOSITIONS[0]!;
  const section = creerNoeud("section");
  section.enfants = disposition.parts.map((part) => {
    const colonne = creerNoeud("colonne");
    colonne.props = { ...colonne.props, largeur: { valeur: part, unite: "%" } };
    colonne.reactif = { mobile: { largeur: { valeur: 100, unite: "%" } } };
    return colonne;
  });
  return section;
}
