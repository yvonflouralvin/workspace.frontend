import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ iterationId: string; taskId: string }> }
) {
  const { iterationId, taskId } = await params;
  return forwardToBackend(request, PROJECTS_API_URL, `/iterations/${iterationId}/taches/${taskId}`);
}
