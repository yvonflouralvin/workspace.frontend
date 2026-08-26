import type { Appareil, Cible, Noeud } from "./types";

/** Manipulation d'un arbre de page. Fonctions PURES : elles renvoient un
 *  nouvel arbre et ne modifient jamais celui qu'on leur donne.
 *
 *  C'est ce qui rend l'annulation possible sans machinerie : la pile
 *  d'historique est une liste d'arbres, et revenir en arrière est une
 *  affectation. Muter sur place obligerait à savoir défaire chaque opération. */

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function nouvelId(): string {
  let sortie = "n_";
  const octets = new Uint8Array(6);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(octets);
  } else {
    for (let i = 0; i < octets.length; i += 1) octets[i] = Math.floor(Math.random() * 256);
  }
  for (const octet of octets) sortie += ALPHABET[octet % ALPHABET.length];
  return sortie;
}

export function arbreVide(): Noeud {
  return { id: "racine", type: "racine", props: {}, enfants: [] };
}

export function trouver(racine: Noeud | null | undefined, id: string): Noeud | null {
  if (!racine) return null;
  if (racine.id === id) return racine;
  for (const enfant of racine.enfants ?? []) {
    const trouve = trouver(enfant, id);
    if (trouve) return trouve;
  }
  return null;
}

export function parent(racine: Noeud | null | undefined, id: string): Noeud | null {
  if (!racine) return null;
  for (const enfant of racine.enfants ?? []) {
    if (enfant.id === id) return racine;
    const trouve = parent(enfant, id);
    if (trouve) return trouve;
  }
  return null;
}

/** Le chemin de la racine jusqu'au nœud, racine comprise. Sert au fil
 *  d'Ariane de l'inspecteur : sans lui, on ne sait pas remonter d'un widget à
 *  sa section. */
export function ascendance(racine: Noeud | null | undefined, id: string): Noeud[] {
  if (!racine) return [];
  if (racine.id === id) return [racine];
  for (const enfant of racine.enfants ?? []) {
    const dessous = ascendance(enfant, id);
    if (dessous.length) return [racine, ...dessous];
  }
  return [];
}

function remplacer(noeud: Noeud, id: string, transformer: (n: Noeud) => Noeud | null): Noeud | null {
  if (noeud.id === id) return transformer(noeud);
  if (!noeud.enfants) return noeud;
  const enfants: Noeud[] = [];
  let change = false;
  for (const enfant of noeud.enfants) {
    const resultat = remplacer(enfant, id, transformer);
    if (resultat !== enfant) change = true;
    if (resultat) enfants.push(resultat);
  }
  return change ? { ...noeud, enfants } : noeud;
}

export function modifierNoeud(racine: Noeud, id: string, patch: Partial<Noeud>): Noeud {
  return (remplacer(racine, id, (n) => ({ ...n, ...patch })) ?? racine) as Noeud;
}

export function modifierProps(
  racine: Noeud,
  id: string,
  patch: Record<string, unknown>,
): Noeud {
  return (
    (remplacer(racine, id, (n) => ({ ...n, props: { ...n.props, ...patch } })) as Noeud) ?? racine
  );
}

export function modifierPropsReactives(
  racine: Noeud,
  id: string,
  appareil: Appareil,
  patch: Record<string, unknown>,
): Noeud {
  return (
    (remplacer(racine, id, (n) => ({
      ...n,
      reactif: { ...(n.reactif ?? {}), [appareil]: { ...(n.reactif?.[appareil] ?? {}), ...patch } },
    })) as Noeud) ?? racine
  );
}

/** Retire la surcharge d'un réglage pour un appareil : la valeur redevient
 *  HÉRITÉE.
 *
 *  Écrire la valeur de base à la place n'est pas équivalent : la surcharge
 *  resterait, figée, et corriger le bureau plus tard ne toucherait plus cet
 *  appareil. « Revenir à la valeur héritée » doit vraiment effacer. */
export function retirerPropReactive(
  racine: Noeud,
  id: string,
  appareil: Appareil,
  cle: string,
): Noeud {
  return (
    (remplacer(racine, id, (n) => {
      const surcharges = { ...(n.reactif?.[appareil] ?? {}) };
      delete surcharges[cle];
      const reactif = { ...(n.reactif ?? {}) };
      // Un objet d'appareil vide est du bruit dans l'arbre publié : on le
      // retire aussi, sinon chaque réglage touché puis annulé laisserait une
      // trace dans le document.
      if (Object.keys(surcharges).length) reactif[appareil] = surcharges;
      else delete reactif[appareil];
      return { ...n, reactif: Object.keys(reactif).length ? reactif : undefined };
    }) as Noeud) ?? racine
  );
}

/** Cet appareil porte-t-il une valeur PROPRE pour ce réglage ? */
export function aUneSurcharge(noeud: Noeud, cle: string, appareil: Appareil): boolean {
  return noeud.reactif?.[appareil]?.[cle] !== undefined;
}

export function supprimer(racine: Noeud, id: string): Noeud {
  if (racine.id === id) return racine;
  return (remplacer(racine, id, () => null) as Noeud) ?? racine;
}

/** Insère `nouveau` dans `parentId`, à `index` (à la fin si omis). */
export function inserer(racine: Noeud, parentId: string, nouveau: Noeud, index?: number): Noeud {
  return (
    (remplacer(racine, parentId, (n) => {
      const enfants = [...(n.enfants ?? [])];
      enfants.splice(index ?? enfants.length, 0, nouveau);
      return { ...n, enfants };
    }) as Noeud) ?? racine
  );
}

export function insererApres(racine: Noeud, voisinId: string, nouveau: Noeud): Noeud {
  const pere = parent(racine, voisinId);
  if (!pere) return racine;
  const index = (pere.enfants ?? []).findIndex((e) => e.id === voisinId);
  return inserer(racine, pere.id, nouveau, index + 1);
}

/** Un nœud dupliqué reçoit de NOUVEAUX identifiants, à tous les niveaux.
 *  Recopier les identifiants ferait deux blocs que la sélection ne peut pas
 *  distinguer — et le serveur refuserait l'arbre. */
export function cloner(noeud: Noeud): Noeud {
  return {
    ...noeud,
    id: nouvelId(),
    props: JSON.parse(JSON.stringify(noeud.props ?? {})),
    reactif: noeud.reactif ? JSON.parse(JSON.stringify(noeud.reactif)) : undefined,
    enfants: noeud.enfants?.map(cloner),
  };
}

export function dupliquer(racine: Noeud, id: string): Noeud {
  const source = trouver(racine, id);
  if (!source || source.id === racine.id) return racine;
  return insererApres(racine, id, cloner(source));
}

/** Déplace un nœud d'un cran dans sa fratrie. */
export function decaler(racine: Noeud, id: string, sens: -1 | 1): Noeud {
  const pere = parent(racine, id);
  if (!pere) return racine;
  const enfants = [...(pere.enfants ?? [])];
  const index = enfants.findIndex((e) => e.id === id);
  const cible = index + sens;
  if (index < 0 || cible < 0 || cible >= enfants.length) return racine;
  const [retire] = enfants.splice(index, 1);
  enfants.splice(cible, 0, retire!);
  return (remplacer(racine, pere.id, (n) => ({ ...n, enfants })) as Noeud) ?? racine;
}

/** Déplace un nœud vers un autre parent. Refuse de déplacer un nœud dans sa
 *  propre descendance — sinon la branche déplacée disparaît de l'arbre en
 *  emportant le point d'arrivée. */
export function deplacer(
  racine: Noeud,
  id: string,
  parentCibleId: string,
  index?: number,
): Noeud {
  const source = trouver(racine, id);
  if (!source || id === racine.id) return racine;
  if (trouver(source, parentCibleId)) return racine;

  const pere = parent(racine, id);
  const memeParent = pere?.id === parentCibleId;
  const positionActuelle = (pere?.enfants ?? []).findIndex((e) => e.id === id);

  let cible = index;
  if (memeParent && cible !== undefined && positionActuelle >= 0 && positionActuelle < cible) {
    cible -= 1;
  }
  return inserer(supprimer(racine, id), parentCibleId, source, cible);
}

export function compter(racine: Noeud | null | undefined): number {
  if (!racine) return 0;
  return 1 + (racine.enfants ?? []).reduce((total, e) => total + compter(e), 0);
}

/** La valeur d'une prop pour un appareil donné.
 *
 *  Les surcharges se cumulent du plus large au plus étroit : le mobile hérite
 *  de la tablette, qui hérite du bureau. Sans cette cascade, régler une marge
 *  sur tablette obligerait à la régler à nouveau sur mobile. */
export function valeurReactive(noeud: Noeud, cle: string, cible: Cible): unknown {
  const base = noeud.props?.[cle];
  if (cible === "bureau") return base;
  const tablette = noeud.reactif?.tablette?.[cle];
  if (cible === "tablette") return tablette !== undefined ? tablette : base;
  const mobile = noeud.reactif?.mobile?.[cle];
  if (mobile !== undefined) return mobile;
  return tablette !== undefined ? tablette : base;
}

export function propsPourCible(noeud: Noeud, cible: Cible): Record<string, unknown> {
  if (cible === "bureau") return noeud.props ?? {};
  return {
    ...(noeud.props ?? {}),
    ...(noeud.reactif?.tablette ?? {}),
    ...(cible === "mobile" ? (noeud.reactif?.mobile ?? {}) : {}),
  };
}

/** Un déplacement est-il permis ?
 *
 *  La grammaire du backend est stricte — `racine > section > colonne > widget` —
 *  et un arbre refusé ne se découvre qu'à l'enregistrement, plusieurs gestes
 *  plus tard. La même règle vit donc ici, pour que l'éditeur refuse le dépôt
 *  AVANT de le faire, et pas après.
 */
export function depotPermis(racine: Noeud, id: string, parentCibleId: string): boolean {
  const source = trouver(racine, id);
  const cible = trouver(racine, parentCibleId);
  if (!source || !cible || source.id === cible.id) return false;
  // Un nœud ne se range pas sous lui-même : le sous-arbre serait détaché.
  if (trouver(source, parentCibleId)) return false;

  if (source.type === "section") return cible.type === "racine";
  if (source.type === "colonne") return cible.type === "section";
  return cible.type === "colonne";
}
