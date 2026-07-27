import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

type Params = { params: Promise<{ id: string; groupId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id, groupId } = await params;
  return forwardToBackend(request, PROJECTS_API_URL, `/projects/${id}/groups/${groupId}`);
}
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id, groupId } = await params;
  return forwardToBackend(request, PROJECTS_API_URL, `/projects/${id}/groups/${groupId}`);
}
