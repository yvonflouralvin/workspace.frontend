import { PLATFORM_APPS } from "@repo/ui/shell/platform";

const WORKSPACE_DOMAIN = process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "http://localhost:3005";

/** Où envoyer l'utilisateur après une connexion réussie.
 *
 *  On interroge la session plutôt que de deviner : c'est le backend qui a
 *  départagé les groupes, et refaire ce calcul ici le ferait diverger au
 *  premier changement de règle.
 *
 *  Toute erreur ramène sur Workspace. Une connexion réussie ne doit jamais
 *  finir sur un écran d'erreur parce qu'un raccourci est mal réglé.
 */
export async function destinationApresConnexion(): Promise<string> {
  try {
    const r = await fetch("/api/auth/session", { credentials: "include" });
    if (!r.ok) return WORKSPACE_DOMAIN;
    const session = await r.json();
    const cle: string | null = session?.accueil?.landing_app_key ?? null;
    if (!cle || cle === "workspace") return WORKSPACE_DOMAIN;
    const app = PLATFORM_APPS.find((a) => a.id === cle);
    return app?.url ?? WORKSPACE_DOMAIN;
  } catch {
    return WORKSPACE_DOMAIN;
  }
}
