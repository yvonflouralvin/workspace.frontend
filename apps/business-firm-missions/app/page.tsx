import { redirect } from "next/navigation";
import { exigerSession } from "@repo/auth/api/session.server";
import { estClientSeul } from "@/lib/permissions";

export default async function Home() {
  const session = await exigerSession();
  // Un contact client arrive sur son espace ; l'équipe sur ses clients.
  redirect(estClientSeul(session.permissions) ? "/portail" : "/clients");
}
