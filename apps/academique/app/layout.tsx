import { headers } from "next/headers";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@repo/auth/SessionProvider";
import { getServerSession } from "@repo/auth/api/session.server";
import { AccessDenied } from "@repo/ui/AccessDenied";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Academia",
  description: "Structure académique, années, étudiants et inscriptions",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // La page de candidature est PUBLIQUE : un candidat n'a pas de compte, et un
  // agent connecté ailleurs qui clique sur le lien ne doit pas se voir opposer
  // « accès refusé » — il n'a rien demandé d'interne.
  const chemin = (await headers()).get("x-pathname") ?? "";
  const publique = chemin.startsWith("/candidature/");

  const session = await getServerSession();
  const accessDenied =
    !publique && session.authenticated && !session.permissions.includes("academique.access");
  const canSwitchTo = session.workspaces.some(
    (ws) => ws.id !== session.active_workspace?.id && ws.permissions.includes("academique.access")
  );

  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SessionProvider initialSession={session}>
          {accessDenied ? (
            <AccessDenied
              appName="Academia"
              workspaceName={session.active_workspace?.name}
              switcher={
                canSwitchTo ? (
                  <WorkspaceSwitcher filterPermission="academique.access" />
                ) : undefined
              }
            />
          ) : (
            children
          )}
        </SessionProvider>
      </body>
    </html>
  );
}
