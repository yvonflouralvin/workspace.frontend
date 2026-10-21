import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const AGENT_API_URL = process.env.AGENT_API_URL!;

// La décision du membre sur une écriture que l'assistant veut faire. Requête à
// part du flux : le tour est suspendu dans un autre appel, à attendre
// précisément celle-ci.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; demandeId: string }> },
) {
  const { id, demandeId } = await params;
  return forwardToBackend(
    request,
    AGENT_API_URL,
    `/agent/conversations/${id}/confirmations/${demandeId}`,
  );
}
