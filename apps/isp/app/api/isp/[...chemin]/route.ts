import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const ISP_API_URL = process.env.ISP_API_URL!;

/** Une seule porte vers le service SGR.
 *
 *  Une route par endpoint aurait fait trente fichiers identiques à un chemin
 *  près, qu'il aurait fallu tenir d'accord avec le backend un par un. Le BFF
 *  ne décide de rien ici : il relaie, chiffre, et laisse le service trancher.
 */
function chemin(request: NextRequest): string {
  // Le chemin SEUL : `forwardToBackend` ajoute déjà la chaîne de requête, et la
  // remettre ici la doublait — le backend refusait alors en 422, sans message.
  return new URL(request.url).pathname.replace(/^\/api\/isp/, "") || "/";
}

export async function GET(request: NextRequest) {
  return forwardToBackend(request, ISP_API_URL, chemin(request));
}
export async function POST(request: NextRequest) {
  return forwardToBackend(request, ISP_API_URL, chemin(request));
}
export async function PATCH(request: NextRequest) {
  return forwardToBackend(request, ISP_API_URL, chemin(request));
}
export async function PUT(request: NextRequest) {
  return forwardToBackend(request, ISP_API_URL, chemin(request));
}
export async function DELETE(request: NextRequest) {
  return forwardToBackend(request, ISP_API_URL, chemin(request));
}
