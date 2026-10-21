import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { forwardStreamToBackend } from "../server";
import { encrypt } from "../cipher";
import { webcrypto } from "node:crypto";

const CLE = Buffer.from("cle-de-test".padEnd(32, "0")).toString("base64");

let fetchOrigine: typeof globalThis.fetch;
let sauvegarde: Record<string, string | undefined>;
let recu: { url: string; corps: string | undefined } | null = null;

function fluxDe(morceaux: string[], retard = 0): ReadableStream<Uint8Array> {
  const encodeur = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    async pull(controleur) {
      if (i >= morceaux.length) {
        controleur.close();
        return;
      }
      if (retard) await new Promise((r) => setTimeout(r, retard));
      controleur.enqueue(encodeur.encode(morceaux[i]!));
      i++;
    },
  });
}

beforeEach(() => {
  recu = null;
  fetchOrigine = globalThis.fetch;
  sauvegarde = {
    NETWORK_ENCRYPTION: process.env.NETWORK_ENCRYPTION,
    NETWORK_ENCRYPTION_KEY: process.env.NETWORK_ENCRYPTION_KEY,
  };
  process.env.NETWORK_ENCRYPTION = "clear";
  process.env.NETWORK_ENCRYPTION_KEY = CLE;
});

afterEach(() => {
  globalThis.fetch = fetchOrigine;
  for (const [nom, valeur] of Object.entries(sauvegarde)) {
    if (valeur === undefined) delete process.env[nom];
    else process.env[nom] = valeur;
  }
});

describe("forwardStreamToBackend", () => {
  it("rend le flux au fur et à mesure, sans l'attendre en entier", async () => {
    globalThis.fetch = (async (url: string) => {
      recu = { url: String(url), corps: undefined };
      return new Response(fluxDe(["event: texte\ndata: {\"delta\":\"Bon\"}\n\n"], 0), {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    }) as typeof globalThis.fetch;

    const reponse = await forwardStreamToBackend(
      new Request("http://local/api/agent/x", { method: "POST", body: "{}" }),
      "http://backend:5000",
      "/agent/conversations/1/messages"
    );

    expect(reponse.body).not.toBeNull();
    // Le corps est un flux, pas une chaîne déjà lue : c'est tout l'objet.
    expect(reponse.headers.get("content-type")).toBe("text/event-stream");
    expect(reponse.headers.get("x-accel-buffering")).toBe("no");
    expect(await reponse.text()).toContain("\"delta\":\"Bon\"");
  });

  it("déchiffre le corps envoyé avant de le relayer", async () => {
    process.env.NETWORK_ENCRYPTION = "encrypted";
    globalThis.fetch = (async (url: string, init?: RequestInit) => {
      recu = { url: String(url), corps: init?.body as string };
      return new Response(fluxDe(["event: fin\ndata: {}\n\n"]), {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    }) as typeof globalThis.fetch;

    const enveloppe = await encrypt(webcrypto as Crypto, CLE, {
      contenu: "bonjour",
      application: "workspace",
    });

    await forwardStreamToBackend(
      new Request("http://local/api/agent/x", {
        method: "POST",
        body: JSON.stringify(enveloppe),
      }),
      "http://backend:5000",
      "/agent/conversations/1/messages"
    );

    expect(JSON.parse(recu!.corps!)).toEqual({ contenu: "bonjour", application: "workspace" });
  });

  it("rend une erreur du backend en JSON plutôt qu'un flux vide", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ detail: "Aucun abonnement Claude" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      })) as typeof globalThis.fetch;

    const reponse = await forwardStreamToBackend(
      new Request("http://local/api/agent/x", { method: "POST", body: "{}" }),
      "http://backend:5000",
      "/agent/conversations/1/messages"
    );

    expect(reponse.status).toBe(409);
    expect(await reponse.json()).toEqual({ detail: "Aucun abonnement Claude" });
  });
});
