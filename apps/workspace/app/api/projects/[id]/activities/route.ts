import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const limit = request.nextUrl.searchParams.get("limit") ?? "50";
  return forwardToBackend(request, PROJECTS_API_URL, `/projects/${id}/activities?limit=${limit}`);
}
