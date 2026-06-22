import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const APPROVAL_FLOWS_API_URL = process.env.APPROVAL_FLOWS_API_URL!;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepKey: string }> }
) {
  const { id, stepKey } = await params;
  return forwardToBackend(
    request,
    APPROVAL_FLOWS_API_URL,
    `/approval-flows/flows/${id}/bindings/${stepKey}`
  );
}
