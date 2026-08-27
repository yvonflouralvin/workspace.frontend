import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const API = process.env.OPERATIONS_API_URL!;

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string; reponseId: string }> },
) {
  const { id, reponseId } = await ctx.params;
  return forwardToBackend(request, API, `/executions/${id}/reponses/${reponseId}`);
}
