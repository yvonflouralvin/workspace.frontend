/** Les règles de partage d'une fiche client.
 *
 *  Ce qu'elles décident, c'est qui voit les données d'un client. Une erreur ici
 *  ouvre une fiche à quelqu'un, ou la ferme à qui en a besoin, et ni l'une ni
 *  l'autre ne se voit à l'écran. `@repo/ui` n'avait aucun harnais : ces tests
 *  sont les premiers du paquet.
 */
import { describe, expect, it } from "vitest";

import {
  basculerSection,
  cleGrant,
  libelleGrant,
  majGroupes,
  majPersonnes,
  retirerGrant,
  type PartageGrant,
} from "../partage-grants";

const SECTIONS = ["informations_generales", "contacts", "contrats"];

const personne = (id: number, sections: string[] = []): PartageGrant => ({
  user_id: id,
  groupe_id: null,
  sections,
});
const groupe = (id: number, sections: string[] = []): PartageGrant => ({
  user_id: null,
  groupe_id: id,
  sections,
});

describe("la clé d'une ligne", () => {
  it("distingue une personne d'un groupe portant le même id", () => {
    // Côté auth, les ids des personnes et ceux des groupes sont deux
    // numérotations indépendantes : sans le préfixe, retirer la personne 7
    // retirerait aussi le groupe 7.
    expect(cleGrant(personne(7))).not.toBe(cleGrant(groupe(7)));
  });
});

describe("ajouter et retirer", () => {
  it("ne touche pas aux groupes quand on change les personnes", () => {
    const apres = majPersonnes([groupe(3), personne(1)], [1, 2]);
    expect(apres).toContainEqual(groupe(3));
    expect(apres.filter((g) => g.user_id !== null).map((g) => g.user_id)).toEqual([1, 2]);
  });

  it("ne touche pas aux personnes quand on change les groupes", () => {
    const apres = majGroupes([personne(1), groupe(3)], [3, 4]);
    expect(apres).toContainEqual(personne(1));
    expect(apres.filter((g) => g.groupe_id !== null).map((g) => g.groupe_id)).toEqual([3, 4]);
  });

  it("conserve les sections déjà réglées de qui reste", () => {
    // Le défaut qu'on refuse : ajouter quelqu'un remettait son voisin à
    // « accès complet » sans le dire.
    const apres = majPersonnes([personne(1, ["contacts"])], [1, 2]);
    expect(apres.find((g) => g.user_id === 1)?.sections).toEqual(["contacts"]);
    expect(apres.find((g) => g.user_id === 2)?.sections).toEqual([]);
  });

  it("retire la bonne ligne quand une personne et un groupe partagent l'id", () => {
    const apres = retirerGrant([personne(7), groupe(7)], personne(7));
    expect(apres).toEqual([groupe(7)]);
  });
});

describe("les sections d'une ligne", () => {
  it("décocher depuis « accès complet » laisse TOUT LE RESTE", () => {
    // Le piège : une liste vide vaut accès complet. Partir de la liste vide
    // pour décocher ne laisserait qu'une seule section, et la personne
    // perdrait les autres sans que rien ne l'annonce.
    const apres = basculerSection([personne(1)], personne(1), "contacts", SECTIONS);
    expect(apres[0]!.sections).toEqual(["informations_generales", "contrats"]);
  });

  it("cocher une section de plus l'ajoute sans perdre les autres", () => {
    const apres = basculerSection(
      [personne(1, ["contacts"])], personne(1), "contrats", SECTIONS,
    );
    expect(apres[0]!.sections).toEqual(["contacts", "contrats"]);
  });

  it("ne modifie que la ligne visée", () => {
    const apres = basculerSection(
      [personne(1, ["contacts"]), groupe(1, ["contrats"])],
      personne(1), "contrats", SECTIONS,
    );
    expect(apres[1]!.sections).toEqual(["contrats"]);
  });
});

describe("le libellé d'une ligne", () => {
  const personnes = [{ id: 1, label: "Grace" }];
  const groupes = [{ id: 1, label: "Équipe BFM" }];

  it("ne confond pas une personne et un groupe de même id", () => {
    expect(libelleGrant(personne(1), personnes, groupes)).toBe("Grace");
    expect(libelleGrant(groupe(1), personnes, groupes)).toBe("Équipe BFM");
  });

  it("dit l'id plutôt que rien quand l'annuaire ne rend pas la personne", () => {
    // Un membre retiré du workspace garde sa ligne de partage. Afficher du vide
    // laisserait une ligne qu'on ne peut ni comprendre ni retirer en confiance.
    expect(libelleGrant(personne(99), personnes, groupes)).toBe("Utilisateur #99");
    expect(libelleGrant(groupe(99), personnes, groupes)).toBe("Groupe #99");
  });
});
