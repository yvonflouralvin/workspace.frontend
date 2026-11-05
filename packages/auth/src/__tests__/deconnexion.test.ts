/** Une app qui propose de se déconnecter doit savoir le faire.
 *
 *  POURQUOI CE TEST EXISTE. Dix-sept apps affichent le bouton — toutes par le
 *  même hook `useLogout`, qui appelle `POST /api/logout` sur SON propre
 *  domaine. Quatre seulement avaient la route. Les treize autres recevaient un
 *  404, que le `catch` du hook avale, puis redirigeaient vers l'écran de
 *  connexion ; le cookie de session étant toujours posé sur `.saas.cd` et
 *  toujours valide, `auth` renvoyait l'utilisateur dans la plateforme. Se
 *  déconnecter était impossible, sans aucun message.
 *
 *  Et des trois routes existantes, deux effaçaient le cookie SANS son
 *  domaine, ce qui ne l'efface pas. Rien dans TypeScript ne relie un bouton à
 *  l'existence d'une route : c'est le genre de couture qu'il faut garder à la
 *  main.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const APPS = join(__dirname, "..", "..", "..", "..", "apps");

function fichiers(racine: string): string[] {
  if (!existsSync(racine)) return [];
  const trouves: string[] = [];
  for (const entree of readdirSync(racine)) {
    // Les dossiers de build contiennent le hook compilé des dizaines de
    // fois : les parcourir rendrait le test lent ET faux.
    if (entree === "node_modules" || entree.startsWith(".")) continue;
    const chemin = join(racine, entree);
    if (statSync(chemin).isDirectory()) trouves.push(...fichiers(chemin));
    else if (/\.(tsx?|jsx?)$/.test(entree)) trouves.push(chemin);
  }
  return trouves;
}

function proposeLaDeconnexion(app: string): boolean {
  for (const dossier of ["app", "components", "src"]) {
    for (const fichier of fichiers(join(APPS, app, dossier))) {
      if (readFileSync(fichier, "utf8").includes("useLogout")) return true;
    }
  }
  return false;
}

const TOUTES = existsSync(APPS)
  ? readdirSync(APPS).filter((a) => statSync(join(APPS, a)).isDirectory())
  : [];

const AVEC_BOUTON = TOUTES.filter(proposeLaDeconnexion);

describe("se déconnecter", () => {
  it("il y a bien des apps qui le proposent", () => {
    // Si ce test tombe, c'est la DÉTECTION qui est cassée, pas les apps : un
    // garde-fou qui ne garde rien passerait au vert pour toujours.
    expect(AVEC_BOUTON.length).toBeGreaterThan(5);
  });

  it.each(AVEC_BOUTON)("%s a sa route /api/logout", (app) => {
    expect(existsSync(join(APPS, app, "app", "api", "logout", "route.ts")), app).toBe(true);
  });

  it.each(AVEC_BOUTON)("%s relaie au service plutôt que d'effacer elle-même", (app) => {
    const route = readFileSync(join(APPS, app, "app", "api", "logout", "route.ts"), "utf8");
    // `cookies.delete(nom)` n'efface pas un cookie posé avec un domaine. On
    // relaie donc les `Set-Cookie` du service, qui efface avec les mêmes
    // attributs que ceux dont il s'est servi pour poser.
    expect(route).toContain("forwardToBackend");
    expect(route.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")).not.toContain("cookies.delete");
  });
});
