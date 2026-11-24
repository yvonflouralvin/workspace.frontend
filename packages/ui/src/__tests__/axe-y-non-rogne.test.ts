/** L'AXE Y NE DOIT PAS SE FAIRE ROGNER.
 *
 *  Relevé en production sur le tableau de bord de la facturation : la
 *  graduation haute « 69 654 810 » s'affichait « 9 654 810 ». Un facteur dix,
 *  en silence, sur un chiffre d'affaires.
 *
 *  La cause tenait en une constante : les deux primitives portaient une marge
 *  gauche fixe (40 px et 36 px). L'étiquette est ancrée à droite de cette
 *  marge ; dès qu'elle est plus large, elle sort du `viewBox` et le
 *  navigateur la coupe PAR LA GAUCHE — sans erreur, sans avertissement, et
 *  en gardant une valeur parfaitement lisible mais fausse.
 *
 *  Deux propriétés, donc : la règle de calcul rend bien assez de place, et
 *  aucune primitive ne revient à une constante.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { margeAxeY } from "../charts/margeAxeY";

const CHARTS = join(__dirname, "..", "charts");

describe("la marge de l'axe Y", () => {
  it("grandit avec la plus longue graduation", () => {
    const courte = margeAxeY(["0", "25", "50", "75", "100"]);
    const longue = margeAxeY(["0", "17 413 702,5", "34 827 405", "52 241 107,5", "69 654 810"]);
    expect(longue).toBeGreaterThan(courte);
  });

  // Le cas qui a produit le défaut : à 9 px de corps, « 52 241 107,5 » fait
  // une soixantaine de pixels. L'ancienne marge en offrait 34.
  it("tient l'étiquette qui a été rognée en production", () => {
    expect(margeAxeY(["0", "52 241 107,5"])).toBeGreaterThanOrEqual(60);
  });

  it("garde un plancher et un plafond", () => {
    expect(margeAxeY([""])).toBeGreaterThanOrEqual(28);
    expect(margeAxeY(["000000000000000000000000000000"])).toBeLessThanOrEqual(104);
  });

  it("n'est contredite par aucune marge gauche en dur", () => {
    const enDur = ["BarChart.tsx", "LineChart.tsx"].filter((f) =>
      /left:\s*\d+/.test(readFileSync(join(CHARTS, f), "utf8")),
    );
    expect(enDur).toEqual([]);
  });
});
