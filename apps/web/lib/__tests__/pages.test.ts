/** LES PROPRIÉTÉS DE MISE EN PAGE QUE RIEN D'AUTRE NE VÉRIFIE.
 *
 *  Un défaut de design ne fait échouer ni `tsc` ni `next build` : la page se
 *  construit, répond 200, et elle est simplement fausse. Ces trois propriétés
 *  sont celles dont la rupture ne se verrait PAS en relisant un diff.
 *
 *  1. TOUTE PAGE S'OUVRE SUR LE REGISTRE SOMBRE. La barre du haut flotte sur
 *     le haut de page : ses liens y sont clairs, et ne prennent leur couleur
 *     foncée qu'à partir de huit pixels de défilement. Une page qui
 *     commencerait par un fond clair aurait donc une navigation INVISIBLE
 *     jusqu'au premier défilement.
 *
 *  2. CHAQUE PAGE A SON PROPRE TITRE, sauf l'accueil qui prend celui du
 *     gabarit. Quinze fiches produit partageant le titre du site, c'est ce
 *     qu'on vient de corriger ailleurs — et ça ne se voit que dans un
 *     résultat de recherche.
 *
 *  3. LES ANIMATIONS SE COUPENT au réglage système. Une règle oubliée ici
 *     donne la nausée à quelqu'un, et personne ne nous le dira.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APP = join(__dirname, "..", "..", "app");
const CSS = readFileSync(join(APP, "globals.css"), "utf8");

/** Les fichiers `page.tsx` de l'app, chemin relatif à `app/`. */
function pages(dossier = APP, prefixe = ""): string[] {
  const trouvees: string[] = [];
  for (const entree of readdirSync(dossier)) {
    const complet = join(dossier, entree);
    if (statSync(complet).isDirectory()) {
      trouvees.push(...pages(complet, `${prefixe}${entree}/`));
    } else if (entree === "page.tsx") {
      trouvees.push(`${prefixe}${entree}`);
    }
  }
  return trouvees.sort();
}

const TOUTES = pages();

describe("les pages du site", () => {
  it("sont bien les six attendues", () => {
    expect(TOUTES).toEqual([
      "a-propos/page.tsx",
      "contact/page.tsx",
      "page.tsx",
      "produits/[slug]/page.tsx",
      "produits/page.tsx",
      "tarifs/page.tsx",
    ]);
  });

  // Propriété 1 : le registre sombre en haut de page. Une page l'obtient soit
  // par `HeroPage`, soit par sa propre section `nuit` — l'accueil et la fiche
  // produit ont la leur, parce que leur haut de page ne ressemble pas aux
  // autres.
  it("s'ouvrent toutes sur le registre sombre", () => {
    const clairesEnHaut = TOUTES.filter((p) => {
      const source = readFileSync(join(APP, p), "utf8");
      return !source.includes("HeroPage") && !source.includes('className="nuit');
    });
    expect(clairesEnHaut).toEqual([]);
  });

  // Propriété 2 : un titre par page.
  it("ont chacune leur titre, sauf l'accueil qui prend celui du gabarit", () => {
    const sansTitre = TOUTES.filter((p) => p !== "page.tsx").filter((p) => {
      const source = readFileSync(join(APP, p), "utf8");
      return !source.includes("export const metadata") && !source.includes("generateMetadata");
    });
    expect(sansTitre).toEqual([]);
  });
});

describe("le décor du site", () => {
  // Propriété 3 : chaque animation déclarée doit être coupée par le réglage
  // système. Le test lit les classes d'animation dans la feuille et vérifie
  // qu'elles figurent toutes dans le bloc `prefers-reduced-motion`.
  it("coupe toutes ses animations au réglage « moins d'animations »", () => {
    const declarees = [...CSS.matchAll(/^\.(anim-[a-z-]+)\s*\{/gm)].map((m) => m[1]);
    expect(declarees.length).toBeGreaterThan(4);

    const bloc = CSS.slice(CSS.indexOf("@media (prefers-reduced-motion: reduce)"));
    const oubliees = declarees.filter((c) => !bloc.includes(`.${c}`));
    expect(oubliees).toEqual([]);
  });

  // UN ÉLÉMENT N'A QU'UN `::before` ET QU'UN `::after`. Les couches
  // décoratives du registre sombre — grille, halos, grain — s'appliquent
  // toutes au MÊME nœud. Deux d'entre elles déclarées sur le même
  // pseudo-élément entrent en concurrence : même spécificité, la dernière
  // gagne, et la première disparaît sans un mot. C'est arrivé — le grain
  // écrasait la grille sur quatre des cinq sections sombres, et rien dans
  // le diff ne le montrait.
  it("ne déclare qu'une seule couche décorative par pseudo-élément", () => {
    const avant = [...CSS.matchAll(/^\.([a-z-]+)::before\s*\{/gm)].map((m) => m[1]);
    const apres = [...CSS.matchAll(/^\.([a-z-]+)::after\s*\{/gm)].map((m) => m[1]);
    expect(avant).toEqual(["nuit-grille"]);
    expect(apres).toEqual(["nuit-halo"]);
  });

  // Un contenu révélé au défilement part invisible. Si l'animation est
  // coupée sans que la visibilité soit rendue, il reste caché POUR DE BON —
  // la page entière deviendrait blanche pour ces visiteurs.
  it("rend visibles les contenus révélés au défilement quand l'animation est coupée", () => {
    const bloc = CSS.slice(CSS.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(bloc).toContain('[data-cache="oui"]');
    expect(bloc).toMatch(/opacity:\s*1\s*!important/);
  });
});
