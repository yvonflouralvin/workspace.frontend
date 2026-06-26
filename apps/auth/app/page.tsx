import { redirect } from "next/navigation";
import { getServerSession } from "@repo/auth/api/session.server";
import { LoginForm } from "./LoginForm";

const WORKSPACE_DOMAIN = process.env.WORKSPACE_DOMAIN!;

export default async function Home() {
  const session = await getServerSession();

  if (session.authenticated) {
    redirect(WORKSPACE_DOMAIN);
  }

  return <LoginForm />;
}
