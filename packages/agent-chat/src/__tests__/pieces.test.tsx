import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { poidsLisible } from "../components/PanneauAssistant";
import { urlPiece } from "../api/client";
import { Markdown, schemaSur } from "../lib/markdown";

describe("poidsLisible", () => {
  it("reste lisible à chaque ordre de grandeur", () => {
    expect(poidsLisible(512)).toBe("512 o");
    expect(poidsLisible(2048)).toBe("2 ko");
    expect(poidsLisible(3 * 1024 * 1024)).toBe("3.0 Mo");
  });
});

describe("urlPiece", () => {
  it("passe par le relais de l'app, jamais par le service", () => {
    // Un lien direct vers le backend serait injoignable depuis le navigateur
    // (patron BFF : aucun backend n'a de domaine public).
    expect(urlPiece(3, 42)).toBe("/api/agent/conversations/3/pieces/42");
  });

  it("respecte un préfixe différent", () => {
    expect(urlPiece(3, 42, "/api/assistant")).toBe("/api/assistant/conversations/3/pieces/42");
  });
});

describe("Markdown — les liens que le modèle écrit", () => {
  it("rend cliquable ce qui est inoffensif", () => {
    for (const cible of ["https://exemple.test", "http://exemple.test", "mailto:a@b.cd", "/projects/3"]) {
      expect(schemaSur(cible)).toBe(true);
    }
  });

  it("refuse les schémas qui exécutent", () => {
    // React bloque `javascript:` aujourd'hui, mais c'est un filet du framework
    // annoncé comme amovible — et il ne couvre pas `data:`.
    for (const cible of ["javascript:alert(1)", "data:text/html,<script>x</script>", "vbscript:x", "JaVaScRiPt:x"]) {
      expect(schemaSur(cible)).toBe(false);
    }
  });

  it("affiche en texte un lien refusé plutôt que de le masquer", () => {
    // On ne cache pas ce que le modèle a écrit : on refuse seulement de le
    // rendre cliquable.
    const html = renderToStaticMarkup(<Markdown texte="[clic](javascript:alert(1))" />);
    expect(html).not.toContain("<a");
    expect(html).toContain("clic");
  });
});
