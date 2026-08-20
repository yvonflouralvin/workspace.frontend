import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const ACADEMIQUE_API_URL = process.env.ACADEMIQUE_API_URL!;

/** Une seule porte vers le service Academia.
 *
 *  Une route par endpoint aurait fait trente fichiers identiques à un chemin
 *  près, qu'il aurait fallu tenir d'accord avec le backend un par un. Le BFF
 *  ne décide de rien ici : il relaie, chiffre, et laisse le service trancher.
 */
function chemin(request: NextRequest): string {
  // **Le chemin SEUL, sans la chaîne de requête.** `forwardToBackend` y ajoute
  // déjà `new URL(request.url).search` ; la remettre ici produisait
  // `?session=NORMALE?session=NORMALE`, que le backend refuse en 422. Le
  // symptôme était trompeur : les routes sans paramètre marchaient, et seules
  // celles qui en portent tombaient — sans message dans l'écran.
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
