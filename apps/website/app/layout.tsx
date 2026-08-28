import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@repo/auth/SessionProvider";
import { exigerSession } from "@repo/auth/api/session.server";
import { AccessDenied } from "@repo/ui/AccessDenied";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Website",
  description: "Construire et publier le site web de l'organisation",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Session expirée ou absente : retour à la connexion, plutôt que la
  // coquille de l'app avec une session vide.
  const session = await exigerSession();
  const accessDenied = session.authenticated && !session.permissions.includes("website.access");
  const canSwitchTo = session.workspaces.some(
    (ws) => ws.id !== session.active_workspace?.id && ws.permissions.includes("website.access"),
  );

  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Les widgets à icônes rendent une ligature Material Symbols ; le
            canevas doit montrer la même chose que le site publié. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <SessionProvider initialSession={session}>
          {accessDenied ? (
            <AccessDenied
              appName="Website"
              workspaceName={session.active_workspace?.name}
              switcher={
                canSwitchTo ? <WorkspaceSwitcher filterPermission="website.access" /> : undefined
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
