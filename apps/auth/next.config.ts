import type { NextConfig } from "next";

// En dev, Next 16 bloque les ressources internes (RSC/HMR/chunks) servies à une
// origine non listée. L'app est servie derrière nginx sur son domaine public
// (AUTH_APP_URL) : sans lui ici, le client n'hydrate pas.
const allowedDevOrigins = ["127.0.0.1", "localhost"];
if (process.env.AUTH_APP_URL) {
  try {
    allowedDevOrigins.push(new URL(process.env.AUTH_APP_URL).host);
  } catch {}
}

const nextConfig: NextConfig = {
  allowedDevOrigins,
  transpilePackages: ["@repo/network", "@repo/auth"],
  // Pas de `output: "standalone"` : les conteneurs montent déjà `node_modules`
  // depuis l'hôte et démarrent avec `next start`. Le mode standalone fabrique
  // un serveur autonome que personne ne lance — et si on le lançait tel quel,
  // il servirait le HTML sans CSS ni JS : Next n'y copie ni `.next/static` ni
  // `public/`, c'est à l'image de le faire.
};

export default nextConfig;
