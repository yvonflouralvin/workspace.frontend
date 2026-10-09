import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "../client";
import { encrypt, decrypt } from "../cipher";
import { isEnvelope } from "../envelope";
import {
  configurerReseauClient,
  reinitialiserConfigReseauClient,
} from "../config";

// Les tests précédents vérifient QUELLE clé est renvoyée. Ceux-ci vérifient que
// c'est bien celle-là qui CHIFFRE : un accesseur juste et un chiffrement qui
// utilise encore l'ancienne valeur donneraient exactement la panne qu'on répare.
const cleDe = (nom: string) =>
  Buffer.from(nom.padEnd(32, "0").slice(0, 32)).toString("base64");

const CLE_DEPOSEE = cleDe("deposee");

const VARIABLES = [
  "NEXT_PUBLIC_NETWORK_ENCRYPTION",
  "NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY",
  "NETWORK_ENCRYPTION",
  "NETWORK_ENCRYPTION_KEY",
] as const;

let sauvegarde: Record<string, string | undefined>;
let fetchOrigine: typeof globalThis.fetch;
let corpsEnvoye: string | undefined;

beforeEach(() => {
  sauvegarde = {};
  for (const v of VARIABLES) {
    sauvegarde[v] = process.env[v];
    delete process.env[v];
  }
  reinitialiserConfigReseauClient();

  corpsEnvoye = undefined;
  fetchOrigine = globalThis.fetch;
  globalThis.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    corpsEnvoye = init?.body as string | undefined;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as unknown as typeof globalThis.fetch;
});

afterEach(() => {
  for (const v of VARIABLES) {
    if (sauvegarde[v] === undefined) delete process.env[v];
    else process.env[v] = sauvegarde[v];
  }
  reinitialiserConfigReseauClient();
  globalThis.fetch = fetchOrigine;
});

describe("apiFetch utilise la clé déposée au démarrage", () => {
  it("chiffre le corps avec elle, et le résultat se déchiffre avec elle", async () => {
    configurerReseauClient({ mode: "encrypted", cle: CLE_DEPOSEE });

    await apiFetch("/api/essai", {
      method: "POST",
      body: { email: "a@b.cd", motDePasse: "secret" },
    });

    const enveloppe = JSON.parse(corpsEnvoye!);
    expect(isEnvelope(enveloppe)).toBe(true);
    expect(corpsEnvoye).not.toContain("a@b.cd");

    const clair = await decrypt(globalThis.crypto, CLE_DEPOSEE, enveloppe);
    expect(clair).toEqual({ email: "a@b.cd", motDePasse: "secret" });
  });

  it("déchiffre une réponse chiffrée avec elle", async () => {
    configurerReseauClient({ mode: "encrypted", cle: CLE_DEPOSEE });
    const enveloppe = await encrypt(globalThis.crypto, CLE_DEPOSEE, {
      utilisateur: "claire",
    });
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify(enveloppe), { status: 200 }),
    ) as unknown as typeof globalThis.fetch;

    const reponse = await apiFetch("/api/essai");
    expect(await reponse.json()).toEqual({ utilisateur: "claire" });
  });

  it("laisse le corps en clair quand le mode déposé est « clear »", async () => {
    configurerReseauClient({ mode: "clear", cle: CLE_DEPOSEE });
    await apiFetch("/api/essai", { method: "POST", body: { a: 1 } });
    expect(JSON.parse(corpsEnvoye!)).toEqual({ a: 1 });
  });
});

describe("régression de bout en bout : image construite sans variables publiques", () => {
  it("la requête part chiffrée alors que le bundle ne portait aucune clé", async () => {
    expect(process.env.NEXT_PUBLIC_NETWORK_ENCRYPTION_KEY).toBeUndefined();
    configurerReseauClient({ mode: "encrypted", cle: CLE_DEPOSEE });

    await apiFetch("/api/essai", { method: "POST", body: { secret: "x" } });

    const clair = await decrypt(
      globalThis.crypto,
      CLE_DEPOSEE,
      JSON.parse(corpsEnvoye!),
    );
    expect(clair).toEqual({ secret: "x" });
  });

  // Propriété de sûreté : l'absence de clé doit ARRÊTER l'appel. Un repli
  // silencieux vers le clair enverrait des identifiants en clair sur le réseau
  // sans que personne le voie — un défaut bien plus grave que l'erreur visible
  // qui nous a alertés.
  it("sans clé nulle part, l'appel échoue au lieu de partir en clair", async () => {
    await expect(
      apiFetch("/api/essai", { method: "POST", body: { secret: "x" } }),
    ).rejects.toThrow(/Clé de chiffrement absente/);
    expect(corpsEnvoye).toBeUndefined();
  });
});
