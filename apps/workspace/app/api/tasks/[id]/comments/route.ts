import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Pas de query ici : `forwardToBackend` reporte DÉJÀ celle de la requête.
  // La recoller donnerait `?limite=5?limite=5` — une seule paire, valeur illisible.
  return forwardToBackend(request, PROJECTS_API_URL, `/tasks/${id}/comments`);
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(request, PROJECTS_API_URL, `/tasks/${id}/comments`);
}
