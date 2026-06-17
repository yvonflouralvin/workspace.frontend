import { NextRequest } from "next/server";
import { forwardToAuthApi } from "@/app/lib/server/proxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; membershipId: string }> }
) {
  const { workspaceId, membershipId } = await params;
  return forwardToAuthApi(
    request,
    `/auth/workspaces/${workspaceId}/members/${membershipId}/groups`
  );
}
