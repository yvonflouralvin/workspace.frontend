import { NextRequest } from "next/server";
import { forwardToAuthApi } from "@/app/lib/server/proxy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  return forwardToAuthApi(request, `/auth/workspaces/${workspaceId}/members/check-email`);
}
