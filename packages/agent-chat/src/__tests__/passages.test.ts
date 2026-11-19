import { describe, expect, it } from "vitest";

import { tourFini } from "../components/CollaborateursAssistant";
import type { Mission } from "../types";

/** CE QUE CES TESTS PROTÈGENT.
 *
 *  Le type `Mission["statut"]` a vécu plusieurs semaines sans `SUSPENDUE`,
 *  ajouté côté service et jamais côté écran. Deux conséquences, mesurées sur
 *  la recette :
 *
 *    - la pastille de statut s'affichait VIDE et sans couleur, les deux
 *      tables de libellés étant indexées sur cette union ;
 *    - le suivi d'un passage lancé à la main ne s'arrêtait jamais — sa
 *      condition d'arrêt ne connaissait que « réussie » et « échouée ».
 *
 *  La première est désormais tenue par le compilateur : `Record<Mission
 *  ["statut"], string>` refuse une table incomplète. La seconde n'était
 *  qu'une expression au milieu d'un effet, invérifiable ; elle a un nom. */

const TOUS: Mission["statut"][] = [
  "EN_ATTENTE",
  "EN_COURS",
  "SUSPENDUE",
  "REUSSIE",
  "ECHOUEE",
];

describe("tourFini", () => {
  it("une mission suspendue a fini son tour", () => {
    // C'EST LE CŒUR DU DÉFAUT : elle n'est ni réussie ni échouée, et elle
    // peut dormir deux heures. Continuer à l'interroger toutes les trois
    // secondes ne la réveille pas.
    expect(tourFini("SUSPENDUE")).toBe(true);
  });

  it("une mission réussie ou échouée a fini son tour", () => {
    expect(tourFini("REUSSIE")).toBe(true);
    expect(tourFini("ECHOUEE")).toBe(true);
  });

  it("une mission en file ou en cours n'a pas fini", () => {
    expect(tourFini("EN_ATTENTE")).toBe(false);
    expect(tourFini("EN_COURS")).toBe(false);
  });

  it("tranche pour chaque statut que le service sait rendre", () => {
    // Sans ce balayage, un statut ajouté au type passerait au travers : la
    // fonction rendrait `false` en silence, et le suivi repartirait pour un
    // tour sans fin.
    for (const statut of TOUS) {
      expect(typeof tourFini(statut)).toBe("boolean");
    }
    expect(TOUS.filter(tourFini)).toEqual(["SUSPENDUE", "REUSSIE", "ECHOUEE"]);
  });
});
