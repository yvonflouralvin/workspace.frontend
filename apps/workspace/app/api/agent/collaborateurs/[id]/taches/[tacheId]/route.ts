import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const AGENT_API_URL = process.env.AGENT_API_URL!;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tacheId: string }> },
) {
  const { id, tacheId } = await params;
  return forwardToBackend(
    request,
    AGENT_API_URL,
    `/agent/collaborateurs/${id}/taches/${tacheId}`,
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tacheId: string }> },
) {
  const { id, tacheId } = await params;
  return forwardToBackend(
    request,
    AGENT_API_URL,
    `/agent/collaborateurs/${id}/taches/${tacheId}`,
  );
}
