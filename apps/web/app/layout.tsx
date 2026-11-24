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

const DESCRIPTION =
  "Une seule plateforme pour toute l'entreprise : facturation, comptabilité, ressources humaines, projets, site web — et des collaborateurs virtuels qui s'en servent pour vous. Conçue et opérée en République démocratique du Congo.";

export const metadata: Metadata = {
  // LE GABARIT ÉVITE LA RÉPÉTITION DANS L'ONGLET. Chaque page donne son
  // propre titre court, et le nom de l'éditeur est ajouté ici — une fois.
  title: {
    default: "Solution As A Service — un logiciel pour toute l'entreprise",
    template: "%s",
  },
  description: DESCRIPTION,
  applicationName: "Solution As A Service",
  // L'APERÇU D'UN LIEN PARTAGÉ. Sans ces champs, un lien collé dans une
  // conversation n'affiche qu'une adresse : c'est la première impression du
  // site pour qui le reçoit, et elle se joue hors du site.
  openGraph: {
    type: "website",
    locale: "fr_CD",
    siteName: "Solution As A Service",
    title: "Un logiciel pour toute l'entreprise. Et des collaborateurs qui s'en servent.",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Un logiciel pour toute l'entreprise. Et des collaborateurs qui s'en servent.",
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
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
