/** Les règles de partage d'une fiche, séparées de l'écran qui les montre.
 *
 *  Elles vivent dans un module sans JSX pour être testables sans DOM : ce
 *  qu'elles décident, c'est qui voit les données d'un client. Une erreur ici
 *  ouvre une fiche à quelqu'un, ou la ferme à qui en a besoin, et aucune des
 *  deux ne se voit à l'écran.
 */

export interface PartageGrant {
  user_id: number | null;
  groupe_id: number | null;
  sections: string[];
}

export interface PartageSection {
  key: string;
  label: string;
}

export interface PartageOption {
  id: number;
  label: string;
}

/** Une personne et un groupe peuvent porter le même id numérique côté auth —
 *  la clé d'une ligne doit donc dire son type, pas seulement son id. */
export function cleGrant(g: PartageGrant): string {
  return g.user_id !== null ? `u:${g.user_id}` : `g:${g.groupe_id}`;
}

/** Remplace la liste des PERSONNES autorisées sans toucher aux groupes, et en
 *  conservant les sections déjà réglées pour celles qui restent. */
export function majPersonnes(grants: PartageGrant[], ids: number[]): PartageGrant[] {
  const retenus = new Set(ids);
  const gardes = grants.filter(
    (g) => g.groupe_id !== null || retenus.has(g.user_id as number),
  );
  const ajoutes = ids
    .filter((uid) => !grants.some((g) => g.user_id === uid))
    .map((uid) => ({ user_id: uid, groupe_id: null, sections: [] as string[] }));
  return [...gardes, ...ajoutes];
}

/** Le symétrique pour les GROUPES, sans toucher aux personnes. */
export function majGroupes(grants: PartageGrant[], ids: number[]): PartageGrant[] {
  const retenus = new Set(ids);
  const gardes = grants.filter(
    (g) => g.user_id !== null || retenus.has(g.groupe_id as number),
  );
  const ajoutes = ids
    .filter((gid) => !grants.some((g) => g.groupe_id === gid))
    .map((gid) => ({ user_id: null, groupe_id: gid, sections: [] as string[] }));
  return [...gardes, ...ajoutes];
}

export function retirerGrant(grants: PartageGrant[], g: PartageGrant): PartageGrant[] {
  const k = cleGrant(g);
  return grants.filter((x) => cleGrant(x) !== k);
}

/** Coche ou décoche UNE section d'UNE ligne.
 *
 *  Une liste vide vaut accès complet — y compris aux sections qui n'existaient
 *  pas quand on l'a posée. Décocher depuis cet état part donc de la liste
 *  ENTIÈRE : sans ça, retirer une section n'en laisserait qu'une seule, et la
 *  personne perdrait tout le reste sans que rien ne le dise.
 */
export function basculerSection(
  grants: PartageGrant[],
  g: PartageGrant,
  sectionKey: string,
  toutesLesSections: string[],
): PartageGrant[] {
  const k = cleGrant(g);
  return grants.map((x) => {
    if (cleGrant(x) !== k) return x;
    const actuelles = x.sections.length === 0 ? toutesLesSections : x.sections;
    return {
      ...x,
      sections: actuelles.includes(sectionKey)
        ? actuelles.filter((s) => s !== sectionKey)
        : [...actuelles, sectionKey],
    };
  });
}

export function libelleGrant(
  g: PartageGrant,
  personnes: PartageOption[],
  groupes: PartageOption[],
): string {
  if (g.user_id !== null) {
    return personnes.find((p) => p.id === g.user_id)?.label ?? `Utilisateur #${g.user_id}`;
  }
  return groupes.find((gp) => gp.id === g.groupe_id)?.label ?? `Groupe #${g.groupe_id}`;
}
