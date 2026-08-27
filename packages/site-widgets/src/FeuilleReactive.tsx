import { CATALOGUE } from "./catalogue";
import type { Appareil, ContexteRendu, Noeud } from "./types";

/** Traduit les surcharges par appareil en VRAIES media queries.
 *
 *  Le canevas de l'éditeur simule un appareil et peut donc se contenter de
 *  recalculer les props ; le visiteur, lui, redimensionne sa fenêtre. Un état
 *  React ne répondrait pas — et côté serveur, on ne connaît pas la largeur de
 *  l'écran. La seule réponse correcte est du CSS.
 *
 *  On n'émet que les déclarations qui DIFFÈRENT de la version bureau : sinon
 *  chaque nœud réactif recopierait tout son style deux fois, et la feuille
 *  d'une page chargée pèserait plus que son contenu. */

const POINTS_DE_RUPTURE: Record<Appareil, number> = {
  tablette: 1024,
  mobile: 640,
};

function enKebab(cle: string): string {
  return cle.replace(/[A-Z]/g, (lettre) => `-${lettre.toLowerCase()}`);
}

function enValeurCss(cle: string, valeur: unknown): string | null {
  if (valeur === undefined || valeur === null || valeur === "") return null;
  if (typeof valeur === "number") {
    // Les propriétés sans unité, telles que React les traite déjà.
    const sansUnite = new Set([
      "flex",
      "flexGrow",
      "flexShrink",
      "fontWeight",
      "lineHeight",
      "opacity",
      "order",
      "zIndex",
    ]);
    return sansUnite.has(cle) ? String(valeur) : `${valeur}px`;
  }
  return String(valeur);
}

/** Une valeur CSS pouvant contenir des guillemets ou une accolade sortirait
 *  du bloc de règles. On ne sort pas de la déclaration. */
function sain(valeur: string): boolean {
  return !/[{}<>;]/.test(valeur);
}

function declarations(base: Record<string, unknown>, variante: Record<string, unknown>): string {
  const sortie: string[] = [];
  for (const [cle, valeur] of Object.entries(variante)) {
    if (base[cle] === valeur) continue;
    const rendue = enValeurCss(cle, valeur);
    if (rendue === null || !sain(rendue)) continue;
    sortie.push(`${enKebab(cle)}:${rendue}`);
  }
  return sortie.join(";");
}

function collecter(
  noeud: Noeud | null | undefined,
  contexte: ContexteRendu,
  regles: Record<Appareil, string[]>,
): void {
  if (!noeud) return;
  const def = CATALOGUE[noeud.type];
  if (def?.style && noeud.reactif) {
    const base = def.style(noeud.props ?? {}, contexte) as Record<string, unknown>;
    let cumul = { ...(noeud.props ?? {}) };
    // Cascade : la tablette hérite du bureau, le mobile de la tablette. Sans
    // ça, régler une marge sur tablette obligerait à la régler encore sur
    // mobile.
    for (const appareil of ["tablette", "mobile"] as Appareil[]) {
      const surcharge = noeud.reactif[appareil];
      if (!surcharge) continue;
      cumul = { ...cumul, ...surcharge };
      const corps = declarations(base, def.style(cumul, contexte) as Record<string, unknown>);
      if (corps) regles[appareil].push(`[data-n="${noeud.id}"]{${corps}}`);
    }
  }
  for (const enfant of noeud.enfants ?? []) collecter(enfant, contexte, regles);
}

export function feuilleReactive(arbre: Noeud | null | undefined, contexte: ContexteRendu): string {
  const regles: Record<Appareil, string[]> = { tablette: [], mobile: [] };
  collecter(arbre, contexte, regles);
  const morceaux: string[] = [];
  for (const appareil of ["tablette", "mobile"] as Appareil[]) {
    if (!regles[appareil].length) continue;
    morceaux.push(
      `@media (max-width:${POINTS_DE_RUPTURE[appareil]}px){${regles[appareil].join("")}}`,
    );
  }
  return morceaux.join("");
}

/** Les identifiants de nœuds sont produits par `nouvelId()` — alphanumériques
 *  et underscore — et les valeurs sont filtrées par `sain()`. Le contenu de
 *  cette balise ne provient donc jamais d'une saisie libre. */
export function FeuilleReactive({
  arbre,
  contexte,
}: {
  arbre: Noeud | null | undefined;
  contexte: ContexteRendu;
}) {
  const css = feuilleReactive(arbre, contexte);
  if (!css) return null;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
