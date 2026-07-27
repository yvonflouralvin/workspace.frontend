import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

export async function GET(request: NextRequest) {
  // `forwardToBackend` transmet DÉJÀ la chaîne de requête d'origine
  // (packages/network/src/server.ts) : la rajouter ici la doublerait —
  // `?pas=jour?pas=jour`, que le backend refuse en 422.
  return forwardToBackend(request, PROJECTS_API_URL, `/tasks/mine`);
}
