import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const APPROVAL_FLOWS_API_URL = process.env.APPROVAL_FLOWS_API_URL!;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return forwardToBackend(request, APPROVAL_FLOWS_API_URL, `/approval-flows/requests/${id}/decide`);
}
