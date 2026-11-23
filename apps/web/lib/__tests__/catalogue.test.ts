import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { categories, produits, getProduit } from "../produits";

// LES ICÔNES SONT NOMMÉES PAR UNE CHAÎNE, et une chaîne inconnue ne casse
// rien : `ProduitIcon` retombe sur `Hub`. Un produit ajouté sans enregistrer
// son icône s'affiche donc avec celle d'un autre — personne ne le voit en
// relisant le diff, et la page se construit sans un mot. C'est ce qui a failli
// arriver en ajoutant les collaborateurs virtuels.
const carte = readFileSync(join(__dirname, "../../components/icon-map.tsx"), "utf8");
const enregistrees = new Set(
  carte
    .slice(carte.indexOf("const icons"), carte.indexOf("export function"))
    .split("\n")
    .map((l) => l.trim().replace(/,$/, ""))
    .filter((l) => /^[A-Z][A-Za-z0-9]*$/.test(l)),
);

describe("le catalogue des produits", () => {
  it("n'annonce que des icônes réellement enregistrées", () => {
    const manquantes = produits.filter((p) => !enregistrees.has(p.icone));
    expect(manquantes.map((p) => `${p.slug} → ${p.icone}`)).toEqual([]);
  });

  // La fiche produit est servie par `/produits/[slug]` : deux produits de même
  // slug en rendraient un seul, et l'autre deviendrait introuvable.
  it("donne un slug unique à chaque produit", () => {
    expect(new Set(produits.map((p) => p.slug)).size).toBe(produits.length);
  });

  // `produitsParCategorie` boucle sur `categories` : un produit rangé dans une
  // catégorie absente de cette liste ne s'affiche NULLE PART sur /produits,
  // tout en existant à son adresse. Une page orpheline, sans erreur.
  it("ne range aucun produit dans une catégorie inconnue", () => {
    const connues = new Set<string>(categories);
    const egares = produits.filter((p) => !connues.has(p.categorie));
    expect(egares.map((p) => `${p.slug} → ${p.categorie}`)).toEqual([]);
  });

  it("retrouve un produit par son slug", () => {
    expect(getProduit("collaborateurs-virtuels")?.nom).toBe("Collaborateurs virtuels");
    expect(getProduit("inconnu")).toBeUndefined();
  });

  // L'accueil n'affiche que les huit premiers : ce qu'on met en avant est une
  // décision, et l'ordre du tableau EST cette décision.
  it("met les collaborateurs virtuels sur l'accueil", () => {
    expect(produits.slice(0, 8).map((p) => p.slug)).toContain("collaborateurs-virtuels");
  });
});
