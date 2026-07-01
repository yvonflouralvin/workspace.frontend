import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const HOSTO_API_URL = process.env.HOSTO_API_URL!;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> },
) {
  const { id, staffId } = await params;
  return forwardToBackend(request, HOSTO_API_URL, `/hosto/schedules/${id}/staff/${staffId}`);
}
