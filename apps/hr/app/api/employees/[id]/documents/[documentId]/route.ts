import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const HR_API_URL = process.env.HR_API_URL!;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const { id, documentId } = await params;
  return forwardToBackend(request, HR_API_URL, `/hr/employees/${id}/documents/${documentId}`);
}
