import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(request, PROJECTS_API_URL, `/formulaires/${id}/collaborateurs`);
}
