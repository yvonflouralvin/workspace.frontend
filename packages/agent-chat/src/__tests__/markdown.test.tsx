import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Markdown } from "../lib/markdown";

const rendu = (texte: string) => renderToStaticMarkup(<Markdown texte={texte} />);

describe("Markdown", () => {
  it("rend un paragraphe simple", () => {
    expect(rendu("Bonjour")).toContain("<p");
    expect(rendu("Bonjour")).toContain("Bonjour");
  });

  it("rend le gras, l'italique et le code en un seul passage", () => {
    // Des remplacements successifs réécriraient ce qu'ils viennent de produire :
    // le gras autour d'un code disparaissait.
    const html = rendu("**gras** *penché* `code`");
    expect(html).toContain("<strong");
    expect(html).toContain("<em");
    expect(html).toContain("<code");
  });

  it("rend un bloc de code avec sa langue", () => {
    const html = rendu("```python\nprint(1)\n```");
    expect(html).toContain("<pre");
    expect(html).toContain("python");
    expect(html).toContain("print(1)");
  });

  it("distingue une liste à puces d'une liste numérotée", () => {
    expect(rendu("- un\n- deux")).toContain("<ul");
    expect(rendu("1. un\n2. deux")).toContain("<ol");
  });

  it("ouvre un lien dans un nouvel onglet, sans fuite de référent", () => {
    const html = rendu("[ici](https://exemple.test)");
    expect(html).toContain('href="https://exemple.test"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("rend un tableau, pas une colonne de barres verticales", () => {
    // Le modèle en produit dès qu'on lui demande un comparatif.
    const html = rendu("| Nom | Ville |\n| --- | --- |\n| Kin Services | Kinshasa |");
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("Kin Services");
    expect(html).not.toContain("| Nom |");
  });

  it("suit l'alignement déclaré dans la ligne de séparation", () => {
    const html = rendu("| G | C | D |\n| :-- | :-: | --: |\n| 1 | 2 | 3 |");
    expect(html).toContain("text-left");
    expect(html).toContain("text-center");
    expect(html).toContain("text-right");
  });

  it("accepte un tableau écrit sans barres de bord", () => {
    const html = rendu("Nom | Ville\n--- | ---\nKin Services | Kinshasa");
    expect(html).toContain("<table");
    expect(html).toContain("Kinshasa");
  });

  it("rend le markdown à l'intérieur d'une cellule", () => {
    const html = rendu("| Outil |\n| --- |\n| `tiers_creer` |");
    expect(html).toContain("<code");
  });

  it("garde toutes les colonnes de l'en-tête quand une rangée est courte", () => {
    // Une rangée tronquée ne doit pas décaler les suivantes d'une colonne.
    const html = rendu("| A | B |\n| --- | --- |\n| seul |\n| x | y |");
    expect((html.match(/<td/g) ?? []).length).toBe(4);
  });

  it("ne prend pas une ligne de tirets pour un tableau", () => {
    // Trois tirets seuls, ou une liste à puces, ne commencent pas un tableau.
    expect(rendu("---")).not.toContain("<table");
    expect(rendu("- un\n- deux")).not.toContain("<table");
  });

  it("laisse le texte reprendre après le tableau", () => {
    const html = rendu("| A |\n| --- |\n| 1 |\n\nEt voilà.");
    expect(html).toContain("<table");
    expect(html).toContain("Et voil");
  });

  it("n'émet jamais de balise venue du texte", () => {
    // Le texte vient d'un modèle : ce qu'il écrit s'AFFICHE, ne s'exécute pas.
    expect(rendu("<script>alert(1)</script>")).not.toContain("<script>");
  });
});
