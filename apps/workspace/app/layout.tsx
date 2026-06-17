import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from '@repo/auth/SessionProvider'
import { getServerSession } from '@repo/auth/api/session.server'
import { AccessDenied } from '@repo/ui/AccessDenied'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workspace",
  description: "Built for Scale. Designed for Speed.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  const accessDenied =
    session.authenticated && !session.permissions.includes("workspace.access");

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {accessDenied ? (
          <AccessDenied appName="Workspace" />
        ) : (
          <SessionProvider initialSession={session}>{children}</SessionProvider>
        )}
      </body>
    </html>
  );
}
