import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

export async function POST(request: NextRequest, { params }: { params: Promise<{ critereId: string }> }) {
  const { critereId } = await params;
  return forwardToBackend(request, PROJECTS_API_URL, `/criteres/${critereId}/deverrouiller`);
}
