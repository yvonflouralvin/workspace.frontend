import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const HOSTO_API_URL = process.env.HOSTO_API_URL!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; code: string }> },
) {
  const { id, code } = await params;
  const qs = request.nextUrl.search;
  return forwardToBackend(
    request,
    HOSTO_API_URL,
    `/hosto/patients/${id}/lab-parameters/${encodeURIComponent(code)}/series${qs}`,
  );
}
