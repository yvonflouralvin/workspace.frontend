/** Nommer une unité sans ambiguïté.
 *
 *  Un établissement a autant de « Première » que de filières : première en
 *  Droit, première en Sciences. Le libellé seul est donc un homonyme, et un
 *  écran qui n'affiche que lui fait inscrire dans la mauvaise classe sans que
 *  rien ne le signale.
 *
 *  Le serveur renvoie l'ascendance en clair (`chemin_libelles`), de la racine à
 *  l'unité. Les deux formes ci-dessous sont les deux lectures qu'on en fait —
 *  et c'est pour cela que l'API renvoie une liste plutôt qu'une chaîne toute
 *  faite.
 */

/** « Première — Math-Info — Sciences » : l'unité d'abord, ses parents ensuite.
 *
 *  Pour les listes et les listes déroulantes, où l'œil cherche d'abord la
 *  classe et ne se sert des parents que pour départager. */
export function libelleAvecParents(chemin: string[] | undefined): string {
  return [...(chemin ?? [])].reverse().join(" — ");
}

/** « Sciences › Math-Info › Première » : le fil d'Ariane, racine d'abord.
 *
 *  Pour un écran de détail, où l'on situe la classe dans l'établissement. */
export function filDAriane(chemin: string[] | undefined): string[] {
  return chemin ?? [];
}
