import { NextRequest } from "next/server";
import { forwardStreamToBackend } from "@repo/network/server";

const AGENT_API_URL = process.env.AGENT_API_URL!;

// Relais de FLUX, pas de JSON : la réponse arrive mot à mot et doit repartir
// mot à mot. `forwardToBackend` la lirait en entier avant de la rendre.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return forwardStreamToBackend(request, AGENT_API_URL, `/agent/conversations/${id}/messages`);
}
