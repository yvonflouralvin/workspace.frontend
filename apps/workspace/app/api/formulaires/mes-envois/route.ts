import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

/** Déclarée à part de `/api/formulaires/[id]` : « mes-envois » n'est pas un
 *  identifiant, et la route dynamique l'avalerait. */
export async function GET(request: NextRequest) {
  return forwardToBackend(request, PROJECTS_API_URL, "/formulaires/mes-envois");
}
