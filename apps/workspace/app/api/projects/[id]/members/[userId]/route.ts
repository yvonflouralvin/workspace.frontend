import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

type Params = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id, userId } = await params;
  return forwardToBackend(request, PROJECTS_API_URL, `/projects/${id}/members/${userId}`);
}
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id, userId } = await params;
  return forwardToBackend(request, PROJECTS_API_URL, `/projects/${id}/members/${userId}`);
}
