import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const AUTH_API_URL = process.env.AUTH_API_URL!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const { workspaceId } = await params;
  return forwardToBackend(request, AUTH_API_URL, `/auth/workspaces/${workspaceId}/members`);
}
