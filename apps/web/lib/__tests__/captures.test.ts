/** LES CAPTURES D'ÉCRAN, ET LA COUTURE QUI LES TIENT.
 *
 *  Trois choses relient `lib/captures.ts` au reste, et aucune n'est vérifiée
 *  par le compilateur :
 *
 *  1. LE FICHIER DOIT EXISTER. `captures` ne porte qu'un nom ; le fichier vit
 *     dans `public/`. Renommer l'un sans l'autre donne une image morte sur la
 *     fiche produit — `tsc` est muet, `next build` réussit, et le défaut ne se
 *     voit qu'en ouvrant la page.
 *
 *  2. LE SLUG DOIT ÊTRE UN PRODUIT. Une entrée sous un slug inconnu n'est
 *     jamais lue : le travail est fait et invisible.
 *
 *  3. LA LÉGENDE DOIT DIRE QUELQUE CHOSE. Elle sert aussi de texte
 *     alternatif — c'est elle que lit un lecteur d'écran à la place de
 *     l'image. Une légende vide rendrait la section muette pour qui ne voit
 *     pas, et ça ne se remarque jamais à l'œil.
 */
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { captures, capturesDe } from "../captures";
import { produits } from "../produits";

const PUBLIC = join(__dirname, "..", "..", "public", "captures");
const SLUGS = new Set(produits.map((p) => p.slug));

describe("les captures d'écran", () => {
  it("pointent toutes vers un fichier qui existe", () => {
    const manquants = Object.values(captures)
      .flat()
      .map((c) => `${c.fichier}.webp`)
      .filter((f) => !existsSync(join(PUBLIC, f)));
    expect(manquants).toEqual([]);
  });

  it("sont toutes rangées sous un slug de produit connu", () => {
    const inconnus = Object.keys(captures).filter((s) => !SLUGS.has(s));
    expect(inconnus).toEqual([]);
  });

  it("portent toutes une légende utilisable comme texte alternatif", () => {
    const pauvres = Object.values(captures)
      .flat()
      .filter((c) => c.legende.trim().length < 40)
      .map((c) => c.fichier);
    expect(pauvres).toEqual([]);
  });

  // L'inverse du premier test : un fichier déposé et jamais référencé pèse
  // dans l'image Docker sans que personne ne le voie jamais.
  it("ne laissent aucun fichier orphelin dans public/", () => {
    const references = new Set(
      Object.values(captures).flat().map((c) => `${c.fichier}.webp`),
    );
    const orphelins = readdirSync(PUBLIC)
      .filter((f) => f.endsWith(".webp"))
      .filter((f) => !references.has(f));
    expect(orphelins).toEqual([]);
  });

  it("couvrent la majorité des modules du catalogue", () => {
    const couverts = produits.filter((p) => capturesDe(p.slug).length > 0);
    expect(couverts.length).toBeGreaterThanOrEqual(Math.ceil(produits.length * 0.8));
  });
});
