export const ACCES = "business_firm_missions.access";
export const PORTAIL = "business_firm_missions.portail";

/** Un contact client : le portail, et RIEN d'autre. Quelqu'un qui a aussi l'accès à l'application
 *  est de l'équipe, quoi qu'il porte par ailleurs. */
export function estClientSeul(permissions: string[]): boolean {
  return permissions.includes(PORTAIL) && !permissions.includes(ACCES);
}

/** Les droits du service `tiers`. L'écran Clients écrit chez lui : il n'y a pas de registre
 *  client dans ce module, et donc aucune permission maison pour le garder. Les nommer ici
 *  évite qu'une chaîne traîne dans un composant. */
export const TIERS_VOIR = "tiers.tiers.view";
export const TIERS_CREER = "tiers.tiers.create";
export const TIERS_MODIFIER = "tiers.tiers.manage";
