import { NextRequest } from "next/server";
import { forwardToAuthApi } from "@/app/lib/server/proxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; groupId: string }> }
) {
  const { workspaceId, groupId } = await params;
  return forwardToAuthApi(
    request,
    `/auth/workspaces/${workspaceId}/groups/${groupId}/permissions`
  );
}
