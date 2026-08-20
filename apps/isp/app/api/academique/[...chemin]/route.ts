import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const ACADEMIQUE_API_URL = process.env.ACADEMIQUE_API_URL!;

/** Une seule porte vers le service Academia, consommé par l'ISP.
 *
 *  Une route par endpoint aurait fait trente fichiers identiques à un chemin
 *  près, qu'il aurait fallu tenir d'accord avec le backend un par un. Le BFF
 *  ne décide de rien ici : il relaie, chiffre, et laisse le service trancher.
 */
function chemin(request: NextRequest): string {
  // Le préfixe retiré est celui de CETTE route (`/api/academique`), pas
  // `/api/isp` : la copie initiale retirait l'autre, et le chemin partait donc
  // au backend avec son préfixe encore dessus.
  //
  // Le chemin SEUL, aussi : `forwardToBackend` ajoute déjà la chaîne de requête,
  // et la remettre ici la doublait — refus en 422, sans message à l'écran.
  return new URL(request.url).pathname.replace(/^\/api\/academique/, "") || "/";
}

export async function GET(request: NextRequest) {
  return forwardToBackend(request, ACADEMIQUE_API_URL, chemin(request));
}
export async function POST(request: NextRequest) {
  return forwardToBackend(request, ACADEMIQUE_API_URL, chemin(request));
}
export async function PATCH(request: NextRequest) {
  return forwardToBackend(request, ACADEMIQUE_API_URL, chemin(request));
}
export async function PUT(request: NextRequest) {
  return forwardToBackend(request, ACADEMIQUE_API_URL, chemin(request));
}
export async function DELETE(request: NextRequest) {
  return forwardToBackend(request, ACADEMIQUE_API_URL, chemin(request));
}
