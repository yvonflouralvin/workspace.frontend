export const ACCES = "business_firm_missions.access";
export const PORTAIL = "business_firm_missions.portail";

/** Un contact client : le portail, et RIEN d'autre. Quelqu'un qui a aussi l'accès à l'application
 *  est de l'équipe, quoi qu'il porte par ailleurs. */
export function estClientSeul(permissions: string[]): boolean {
  return permissions.includes(PORTAIL) && !permissions.includes(ACCES);
}
