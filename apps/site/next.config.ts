import type { NextConfig } from "next";

// Cette app sert des VISITEURS ANONYMES sur des noms d'hôte arbitraires : ceux
// que les clients achètent chez leur fournisseur. On ne peut donc pas énumérer
// ses origines, et `allowedDevOrigins` — que Next 16 applique en mode dev — n'a
// aucune valeur qui conviendrait. C'est pour cette raison que le conteneur la
// lance en mode PRODUCTION (`next build && next start`) même dans la stack de
// développement : `allowedDevOrigins` ne s'applique qu'au serveur de dev.
//
// Ne PAS « corriger » la commande du compose en `next dev` : la page rendrait
// son HTML côté serveur et n'hydraterait jamais.
const nextConfig: NextConfig = {
  transpilePackages: ["@repo/site-widgets"],
};

export default nextConfig;
