/** LA PLACE QU'IL FAUT À GAUCHE POUR LES GRADUATIONS DE L'AXE Y.
 *
 *  Les primitives portaient une marge gauche CONSTANTE (40 px pour
 *  l'histogramme, 36 pour la courbe). À 9 px de corps, ça tient « 1 250 »
 *  et ça ne tient pas « 52 241 107,5 » : l'étiquette, ancrée à droite,
 *  débordait du `viewBox` et se faisait rogner PAR LA GAUCHE.
 *
 *  Le défaut est particulièrement traître parce qu'il ne casse rien : le
 *  graphique s'affiche, les barres sont justes, et seules les graduations
 *  mentent. Relevé sur le tableau de bord de la facturation, où
 *  « 69 654 810 » s'affichait « 9 654 810 » — un facteur dix, en silence.
 *
 *  Une largeur de caractère suffit comme approximation : les chiffres d'une
 *  police proportionnelle sont tabulaires, donc tous de même largeur, et
 *  l'espace fine et la virgule sont plus étroits. On majore un peu, et on
 *  borne pour qu'un axe en centimes ne mange jamais la moitié du cadre.
 */
export function margeAxeY(etiquettes: string[], minimum = 28, maximum = 104): number {
  const plusLongue = etiquettes.reduce((n, t) => Math.max(n, t.length), 0);
  return Math.min(maximum, Math.max(minimum, Math.ceil(plusLongue * 5.2) + 10));
}
