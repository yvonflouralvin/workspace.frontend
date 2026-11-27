import { apiFetch } from "@repo/network/client";
import { PLATFORM_APPS } from "@repo/ui/shell/platform";
import { domaineDepose } from "@repo/network/config";

/** Les origines légitimes qui n'ont pas d'entrée dans `PLATFORM_APPS`.
 *
 *  Lues par `domaineDepose` et non par `process.env.NEXT_PUBLIC_*` :
 *  `retourDeConfiance` tourne des DEUX côtés — sur le serveur depuis
 *  `page.tsx`, dans le navigateur depuis `destinationApresConnexion` — et une
 *  variable `NEXT_PUBLIC_*` est figée dans le bundle à la compilation. Une
 *  image construite une fois pour tous les clients porterait le domaine du
 *  premier.
 *
 *  Une FONCTION et non une constante de module : lue à l'appel, elle ne
 *  dépend pas de l'ordre entre l'évaluation de ce module et le dépôt de la
 *  configuration. `WORKSPACE_DOMAIN` ci-dessous prend ce risque pour des
 *  raisons historiques ; ce n'est pas une raison de le reprendre. */
function autresSurfaces(): (string | undefined)[] {
  return [domaineDepose("hosto_flutter")];
}

const WORKSPACE_DOMAIN =
  process.env.WORKSPACE_APP_URL ??
  domaineDepose("workspace") ?? process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ??
  "http://localhost:3005";

interface SessionLue {
  accueil?: { landing_app_key?: string | null };
  permissions?: string[];
}

/** La permission qui ouvre la porte d'une app : `<id>.access`.
 *
 *  Convention de la plateforme, tenue par `academique`, `operations`,
 *  `website`, `hosto`… Les rares apps qui n'en déclarent pas ne gagnent
 *  simplement jamais le repli — c'est un dernier recours, pas un routage. */
function accessible(appId: string, permissions: string[]): boolean {
  return permissions.includes(`${appId}.access`);
}

/** Où envoyer l'utilisateur après une connexion réussie.
 *
 *  On interroge la session plutôt que de deviner : c'est le backend qui a
 *  départagé les groupes, et refaire ce calcul ici le ferait diverger au
 *  premier changement de règle.
 *
 *  **Par `apiFetch` et non `fetch`.** Le BFF chiffre ses réponses
 *  (`@repo/network`) : un `fetch` nu recevait l'enveloppe chiffrée,
 *  `session.accueil` était donc toujours `undefined`, et TOUT LE MONDE partait
 *  sur Workspace — y compris ceux dont le groupe désignait une autre app, et
 *  qui n'ont pas accès à Workspace. Le repli silencieux cachait la panne.
 *
 *  Le repli, justement, ne renvoie plus aveuglément sur Workspace : on n'y
 *  envoie quelqu'un que s'il peut y entrer. Sinon on prend la première app
 *  qu'il a le droit d'ouvrir. Atterrir sur un écran « accès refusé » après une
 *  connexion réussie donne l'impression que le compte est cassé.
 */
/** L'adresse d'où l'on a été renvoyé, quand elle est digne de confiance.
 *
 *  Une session qui expire renvoie ici avec `?retour=`, pour ramener la
 *  personne là où elle travaillait plutôt que sur un accueil générique. Mais
 *  une adresse qui arrive par l'URL vient de n'importe où : on ne la suit que
 *  si elle désigne une app de la plateforme. Sans ce filtre, un lien
 *  `?retour=https://ailleurs` ferait de l'écran de connexion un tremplin.
 */
export function retourDeConfiance(brut: string | null): string | null {
  if (!brut) return null;
  try {
    const cible = new URL(brut);
    const connues = [
      WORKSPACE_DOMAIN,
      ...PLATFORM_APPS.map((a) => a.url),
      // Les surfaces de la plateforme qui ne sont pas dans le sélecteur
      // d'applications. `PLATFORM_APPS` répond à « où peut-on aller », cette
      // liste à « d'où peut-on revenir » : ce n'est pas la même question, et
      // l'interface Flutter du module hospitalier est le premier cas — un
      // pilote qu'on ne montre à personne mais vers lequel il faut savoir
      // revenir après une connexion. Sans cette ligne, la personne se
      // connecte, réussit, et atterrit sur une autre application.
      ...autresSurfaces(),
    ].filter((u): u is string => Boolean(u));
    return connues.some((connue) => {
      try {
        return new URL(connue).origin === cible.origin;
      } catch {
        return false;
      }
    })
      ? cible.toString()
      : null;
  } catch {
    return null;
  }
}

export function destinationDepuisSession(session: SessionLue): string {
  const permissions = Array.isArray(session?.permissions) ? session.permissions : [];

  const cle = session?.accueil?.landing_app_key ?? null;
  if (cle) {
    const app = PLATFORM_APPS.find((a) => a.id === cle);
    // On suit le choix de l'administrateur même sans la permission : c'est SON
    // réglage, et le contourner en douce rendrait l'erreur introuvable. L'app
    // dira franchement « accès refusé », ce qui se corrige.
    if (app) return app.url;
  }

  if (accessible("workspace", permissions)) return WORKSPACE_DOMAIN;
  const repli = PLATFORM_APPS.find((a) => accessible(a.id, permissions));
  return repli?.url ?? WORKSPACE_DOMAIN;
}

export async function destinationApresConnexion(): Promise<string> {
  const retour = retourDeConfiance(
    new URLSearchParams(window.location.search).get("retour"),
  );
  try {
    const reponse = await apiFetch("/api/auth/session");
    if (!reponse.ok) return retour ?? WORKSPACE_DOMAIN;
    // Reprendre où l'on en était l'emporte sur la page de démarrage : celle-ci
    // dit où commencer, pas où revenir.
    return retour ?? destinationDepuisSession(await reponse.json());
  } catch {
    return retour ?? WORKSPACE_DOMAIN;
  }
}
