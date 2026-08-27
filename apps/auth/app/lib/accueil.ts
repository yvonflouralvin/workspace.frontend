import { apiFetch } from "@repo/network/client";
import { PLATFORM_APPS } from "@repo/ui/shell/platform";

const WORKSPACE_DOMAIN = process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005";

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
export async function destinationApresConnexion(): Promise<string> {
  try {
    const reponse = await apiFetch("/api/auth/session");
    if (!reponse.ok) return WORKSPACE_DOMAIN;
    const session = await reponse.json();
    const permissions: string[] = Array.isArray(session?.permissions) ? session.permissions : [];

    const cle: string | null = session?.accueil?.landing_app_key ?? null;
    if (cle) {
      const app = PLATFORM_APPS.find((a) => a.id === cle);
      // On suit le choix de l'administrateur même sans la permission : c'est
      // SON réglage, et le contourner en douce rendrait l'erreur introuvable.
      // L'app dira franchement « accès refusé », ce qui se corrige.
      if (app) return app.url;
    }

    if (accessible("workspace", permissions)) return WORKSPACE_DOMAIN;
    const repli = PLATFORM_APPS.find((a) => accessible(a.id, permissions));
    return repli?.url ?? WORKSPACE_DOMAIN;
  } catch {
    return WORKSPACE_DOMAIN;
  }
}
