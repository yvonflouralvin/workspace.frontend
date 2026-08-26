import { cookies } from "next/headers";
import { NextRequest } from "next/server";

/** Le relais de la boutique — et le SEUL endroit qui touche aux cookies.
 *
 *  Le navigateur du visiteur ne parle jamais au service `website` : il parle
 *  ici, et c'est ce serveur qui porte le secret interne. Même patron BFF que
 *  partout ailleurs sur la plateforme.
 *
 *  Deux cookies, posés sur le domaine du CLIENT :
 *
 *  - `panier` — le jeton du panier serveur. Sans lui, un panier disparaîtrait
 *    au rechargement ; avec un panier en `localStorage`, il resterait invisible
 *    au marchand, or « paniers abandonnés » est une fonctionnalité.
 *  - `session_client` — la session d'un client connecté. `httpOnly` : un jeton
 *    lisible par du script serait volé par la première injection venue, et ces
 *    pages affichent du contenu écrit par le marchand.
 */

const API = process.env.WEBSITE_API_URL ?? "http://wd_bk_website:5000";
const SECRET = process.env.INTERNAL_SERVICE_SECRET ?? "";

const COOKIE_PANIER = "panier";
const COOKIE_SESSION = "session_client";

/** Les actions autorisées, et leur route en aval.
 *
 *  Liste blanche explicite : relayer un chemin fourni par le client ferait de
 *  ce proxy une porte ouverte sur toutes les routes internes du service. */
const ACTIONS: Record<string, { chemin: string; methode: "GET" | "POST" | "PATCH" }> = {
  "panier.lire": { chemin: "/public/panier", methode: "GET" },
  "panier.ajouter": { chemin: "/public/panier", methode: "POST" },
  "panier.changer": { chemin: "/public/panier", methode: "PATCH" },
  "commande.passer": { chemin: "/public/commandes", methode: "POST" },
  "client.inscription": { chemin: "/public/clients/inscription", methode: "POST" },
  "client.connexion": { chemin: "/public/clients/connexion", methode: "POST" },
  "client.deconnexion": { chemin: "/public/clients/deconnexion", methode: "POST" },
  "abonne.inscrire": { chemin: "/public/abonnes", methode: "POST" },
};

export async function POST(requete: NextRequest) {
  const corps = (await requete.json().catch(() => ({}))) as {
    action?: string;
    donnees?: Record<string, unknown>;
  };
  const action = ACTIONS[corps.action ?? ""];
  if (!action) {
    return Response.json({ detail: "Action inconnue" }, { status: 400 });
  }

  const boite = await cookies();
  const hote = (requete.headers.get("host") ?? "").split(":")[0]!.toLowerCase();
  const params = new URLSearchParams();
  const jetonPanier = boite.get(COOKIE_PANIER)?.value;
  const jetonSession = boite.get(COOKIE_SESSION)?.value;

  if (jetonPanier) {
    params.set(corps.action?.startsWith("client.") ? "jeton_panier" : "jeton", jetonPanier);
  }
  if (jetonSession) params.set("jeton_session", jetonSession);
  if (action.methode === "GET") params.set("hote", hote);

  const init: RequestInit = {
    method: action.methode,
    headers: { "X-Internal-Secret": SECRET, "Content-Type": "application/json" },
    cache: "no-store",
  };
  if (action.methode !== "GET") {
    init.body = JSON.stringify({ ...(corps.donnees ?? {}), hote });
  }

  const reponse = await fetch(`${API}${action.chemin}?${params}`, init);
  const texte = await reponse.text();
  const charge = texte ? JSON.parse(texte) : null;

  // `Secure` seulement en HTTPS. Un cookie `Secure` posé sur une origine HTTP
  // est accepté puis JAMAIS renvoyé : le panier paraîtrait se vider tout seul,
  // et seulement en développement — le pire endroit pour découvrir ça.
  const securise =
    (requete.headers.get("x-forwarded-proto") ?? "").split(",")[0]!.trim() === "https";

  const sortie = Response.json(charge ?? {}, { status: reponse.status });

  if (reponse.ok && charge) {
    // Le jeton de panier voyage dans la réponse : on le pose (ou le remplace,
    // car une fusion à la connexion peut le changer).
    const jeton = charge.jeton ?? charge.panier?.jeton;
    if (typeof jeton === "string" && jeton) {
      sortie.headers.append(
        "Set-Cookie",
        cookie(COOKIE_PANIER, jeton, 60 * 60 * 24 * 60, securise),
      );
    }
    if (typeof charge.jeton_session === "string") {
      sortie.headers.append(
        "Set-Cookie",
        cookie(COOKIE_SESSION, charge.jeton_session, 60 * 60 * 24 * 30, securise),
      );
    }
    if (corps.action === "client.deconnexion") {
      sortie.headers.append("Set-Cookie", cookie(COOKIE_SESSION, "", 0, securise));
    }
  }

  return sortie;
}

function cookie(nom: string, valeur: string, maxAge: number, securise: boolean): string {
  // `SameSite=Lax` : le panier doit survivre à un retour depuis une page de
  // paiement externe, mais aucune requête inter-site ne doit l'emporter.
  const morceaux = [
    `${nom}=${encodeURIComponent(valeur)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];
  if (securise) morceaux.push("Secure");
  return morceaux.join("; ");
}
