import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const HR_API_URL = process.env.HR_API_URL!;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return forwardToBackend(request, HR_API_URL, `/hr/employees/${id}/account-link/check`);
}
