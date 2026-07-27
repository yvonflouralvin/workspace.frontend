import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

// Les trois mesures partagent une route : elles ont la même forme d'accès et le
// même gardiennage côté backend.
const MESURES = new Set(["flux", "debit", "flux-cumule"]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mesure: string }> }
) {
  const { id, mesure } = await params;
  if (!MESURES.has(mesure)) {
    return new Response(JSON.stringify({ detail: "Mesure inconnue" }), { status: 404 });
  }
  const query = request.nextUrl.search;
  return forwardToBackend(request, PROJECTS_API_URL, `/phases/${id}/metriques/${mesure}${query}`);
}
