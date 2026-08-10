import type { NextConfig } from "next";

// Next 16 bloque en dev les ressources internes servies à une origine non listée.
// L'app tourne derrière nginx sur son domaine public (SGR_APP_URL).
const allowedDevOrigins = ["127.0.0.1", "localhost"];
if (process.env.SGR_APP_URL) {
  try {
    allowedDevOrigins.push(new URL(process.env.SGR_APP_URL).host);
  } catch {}
}

const nextConfig: NextConfig = {
  allowedDevOrigins,
  transpilePackages: ["@repo/ui", "@repo/network", "@repo/auth", "@repo/notifications"],
  // Pas de `output: "standalone"` : les conteneurs montent déjà `node_modules`
  // depuis l'hôte et démarrent avec `next start`. Le mode standalone fabrique
  // un serveur autonome que personne ne lance — et si on le lançait tel quel,
  // il servirait le HTML sans CSS ni JS : Next n'y copie ni `.next/static` ni
  // `public/`, c'est à l'image de le faire.
};

export default nextConfig;
