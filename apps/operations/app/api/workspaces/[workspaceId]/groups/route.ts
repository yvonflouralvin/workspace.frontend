import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const AUTH_API_URL = process.env.AUTH_API_URL!;

/** Les groupes du workspace, servis au réglage de visibilité.
 *
 *  Ils viennent de `auth` : le registre des groupes n'appartient pas à cette
 *  app, et le recopier ici le ferait diverger au premier renommage. */
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ workspaceId: string }> },
) {
  const { workspaceId } = await ctx.params;
  return forwardToBackend(request, AUTH_API_URL, `/auth/workspaces/${workspaceId}/groups`);
}
