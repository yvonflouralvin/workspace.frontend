import { redirect } from "next/navigation";
import { getServerSession } from "@repo/auth/api/session.server";
import { LoginForm } from "./LoginForm";

// URL absolue (avec schéma) obligatoire : `redirect()` avec un host nu serait
// interprété comme un chemin relatif (→ auth-dev.saas.cd/workspace-dev.saas.cd).
const WORKSPACE_URL =
  process.env.WORKSPACE_APP_URL ??
  process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ??
  "http://localhost:3005";

export default async function Home() {
  const session = await getServerSession();

  if (session.authenticated) {
    redirect(WORKSPACE_URL);
  }

  return <LoginForm />;
}
