import { describe, expect, it } from "vitest";
import { enCle, quand } from "../components/CollaborateursAssistant";
import { CONSIGNES } from "../lib/consignes";
import type { Collaborateur } from "../types";

function collaborateur(partiel: Partial<Collaborateur> = {}): Collaborateur {
  return {
    id: 1,
    cle: "controleur",
    nom: "Contrôleur",
    role: "controleur",
    user_id: 7,
    consigne: "",
    cadence: "QUOTIDIENNE",
    heure: 7,
    jour: null,
    fuseau: "UTC",
    actif: true,
    dernier_passage: null,
    ...partiel,
  };
}

describe("la clé déduite du nom", () => {
  it("retire les accents AVANT de nettoyer", () => {
    // Nettoyer d'abord donnerait « contr-leur » : l'accent n'est pas une
    // lettre acceptée, et le service refuserait la clé sans qu'on comprenne.
    expect(enCle("Contrôleur interne")).toBe("controleur-interne");
  });

  it("ne laisse pas de tiret au bord", () => {
    expect(enCle("  Comptable !  ")).toBe("comptable");
  });

  it("ne dépasse pas la longueur acceptée par le service", () => {
    expect(enCle("a".repeat(80)).length).toBe(40);
  });
});

describe("quand il passe", () => {
  it("nomme le jour d'une cadence hebdomadaire", () => {
    expect(quand(collaborateur({ cadence: "HEBDOMADAIRE", jour: 4, heure: 7 }))).toBe(
      "Chaque vendredi à 07 h"
    );
  });

  it("dit l'heure d'une cadence quotidienne", () => {
    expect(quand(collaborateur({ heure: 18 }))).toBe("Tous les jours à 18 h");
  });

  it("ne promet rien pour une cadence manuelle", () => {
    expect(quand(collaborateur({ cadence: "MANUELLE" }))).toBe("À la demande");
  });
});

describe("les consignes de départ", () => {
  it("le contrôleur en a une, sinon la page blanche gagne", () => {
    expect(CONSIGNES["controleur"]).toContain("incohérences");
  });

  it("chacune demande de signaler ce qui n'a pas pu être vérifié, ou reste factuelle", () => {
    // La pente d'un modèle à qui l'on demande un relevé est de combler les
    // blancs. Chaque gabarit doit pousser dans l'autre sens.
    for (const [role, texte] of Object.entries(CONSIGNES)) {
      expect(texte.length, role).toBeGreaterThan(120);
    }
  });
});
