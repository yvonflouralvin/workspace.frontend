import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const NOTIFICATIONS_API_URL = process.env.NOTIFICATIONS_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, NOTIFICATIONS_API_URL, "/notifications/unread-count");
}
