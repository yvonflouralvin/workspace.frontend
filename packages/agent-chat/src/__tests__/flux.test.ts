import { describe, expect, it } from "vitest";

import { lireFlux } from "../api/client";

function reponseDe(morceaux: string[]): Response {
  const encodeur = new TextEncoder();
  let i = 0;
  const flux = new ReadableStream<Uint8Array>({
    pull(controleur) {
      if (i >= morceaux.length) {
        controleur.close();
        return;
      }
      controleur.enqueue(encodeur.encode(morceaux[i]!));
      i++;
    },
  });
  return new Response(flux, { headers: { "content-type": "text/event-stream" } });
}

async function tout(reponse: Response) {
  const recus = [];
  for await (const e of lireFlux(reponse)) recus.push(e);
  return recus;
}

describe("lireFlux", () => {
  it("rend un évènement par bloc", async () => {
    const recus = await tout(
      reponseDe([
        'event: texte\ndata: {"delta":"Bon"}\n\n',
        'event: texte\ndata: {"delta":"jour"}\n\n',
        'event: fin\ndata: {"erreur":null}\n\n',
      ])
    );
    expect(recus.map((e) => e.nom)).toEqual(["texte", "texte", "fin"]);
    expect(recus[0]!.charge.delta).toBe("Bon");
  });

  it("recolle un évènement coupé entre deux trames", async () => {
    // Le cas qui fait perdre un mot sur dix sans lever d'erreur : rien ne
    // garantit qu'une trame réseau s'arrête sur une frontière de message.
    const recus = await tout(reponseDe(['event: texte\nda', 'ta: {"delta":"co', 'upé"}\n\n']));
    expect(recus).toHaveLength(1);
    expect(recus[0]!.charge.delta).toBe("coupé");
  });

  it("livre deux évènements arrivés dans la même trame", async () => {
    const recus = await tout(
      reponseDe(['event: texte\ndata: {"delta":"a"}\n\nevent: texte\ndata: {"delta":"b"}\n\n'])
    );
    expect(recus.map((e) => e.charge.delta)).toEqual(["a", "b"]);
  });

  it("ignore une trame illisible sans perdre les suivantes", async () => {
    const recus = await tout(
      reponseDe(["event: texte\ndata: {pas du json\n\n", 'event: fin\ndata: {"erreur":null}\n\n'])
    );
    expect(recus.map((e) => e.nom)).toEqual(["fin"]);
  });

  it("ne rend rien d'un bloc sans nom d'évènement", async () => {
    expect(await tout(reponseDe(["data: {}\n\n"]))).toEqual([]);
  });

  it("abandonne proprement une réponse sans corps", async () => {
    expect(await tout(new Response(null, { status: 204 }))).toEqual([]);
  });
});
