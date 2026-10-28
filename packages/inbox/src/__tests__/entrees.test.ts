import { describe, expect, it } from "vitest";
import type { InAppNotification } from "@repo/notifications/types/notification";

import { cleDe, depuis, estNonLue, melanger, titreDe } from "../lib/entrees";
import { nomDeLApp } from "../components/VueNotification";
import type { Fil } from "../types";

function fil(partiel: Partial<Fil> = {}): Fil {
  return {
    id: 1,
    genre: "MEMBRE",
    cree_par: 1,
    cree_le: "2026-10-20T08:00:00",
    dernier_message_le: "2026-10-20T08:00:00",
    correspondants: [],
    apercu: "",
    non_lu: false,
    en_cours: false,
    ...partiel,
  };
}

function notification(partiel: Partial<InAppNotification> = {}): InAppNotification {
  return {
    id: 1,
    type_key: "projects.tache_assignee",
    title: "Une tâche vous est assignée",
    body: null,
    link: null,
    data: null,
    read_at: null,
    created_at: "2026-10-20T08:00:00",
    ...partiel,
  };
}

describe("la file unique", () => {
  it("mêle les deux sources du plus récent au plus ancien", () => {
    const entrees = melanger(
      [
        fil({ id: 1, dernier_message_le: "2026-10-21T10:00:00" }),
        fil({ id: 2, dernier_message_le: "2026-10-19T10:00:00" }),
      ],
      [notification({ id: 9, created_at: "2026-10-20T10:00:00" })],
    );
    expect(entrees.map(cleDe)).toEqual(["fil-1", "notification-9", "fil-2"]);
  });

  it("classe un fil par son DERNIER message, pas par sa création", () => {
    // Sans ça, un vieux fil qui vient de recevoir une réponse resterait au
    // fond de la liste — c'est-à-dire invisible.
    const entrees = melanger(
      [fil({ id: 1, cree_le: "2026-01-01T00:00:00", dernier_message_le: "2026-10-22T09:00:00" })],
      [notification({ id: 9, created_at: "2026-10-21T09:00:00" })],
    );
    expect(cleDe(entrees[0]!)).toBe("fil-1");
  });

  it("ne confond pas un fil et une notification de même identifiant", () => {
    const entrees = melanger([fil({ id: 3 })], [notification({ id: 3 })]);
    expect(new Set(entrees.map(cleDe)).size).toBe(2);
  });

  it("rend une liste vide sans rien casser", () => {
    expect(melanger([], [])).toEqual([]);
  });
});

describe("le non-lu", () => {
  it("se lit sur le fil pour un fil", () => {
    expect(estNonLue({ sorte: "fil", date: "", fil: fil({ non_lu: true }) })).toBe(true);
    expect(estNonLue({ sorte: "fil", date: "", fil: fil({ non_lu: false }) })).toBe(false);
  });

  it("se lit sur la date de lecture pour une notification", () => {
    expect(
      estNonLue({ sorte: "notification", date: "", notification: notification({ read_at: null }) }),
    ).toBe(true);
    expect(
      estNonLue({
        sorte: "notification",
        date: "",
        notification: notification({ read_at: "2026-10-20T09:00:00" }),
      }),
    ).toBe(false);
  });
});

describe("l'âge d'une entrée", () => {
  const maintenant = new Date("2026-10-22T12:00:00Z").getTime();
  const ilYA = (ms: number) => new Date(maintenant - ms).toISOString();

  it("dit « à l'instant » sous la minute", () => {
    expect(depuis(ilYA(30_000), maintenant)).toBe("à l'instant");
  });

  it("compte en minutes, puis en heures, puis en jours", () => {
    expect(depuis(ilYA(5 * 60_000), maintenant)).toBe("5 min");
    expect(depuis(ilYA(3 * 3_600_000), maintenant)).toBe("3 h");
    expect(depuis(ilYA(2 * 86_400_000), maintenant)).toBe("2 j");
  });

  it("passe à la date au-delà d'une semaine", () => {
    expect(depuis(ilYA(30 * 86_400_000), maintenant)).toMatch(/sept/);
  });

  it("ne rend jamais une durée négative", () => {
    // Les horloges du serveur et du navigateur ne sont pas les mêmes : une
    // date « dans le futur » de quelques secondes est banale.
    expect(depuis(new Date(maintenant + 5_000).toISOString(), maintenant)).toBe("à l'instant");
  });
});

describe("le nom de l'application d'une notification", () => {
  it("lit le préfixe du type", () => {
    expect(nomDeLApp("agent.mission_terminee")).toBe("Assistant");
    expect(nomDeLApp("approval_flows.demande")).toBe("Circuits d'approbation");
  });

  it("retombe sur la clé pour une application inconnue", () => {
    // Le catalogue ne porte que le nom des TYPES : une app nouvelle doit
    // s'afficher sous son identifiant plutôt que disparaître.
    expect(nomDeLApp("truc.machin")).toBe("truc");
  });

  it("supporte un type vide", () => {
    expect(nomDeLApp("")).toBe("");
  });
});

describe("le titre d'une ligne de la liste", () => {
  it("nomme les gens, pas un objet", () => {
    // Une conversation n'a plus d'objet : c'est le correspondant qu'on
    // cherche des yeux dans la liste.
    expect(
      titreDe({
        sorte: "fil",
        date: "2026-10-20T08:00:00",
        fil: fil({ correspondants: [{ user_id: 2, nom: "Bob", collaborateur: false }] }),
      })
    ).toBe("Bob");
  });

  it("énumère une conversation à plusieurs", () => {
    expect(
      titreDe({
        sorte: "fil",
        date: "2026-10-20T08:00:00",
        fil: fil({
          correspondants: [
            { user_id: 2, nom: "Bob", collaborateur: false },
            { user_id: 3, nom: "Chloé", collaborateur: false },
          ],
        }),
      })
    ).toBe("Bob, Chloé");
  });

  it("ne rend jamais une ligne vide", () => {
    // Tous les autres ont quitté l'espace : rare, mais un blanc se lirait
    // comme un défaut d'affichage.
    expect(
      titreDe({ sorte: "fil", date: "2026-10-20T08:00:00", fil: fil({ correspondants: [] }) })
    ).toBe("Conversation");
  });

  it("laisse son titre à une notification", () => {
    expect(
      titreDe({
        sorte: "notification",
        date: "2026-10-20T08:00:00",
        notification: notification({ title: "Une tâche vous est assignée" }),
      })
    ).toBe("Une tâche vous est assignée");
  });
});
