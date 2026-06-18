import { NextRequest } from "next/server";
import { forwardToAuthApi } from "@/app/lib/server/proxy";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  return forwardToAuthApi(request, `/auth/workspaces/${workspaceId}`);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  return forwardToAuthApi(request, `/auth/workspaces/${workspaceId}`);
}
