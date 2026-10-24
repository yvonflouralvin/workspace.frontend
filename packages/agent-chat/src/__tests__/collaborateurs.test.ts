import { describe, expect, it } from "vitest";
import { enCle, quand, resumeDesTaches } from "../components/CollaborateursAssistant";
import { PROFILS, TACHES_SUGGEREES } from "../lib/metiers";
import type { TacheRecurrente } from "../types";

function tache(partiel: Partial<TacheRecurrente> = {}): TacheRecurrente {
  return {
    id: 1,
    collaborateur_id: 1,
    nom: "Relevé",
    consigne: "Relève les incohérences.",
    cadence: "QUOTIDIENNE",
    heure: 7,
    jour: null,
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

describe("quand une tâche passe", () => {
  it("nomme le jour d'une cadence hebdomadaire", () => {
    expect(quand(tache({ cadence: "HEBDOMADAIRE", jour: 4, heure: 7 }))).toBe(
      "Chaque vendredi à 07 h"
    );
  });

  it("dit l'heure d'une cadence quotidienne", () => {
    expect(quand(tache({ heure: 18 }))).toBe("Tous les jours à 18 h");
  });

  it("ne promet rien pour une cadence manuelle", () => {
    expect(quand(tache({ cadence: "MANUELLE" }))).toBe("À la demande");
  });
});

describe("le résumé sous le nom d'un collaborateur", () => {
  it("dit franchement qu'un agent sans tâche ne se réveillera jamais", () => {
    // C'est l'état dans lequel un collaborateur NAÎT : le taire laisserait
    // quelqu'un attendre un passage qui ne viendra pas.
    expect(resumeDesTaches([])).toContain("jamais");
  });

  it("ne compte pas les tâches en pause", () => {
    expect(resumeDesTaches([tache({ actif: false })])).toBe("aucune tâche active");
  });

  it("décrit l'horaire quand il n'y en a qu'une", () => {
    expect(resumeDesTaches([tache({ heure: 6 })])).toBe("tous les jours à 06 h");
  });

  it("compte au-delà de deux", () => {
    expect(resumeDesTaches([tache({ id: 1 }), tache({ id: 2 })])).toBe(
      "2 tâches récurrentes"
    );
  });

  it("ignore les tâches à la demande, qui ne disent rien d'un horaire", () => {
    expect(resumeDesTaches([tache({ cadence: "MANUELLE" })])).toBe("aucune tâche active");
  });
});

describe("les profils de départ", () => {
  it("le comptable sait de quoi il parle, sinon la page blanche gagne", () => {
    expect(PROFILS["comptable"]).toContain("comptab");
  });

  it("chacun dit QUI est l'agent, au présent, à la deuxième personne", () => {
    for (const [role, texte] of Object.entries(PROFILS)) {
      expect(texte.startsWith("Tu es "), role).toBe(true);
      expect(texte.length, role).toBeGreaterThan(120);
    }
  });
});

describe("les tâches de départ", () => {
  it("chaque métier en propose au moins une", () => {
    // Un collaborateur créé sans aucune tâche ne se réveille jamais, et rien
    // à l'écran ne le dirait au moment de la création.
    for (const role of Object.keys(PROFILS)) {
      expect(TACHES_SUGGEREES[role]?.length ?? 0, role).toBeGreaterThan(0);
    }
  });

  it("une tâche hebdomadaire porte toujours son jour", () => {
    // Sans jour, le service la refuse : la proposer ainsi ferait échouer la
    // création juste après avoir créé le compte.
    for (const [role, taches] of Object.entries(TACHES_SUGGEREES)) {
      for (const t of taches) {
        if (t.cadence === "HEBDOMADAIRE") {
          expect(t.jour, `${role}/${t.nom}`).not.toBeUndefined();
        }
      }
    }
  });

  it("chacune a un nom et une consigne non vides", () => {
    for (const [role, taches] of Object.entries(TACHES_SUGGEREES)) {
      for (const t of taches) {
        expect(t.nom.trim().length, role).toBeGreaterThan(0);
        expect(t.consigne.trim().length, role).toBeGreaterThan(40);
      }
    }
  });

  it("le comptable en a deux : le matin et le soir", () => {
    // C'est l'exemple qui a motivé la bascule vers plusieurs tâches.
    const heures = (TACHES_SUGGEREES["comptable"] ?? []).map((t) => t.heure);
    expect(heures.length).toBe(2);
    expect(Math.max(...heures) - Math.min(...heures)).toBeGreaterThan(6);
  });
});
