import { apiFetch, apiStream } from "@repo/network/client";
import type { Conversation, ConversationDetail, EtatConnexion, PieceJointe } from "../types";

/** Préfixe des routes BFF de l'app consommatrice — jamais le backend en direct.
 *  Chaque app garde son propre relais, comme pour les notifications. */
export const BASE_PAR_DEFAUT = "/api/agent";

async function json<T>(reponse: Response): Promise<T> {
  const charge = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    throw new ErreurAssistant(
      (charge as { detail?: string } | null)?.detail ?? "Le service assistant n'a pas répondu",
      reponse.status
    );
  }
  return charge as T;
}

export class ErreurAssistant extends Error {
  constructor(
    message: string,
    readonly statut: number
  ) {
    super(message);
  }

  /** 409 : l'abonnement Claude de l'espace de travail n'est pas branché.
   *  Rien à réessayer — c'est à un administrateur d'agir. */
  get abonnementManquant(): boolean {
    return this.statut === 409;
  }
}

export async function listerConversations(base = BASE_PAR_DEFAUT): Promise<Conversation[]> {
  return json(await apiFetch(`${base}/conversations`));
}

export async function ouvrirConversation(base = BASE_PAR_DEFAUT): Promise<ConversationDetail> {
  return json(await apiFetch(`${base}/conversations`, { method: "POST", body: {} }));
}

export async function lireConversation(
  id: number,
  base = BASE_PAR_DEFAUT
): Promise<ConversationDetail> {
  return json(await apiFetch(`${base}/conversations/${id}`));
}

export async function archiverConversation(id: number, base = BASE_PAR_DEFAUT): Promise<void> {
  const reponse = await apiFetch(`${base}/conversations/${id}`, { method: "DELETE" });
  if (!reponse.ok && reponse.status !== 204) {
    throw new ErreurAssistant("Impossible d'archiver cette conversation", reponse.status);
  }
}

export interface EvenementFlux {
  nom: "texte" | "erreur" | "fin" | "piece";
  charge: {
    delta?: string;
    message?: string;
    abonnement?: boolean;
    erreur?: string | null;
    // Évènement « piece » : un fichier que l'agent vient d'écrire.
    document_id?: number;
    nom?: string;
    type_mime?: string;
    taille?: number;
  };
}

/** Découpe un flux SSE en évènements.
 *
 *  Un `ReadableStream` ne respecte aucune frontière de message : une trame TCP
 *  peut couper au milieu d'un `data:`. On n'émet donc que sur un séparateur
 *  complet (`\n\n`) et on garde le reste pour le tour suivant — sans ce tampon,
 *  un mot sur dix se perdait au milieu d'une phrase longue. */
export async function* lireFlux(reponse: Response): AsyncGenerator<EvenementFlux> {
  const corps = reponse.body;
  if (!corps) return;
  const lecteur = corps.getReader();
  const decodeur = new TextDecoder();
  let tampon = "";

  while (true) {
    const { done, value } = await lecteur.read();
    if (done) break;
    tampon += decodeur.decode(value, { stream: true });

    let coupure: number;
    while ((coupure = tampon.indexOf("\n\n")) !== -1) {
      const bloc = tampon.slice(0, coupure);
      tampon = tampon.slice(coupure + 2);

      let nom = "";
      const donnees: string[] = [];
      for (const ligne of bloc.split("\n")) {
        if (ligne.startsWith("event:")) nom = ligne.slice(6).trim();
        else if (ligne.startsWith("data:")) donnees.push(ligne.slice(5).trim());
      }
      if (!nom || donnees.length === 0) continue;
      try {
        yield { nom: nom as EvenementFlux["nom"], charge: JSON.parse(donnees.join("\n")) };
      } catch {
        // Une trame illisible ne doit pas interrompre celles qui suivent.
      }
    }
  }
}

/** Téléverse une pièce. **Pas de chiffrement** : `@repo/network` emballe un
 *  objet JSON, pas des octets, et y faire passer un fichier le corromprait.
 *  Le relais de l'app relaie le multipart tel quel, comme pour `hr`. */
export async function joindrePiece(
  conversationId: number,
  fichier: File,
  base = BASE_PAR_DEFAUT
): Promise<PieceJointe> {
  const corps = new FormData();
  corps.append("fichier", fichier);
  const reponse = await fetch(`${base}/conversations/${conversationId}/pieces`, {
    method: "POST",
    body: corps,
  });
  const charge = await reponse.json().catch(() => null);
  if (!reponse.ok) {
    throw new ErreurAssistant(
      (charge as { detail?: string } | null)?.detail ?? `« ${fichier.name} » n'a pas pu être joint`,
      reponse.status
    );
  }
  return charge as PieceJointe;
}

export function urlPiece(
  conversationId: number,
  documentId: number,
  base = BASE_PAR_DEFAUT
): string {
  return `${base}/conversations/${conversationId}/pieces/${documentId}`;
}

export async function envoyerMessage(
  conversationId: number,
  contenu: string,
  application: string,
  documents: number[],
  signal: AbortSignal,
  base = BASE_PAR_DEFAUT
): Promise<Response> {
  const reponse = await apiStream(`${base}/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { contenu, application, documents },
    signal,
  });
  if (!reponse.ok) {
    const charge = await reponse.json().catch(() => null);
    throw new ErreurAssistant(
      (charge as { detail?: string } | null)?.detail ?? "L'assistant n'a pas pu répondre",
      reponse.status
    );
  }
  return reponse;
}

export async function lireConnexion(base = BASE_PAR_DEFAUT): Promise<EtatConnexion> {
  return json(await apiFetch(`${base}/connexion`));
}

export async function brancherConnexion(
  jeton: string,
  base = BASE_PAR_DEFAUT
): Promise<EtatConnexion> {
  return json(await apiFetch(`${base}/connexion`, { method: "PUT", body: { jeton } }));
}

export async function revoquerConnexion(base = BASE_PAR_DEFAUT): Promise<EtatConnexion> {
  return json(await apiFetch(`${base}/connexion`, { method: "DELETE" }));
}
