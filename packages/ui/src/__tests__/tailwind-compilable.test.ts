/** Une app qui importe Tailwind doit pouvoir le COMPILER.
 *
 *  POURQUOI CE TEST EXISTE. Le site vitrine (`apps/web`) a été servi en
 *  production du 20 octobre au 23 novembre 2026 SANS AUCUN STYLE. Sa
 *  `globals.css` était correcte — `@import "tailwindcss"`, les tokens, les
 *  `@source` — et il lui manquait le `postcss.config.mjs` qui fait tourner le
 *  compilateur. Sans lui, cet import ne produit RIEN : la feuille livrée
 *  pesait 10,8 ko et ne contenait que les polices. 58,2 ko après correction.
 *
 *  Et rien ne le signalait. `next build` réussit, `tsc` est muet — il n'y a
 *  pas de type qui relie une classe utilitaire à son compilateur —, aucun test
 *  ne regardait la feuille produite, et les dix-neuf autres apps étaient
 *  correctes, donc la configuration n'avait l'air de manquer nulle part.
 *
 *  Le test vit dans `@repo/ui` parce que c'est ce paquet qui pose les classes
 *  utilitaires dans ses composants : elles ne valent rien sans le compilateur,
 *  et une app qui les affiche sans lui rend du HTML nu. Même doctrine que
 *  `packages/auth/src/__tests__/deconnexion.test.ts`, qui garde une couture
 *  inter-apps que TypeScript ne voit pas.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APPS = join(__dirname, "..", "..", "..", "..", "apps");

/** Les apps dont la feuille racine importe Tailwind. */
function appsQuiImportentTailwind(): string[] {
  return readdirSync(APPS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((nom) => {
      const css = join(APPS, nom, "app", "globals.css");
      return existsSync(css) && readFileSync(css, "utf8").includes('@import "tailwindcss"');
    })
    .sort();
}

function configPostcss(nom: string): string | null {
  for (const f of ["postcss.config.mjs", "postcss.config.js", "postcss.config.cjs"]) {
    const chemin = join(APPS, nom, f);
    if (existsSync(chemin)) return readFileSync(chemin, "utf8");
  }
  return null;
}

function dependances(nom: string): Record<string, string> {
  const p = join(APPS, nom, "package.json");
  if (!existsSync(p)) return {};
  const d = JSON.parse(readFileSync(p, "utf8"));
  return { ...(d.dependencies ?? {}), ...(d.devDependencies ?? {}) };
}

describe("une app qui importe Tailwind peut le compiler", () => {
  const apps = appsQuiImportentTailwind();

  it("et il y en a, sinon ce test ne garde rien", () => {
    expect(apps.length).toBeGreaterThan(10);
  });

  it("déclare le greffon PostCSS", () => {
    const sans = apps.filter((nom) => !configPostcss(nom));
    expect(sans).toEqual([]);
  });

  // Un `postcss.config` présent mais vide compilerait tout aussi peu, et il
  // aurait l'air juste à la relecture.
  it("et ce greffon est bien @tailwindcss/postcss", () => {
    const muets = apps.filter((nom) => !configPostcss(nom)?.includes("@tailwindcss/postcss"));
    expect(muets).toEqual([]);
  });

  // La configuration désigne un greffon ; sans la dépendance, la construction
  // échoue — bruyamment, cette fois, mais seulement chez qui construit.
  it("et il est installé, avec Tailwind lui-même", () => {
    const manquantes = apps
      .map((nom) => {
        const deps = dependances(nom);
        const absents = ["@tailwindcss/postcss", "tailwindcss"].filter((d) => !deps[d]);
        return absents.length ? `${nom} → ${absents.join(", ")}` : null;
      })
      .filter(Boolean);
    expect(manquantes).toEqual([]);
  });
});
