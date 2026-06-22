import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const APPROVAL_FLOWS_API_URL = process.env.APPROVAL_FLOWS_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, APPROVAL_FLOWS_API_URL, "/approval-flows/flows");
}

export async function POST(request: NextRequest) {
  return forwardToBackend(request, APPROVAL_FLOWS_API_URL, "/approval-flows/flows");
}
