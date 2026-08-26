import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const WEBSITE_API_URL = process.env.WEBSITE_API_URL!;

/** Une seule porte vers le service Website. */
function chemin(request: NextRequest): string {
  // Le chemin SEUL, sans la chaîne de requête : `forwardToBackend` y ajoute
  // déjà `new URL(request.url).search`. La remettre ici la doublerait.
  return new URL(request.url).pathname.replace(/^\/api\/website/, "") || "/";
}

export async function GET(request: NextRequest) {
  return forwardToBackend(request, WEBSITE_API_URL, chemin(request));
}
export async function POST(request: NextRequest) {
  return forwardToBackend(request, WEBSITE_API_URL, chemin(request));
}
export async function PATCH(request: NextRequest) {
  return forwardToBackend(request, WEBSITE_API_URL, chemin(request));
}
export async function PUT(request: NextRequest) {
  return forwardToBackend(request, WEBSITE_API_URL, chemin(request));
}
export async function DELETE(request: NextRequest) {
  return forwardToBackend(request, WEBSITE_API_URL, chemin(request));
}
