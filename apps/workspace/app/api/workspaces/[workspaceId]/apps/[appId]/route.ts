import { NextRequest } from "next/server";
import { forwardToAuthApi } from "@/app/lib/server/proxy";

// `action` dans le corps plutôt que deux routes : activer et désactiver sont la
// même décision vue des deux côtés, et le serveur tranche seul ce qui est permis.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; appId: string }> }
) {
  const { workspaceId, appId } = await params;
  // Le verbe est porté par l'URL et non par le corps : `forwardToBackend`
  // retransmet le corps tel quel, il ne peut pas le relire pour router.
  const { searchParams } = new URL(request.url);
  const verbe = searchParams.get("action") === "desactiver" ? "desactiver" : "activer";
  return forwardToAuthApi(request, `/auth/workspaces/${workspaceId}/apps/${appId}/${verbe}`);
}
