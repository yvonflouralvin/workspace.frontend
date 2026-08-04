import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

export async function GET(request: NextRequest) {
  // `forwardToBackend` reporte déjà la query de la requête : la recoller ici
  // dupliquerait les paramètres, et le premier d'entre eux arriverait collé au
  // suivant. Ça ne s'était pas vu — le dernier doublon l'emportait.
  return forwardToBackend(request, PROJECTS_API_URL, "/calendrier");
}
