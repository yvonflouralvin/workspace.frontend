import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, DASHBOARD_API_URL, "/dashboard/boards");
}

export async function POST(request: NextRequest) {
  return forwardToBackend(request, DASHBOARD_API_URL, "/dashboard/boards");
}
