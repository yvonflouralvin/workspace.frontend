import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConfigReseau } from "@repo/network/ConfigReseau";
import "./globals.css";
import { ConfigGlobale } from "@repo/network/ConfigGlobale";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// POURQUOI FORCER LE RENDU À LA REQUÊTE
//
// Une page prérendue exécute ce layout AU BUILD, où l'environnement du
// conteneur n'existe pas : la connexion et l'inscription étaient servies en HTML
// figé, sans la clé. Lire la configuration au démarrage impose donc de rendre à
// la requête. Le coût est nul ici — ces pages sont déjà par-utilisateur et rien
// n'y est mutualisable.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign-in",
  description: "Saas Workspace - Do more with less!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full w-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ConfigGlobale />
        {/* Le navigateur ne peut pas lire l'environnement du conteneur, et une
            variable NEXT_PUBLIC_* est figée dans le bundle à la compilation —
            donc absente d'une image construite une fois pour tous les clients.
            Ce layout, qui s'exécute au serveur, lit son environnement À CHAQUE
            RENDU et dépose la configuration pour le code client. */}
        <ConfigReseau
          mode={process.env.NETWORK_ENCRYPTION}
          cle={process.env.NETWORK_ENCRYPTION_KEY}
        >
          {children}
        </ConfigReseau>
      </body>
    </html>
  );
}
