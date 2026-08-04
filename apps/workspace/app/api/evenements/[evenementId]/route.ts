import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ evenementId: string }> }
) {
  const { evenementId } = await params;
  return forwardToBackend(request, PROJECTS_API_URL, `/evenements/${evenementId}`);
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ evenementId: string }> }
) {
  const { evenementId } = await params;
  return forwardToBackend(request, PROJECTS_API_URL, `/evenements/${evenementId}`);
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ evenementId: string }> }
) {
  const { evenementId } = await params;
  return forwardToBackend(request, PROJECTS_API_URL, `/evenements/${evenementId}`);
}
