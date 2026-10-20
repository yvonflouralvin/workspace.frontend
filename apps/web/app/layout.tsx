import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { ConfigGlobale } from "@repo/network/ConfigGlobale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solution As A Service (SAAS)",
  description:
    "Solution As A Service — une seule plateforme, tous les modules dont votre entreprise a besoin : facturation, comptabilité, RH, missions, site web et boutique en ligne.",
};

// Rendu à la REQUÊTE : prérendue, la page exécuterait ce layout au build, où
// l'environnement du conteneur n'existe pas — `<ConfigGlobale>` déposerait
// alors des domaines vides et les boutons « Se connecter » pointeraient dans
// le vide. Le coût est nul : rien ici ne demande une base.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} h-full w-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-on-surface font-body-md">
        <ConfigGlobale />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
