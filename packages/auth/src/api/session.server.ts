// packages/auth/api/session.server.ts

import { cookies, headers } from "next/headers.js";
import { redirect } from "next/navigation.js";
import { configReseauDepuisEnv } from "@repo/network/config";

import { SessionResponse } from "../types/session.js";

const EMPTY_SESSION: SessionResponse = {
  authenticated: false,
  user: null,
  active_workspace: null,
  workspaces: [],
  groups: [],
  permissions: [],
};

export async function getServerSession(): Promise<SessionResponse> {
  // Posée sur TOUS les chemins de retour, y compris les sessions vides : un
  // écran anonyme chiffre lui aussi ses appels, et c'est justement là que la
  // clé manquante se voyait — à la connexion.
  const config_reseau = configReseauDepuisEnv();
  const vide = { ...EMPTY_SESSION, config_reseau };

  // LIRE LES COOKIES EN PREMIER, avant tout retour anticipé.
  //
  // Ce n'est pas un détail de style : c'est cet accès qui dit à Next que la
  // page dépend de la requête. Derrière un `if (!AUTH_API_URL)`, il ne se
  // produisait pas à la construction — où la variable est absente, puisque
  // turbo filtre l'environnement des tâches — et Next PRÉRENDAIT alors des
  // écrans par utilisateur. Vérifié sur `tiers` : /tiers, /tiers/new et
  // /parametres étaient servis depuis la construction (`x-nextjs-prerender: 1`),
  // cookie ou pas. Le layout ne se rejouait jamais, donc rien de ce qu'il lit
  // dans son environnement n'atteignait le navigateur.
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const AUTH_API_URL = process.env.AUTH_API_URL;
  if (!AUTH_API_URL) return vide;
  if (!cookieHeader) return vide;

  try {
    const response = await fetch(`${AUTH_API_URL}/auth/session`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });

    if (!response.ok) return vide;

    return { ...(await response.json()), config_reseau };
  } catch {
    return vide;
  }
}

/** La session, ou l'écran de connexion.
 *
 *  Treize apps sur quatorze se contentaient de `getServerSession()` : une
 *  session expirée y rendait donc la coquille de l'app avec une session vide —
 *  menus muets, listes en erreur — au lieu de renvoyer à la connexion. On
 *  croyait à une panne.
 *
 *  Le chemin courant part en `retour` quand le proxy de l'app le pose
 *  (`x-pathname`) : on revient là où l'on était plutôt que sur un accueil
 *  générique. Sans lui, la connexion décidera où atterrir, ce qui reste juste.
 */
export async function exigerSession(
  options: { publique?: boolean } = {},
): Promise<SessionResponse> {
  const session = await getServerSession();
  // Une page publique se lit SANS compte : un formulaire ouvert, un portail de
  // candidature. L'y renvoyer à la connexion viderait la porte de son sens.
  if (session.authenticated || options.publique) return session;

  const domaineAuth =
    process.env.AUTH_API_AUTH_DOMAIN ?? process.env.NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN;
  // Sans domaine configuré on ne redirige pas : envoyer sur une adresse
  // inventée serait pire que de rendre un écran vide.
  if (!domaineAuth) return session;

  const entetes = await headers();
  const chemin = entetes.get("x-pathname");
  const hote = entetes.get("host");
  const protocole = entetes.get("x-forwarded-proto") ?? "https";
  const retour = chemin && hote ? `${protocole}://${hote}${chemin}` : null;

  redirect(retour ? `${domaineAuth}/?retour=${encodeURIComponent(retour)}` : domaineAuth);
}
