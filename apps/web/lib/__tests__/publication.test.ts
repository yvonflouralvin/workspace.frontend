/** Le site doit pouvoir être publié — par les deux voies, et sans surprise.
 *
 *  POURQUOI CE TEST EXISTE. Deux incidents, de la même famille.
 *
 *  Le 9 octobre 2026, le Dockerfile du site a été supprimé et le site est
 *  sorti de la matrice de construction sans que personne le voie : SIX
 *  SEMAINES sans aucun moyen de le publier. Rien n'échouait — il n'y avait
 *  simplement plus de job.
 *
 *  Et le 23 novembre 2026, livrer un paragraphe de texte a demandé
 *  d'étiqueter vingt-trois dépôts et dix minutes vingt de construction, parce
 *  que le site n'avait pas de voie à lui.
 *
 *  Les deux voies doivent donc exister EN MÊME TEMPS, et c'est ce qu'on garde
 *  ici : un fichier de workflow est de la configuration, que ni `tsc` ni
 *  aucune construction ne relit.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const WORKFLOWS = join(__dirname, "..", "..", "..", "..", ".github", "workflows");
const plateforme = readFileSync(join(WORKFLOWS, "publier-images.yml"), "utf8");
const site = readFileSync(join(WORKFLOWS, "publier-vitrine.yml"), "utf8");

describe("la publication du site", () => {
  // L'incident du 9 octobre. Une livraison de plateforme doit continuer de
  // produire l'image du site : c'est le filet sous la voie rapide.
  it("reste dans la matrice de la plateforme", () => {
    expect(plateforme).toMatch(/\{\s*app:\s*web,\s*image:\s*web\s*\}/);
  });

  it("a aussi une voie à elle, déclenchée par une étiquette du site", () => {
    expect(site).toMatch(/tags:\s*\n\s*-\s*"site-\*"/);
  });

  // Si cette voie construisait toute la matrice, elle ne servirait à rien :
  // c'est le NOMBRE d'images qui coûtait dix minutes.
  it("et cette voie ne construit QUE le site", () => {
    expect(site).toContain("APP=web");
    expect(site).toContain("ghcr.io/${{ github.repository_owner }}/wd-ft-web");
    expect(site).not.toContain("matrix");
  });

  // Deux workflows qui écrivent la même étiquette mobile rendraient
  // `wd-ft-web:latest` indéchiffrable : on ne saurait plus laquelle des deux
  // voies l'a posée en dernier.
  it("ne déplace pas `latest`, que la voie de plateforme pose déjà", () => {
    expect(plateforme).toContain("value=latest");
    expect(site).not.toContain("value=latest");
  });

  // Les deux voies construisent la même application. Des caches séparés
  // feraient payer une réinstallation complète à chaque changement de voie.
  it("partage le cache de couches avec la voie de plateforme", () => {
    expect(site).toContain("scope=ft-web");
  });
});
