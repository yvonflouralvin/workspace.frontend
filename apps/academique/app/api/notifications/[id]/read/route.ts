import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const NOTIFICATIONS_API_URL = process.env.NOTIFICATIONS_API_URL!;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return forwardToBackend(request, NOTIFICATIONS_API_URL, `/notifications/${id}/read`);
}
