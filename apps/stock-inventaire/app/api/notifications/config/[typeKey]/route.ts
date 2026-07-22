import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const NOTIFICATIONS_API_URL = process.env.NOTIFICATIONS_API_URL!;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ typeKey: string }> },
) {
  const { typeKey } = await params;
  return forwardToBackend(
    request,
    NOTIFICATIONS_API_URL,
    `/notifications/config/${encodeURIComponent(typeKey)}`,
  );
}
