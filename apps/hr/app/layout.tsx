import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from '@repo/auth/SessionProvider'
import { exigerSession } from '@repo/auth/api/session.server'
import { AccessDenied } from '@repo/ui/AccessDenied'
import { WorkspaceSwitcher } from '@repo/ui/WorkspaceSwitcher'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RH",
  description: "Module RH",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Session expirée ou absente : retour à la connexion, plutôt que la
  // coquille de l'app avec une session vide.
  const session = await exigerSession();
  const accessDenied =
    session.authenticated && !session.permissions.includes("hr.access");
  const canSwitchTo = session.workspaces.some(
    (ws) => ws.id !== session.active_workspace?.id && ws.permissions.includes("hr.access")
  );

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider initialSession={session}>
          {accessDenied ? (
            <AccessDenied
              appName="RH"
              workspaceName={session.active_workspace?.name}
              switcher={canSwitchTo ? <WorkspaceSwitcher filterPermission="hr.access" /> : undefined}
            />
          ) : (
            children
          )}
        </SessionProvider>
      </body>
    </html>
  );
}
