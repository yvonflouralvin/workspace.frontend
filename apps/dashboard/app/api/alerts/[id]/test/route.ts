import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL!;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forwardToBackend(request, DASHBOARD_API_URL, `/dashboard/alerts/${id}/test`);
}
