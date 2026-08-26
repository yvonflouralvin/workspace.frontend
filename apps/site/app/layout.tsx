import type { ReactNode } from "react";
import "./globals.css";

/** Volontairement nu.
 *
 *  Pas de `SessionProvider`, pas de police de la plateforme, pas de jetons du
 *  design system : cette coque est celle du site d'un client, pas la nôtre. La
 *  langue et le titre sont posés par la page, qui seule connaît le site
 *  qu'elle sert. */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
