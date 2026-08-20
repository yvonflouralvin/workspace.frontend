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
  title: "ISP",
  description: "Stages, mémoires et projets tutorés",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  const accessDenied =
    session.authenticated && !session.permissions.includes("isp.access");
  const canSwitchTo = session.workspaces.some(
    (ws) => ws.id !== session.active_workspace?.id && ws.permissions.includes("isp.access")
  );

  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SessionProvider initialSession={session}>
          {accessDenied ? (
            <AccessDenied
              appName="ISP"
              workspaceName={session.active_workspace?.name}
              switcher={
                canSwitchTo ? (
                  <WorkspaceSwitcher filterPermission="isp.access" />
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
