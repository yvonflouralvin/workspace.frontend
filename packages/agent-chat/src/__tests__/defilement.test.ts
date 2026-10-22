import { describe, expect, it } from "vitest";

import { SEUIL_BAS, creerColleur, type Fil } from "../lib/defilement";

/** Un élément défilant de fausse monnaie : hauteur visible fixe, contenu qui
 *  grandit, position qu'on déplace à la main comme le ferait un doigt. */
function fil(hauteurVisible = 400): Fil & { grandir(de: number): void } {
  return {
    clientHeight: hauteurVisible,
    scrollHeight: hauteurVisible,
    scrollTop: 0,
    grandir(de: number) {
      this.scrollHeight += de;
    },
  };
}

describe("colleur de fil", () => {
  it("suit le bas quand un message arrive", () => {
    const f = fil();
    const colleur = creerColleur();
    f.grandir(300);
    colleur.suivre(f);
    expect(f.scrollTop).toBe(f.scrollHeight);
  });

  it("ne confond pas la croissance du contenu avec une remontée", () => {
    // LE bug : la décision se prenait après coup, en mesurant la distance au
    // bas. Un message qui ajoute plus que le seuil d'un seul coup la rendait
    // vraie, et le fil ne redescendait plus jamais.
    const f = fil();
    const colleur = creerColleur();

    f.grandir(SEUIL_BAS * 4);
    colleur.suivre(f);
    expect(f.scrollTop).toBe(f.scrollHeight);

    f.grandir(SEUIL_BAS * 4);
    colleur.suivre(f);
    expect(f.scrollTop).toBe(f.scrollHeight);
  });

  it("lâche le bas quand l'utilisateur remonte, et n'y ramène plus", () => {
    const f = fil();
    const colleur = creerColleur();
    f.grandir(2000);
    colleur.suivre(f);

    f.scrollTop = 100;
    colleur.defile(f);
    expect(colleur.colle).toBe(false);

    const laisse = f.scrollTop;
    f.grandir(500);
    colleur.suivre(f);
    expect(f.scrollTop).toBe(laisse);
  });

  it("recolle dès que l'utilisateur redescend lui-même", () => {
    const f = fil();
    const colleur = creerColleur();
    f.grandir(2000);
    f.scrollTop = 0;
    colleur.defile(f);
    expect(colleur.colle).toBe(false);

    f.scrollTop = f.scrollHeight - f.clientHeight;
    colleur.defile(f);
    expect(colleur.colle).toBe(true);

    f.grandir(500);
    colleur.suivre(f);
    expect(f.scrollTop).toBe(f.scrollHeight);
  });

  it("tolère un défilement qui s'arrête à quelques pixels du bas", () => {
    const f = fil();
    const colleur = creerColleur();
    f.grandir(2000);
    f.scrollTop = f.scrollHeight - f.clientHeight - (SEUIL_BAS - 1);
    colleur.defile(f);
    expect(colleur.colle).toBe(true);
  });

  it("ouvrir un fil ramène au dernier message, même si on avait remonté", () => {
    const f = fil();
    const colleur = creerColleur();
    f.grandir(2000);
    f.scrollTop = 0;
    colleur.defile(f);

    colleur.recoller(f);
    expect(colleur.colle).toBe(true);
    expect(f.scrollTop).toBe(f.scrollHeight);
  });
});
