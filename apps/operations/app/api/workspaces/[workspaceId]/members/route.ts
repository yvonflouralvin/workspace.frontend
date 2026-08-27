import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const AUTH_API_URL = process.env.AUTH_API_URL!;

/** L'annuaire du workspace, servi au sélecteur de collaborateurs.
 *
 *  Il vient de `auth` et non d'`operations` : le registre des membres d'un
 *  espace n'appartient pas à cette app, et le recopier ici le ferait diverger
 *  au premier départ. */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await ctx.params;
  return forwardToBackend(request, AUTH_API_URL, `/auth/workspaces/${workspaceId}/members`);
}
