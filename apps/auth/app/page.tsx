import { redirect } from "next/navigation";
import { getServerSession } from "@repo/auth/api/session.server";
import { LoginForm } from "./LoginForm";
import { destinationDepuisSession, retourDeConfiance } from "./lib/accueil";

/** L'écran de connexion — ou la sortie, pour qui est déjà connecté.
 *
 *  Cette sortie renvoyait sur Workspace en dur : revenir sur `/auth` avec une
 *  session ouverte ramenait donc tout le monde sur Workspace, y compris ceux
 *  dont le groupe atterrit ailleurs et qui n'y ont aucun droit. C'est la même
 *  règle qu'après une connexion : une seule fonction la porte.
 *
 *  `redirect()` exige une URL absolue avec son schéma — un host nu serait lu
 *  comme un chemin relatif (→ auth-dev.saas.cd/workspace-dev.saas.cd).
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ retour?: string }>;
}) {
  const session = await getServerSession();

  if (session.authenticated) {
    const { retour } = await searchParams;
    redirect(retourDeConfiance(retour ?? null) ?? destinationDepuisSession(session));
  }

  return <LoginForm />;
}
