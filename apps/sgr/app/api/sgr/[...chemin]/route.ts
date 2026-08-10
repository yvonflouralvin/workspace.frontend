import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const SGR_API_URL = process.env.SGR_API_URL!;

/** Une seule porte vers le service SGR.
 *
 *  Une route par endpoint aurait fait trente fichiers identiques à un chemin
 *  près, qu'il aurait fallu tenir d'accord avec le backend un par un. Le BFF
 *  ne décide de rien ici : il relaie, chiffre, et laisse le service trancher.
 */
function chemin(request: NextRequest): string {
  const url = new URL(request.url);
  const suffixe = url.pathname.replace(/^\/api\/sgr/, "") || "/";
  return suffixe + url.search;
}

export async function GET(request: NextRequest) {
  return forwardToBackend(request, SGR_API_URL, chemin(request));
}
export async function POST(request: NextRequest) {
  return forwardToBackend(request, SGR_API_URL, chemin(request));
}
export async function PATCH(request: NextRequest) {
  return forwardToBackend(request, SGR_API_URL, chemin(request));
}
export async function PUT(request: NextRequest) {
  return forwardToBackend(request, SGR_API_URL, chemin(request));
}
export async function DELETE(request: NextRequest) {
  return forwardToBackend(request, SGR_API_URL, chemin(request));
}
