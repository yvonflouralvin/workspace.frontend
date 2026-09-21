import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@repo/auth/SessionProvider";
import { exigerSession } from "@repo/auth/api/session.server";
import { AccessDenied } from "@repo/ui/AccessDenied";
import { WorkspaceSwitcher } from "@repo/ui/WorkspaceSwitcher";
import { ACCES, PORTAIL } from "@/lib/permissions";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Business Firm Mission",
  description: "Suivi des missions et prestations pour les clients",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await exigerSession();
  // Deux portes : l'accès à l'application (l'équipe) et le portail (un contact client). Chaque écran
  // vérifie ensuite laquelle il exige — ici on refuse seulement qui n'a ni l'une ni l'autre.
  const accessDenied =
    session.authenticated &&
    !session.permissions.includes(ACCES) &&
    !session.permissions.includes(PORTAIL);
  const canSwitchTo = session.workspaces.some(
    (ws) => ws.id !== session.active_workspace?.id && ws.permissions.includes(ACCES)
  );

  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SessionProvider initialSession={session}>
          {accessDenied ? (
            <AccessDenied
              appName="Business Firm Mission"
              workspaceName={session.active_workspace?.name}
              switcher={
                canSwitchTo ? (
                  <WorkspaceSwitcher filterPermission="business_firm_missions.access" />
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
