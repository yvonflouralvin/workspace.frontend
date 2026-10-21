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

  it("n'émet jamais de balise venue du texte", () => {
    // Le texte vient d'un modèle : ce qu'il écrit s'AFFICHE, ne s'exécute pas.
    expect(rendu("<script>alert(1)</script>")).not.toContain("<script>");
  });
});
