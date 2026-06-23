import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const APPROVAL_FLOWS_API_URL = process.env.APPROVAL_FLOWS_API_URL!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
  return forwardToBackend(
    request,
    APPROVAL_FLOWS_API_URL,
    `/approval-flows/flows/${id}/versions/${versionId}`
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
  return forwardToBackend(
    request,
    APPROVAL_FLOWS_API_URL,
    `/approval-flows/flows/${id}/versions/${versionId}`
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const { id, versionId } = await params;
  return forwardToBackend(
    request,
    APPROVAL_FLOWS_API_URL,
    `/approval-flows/flows/${id}/versions/${versionId}`
  );
}
