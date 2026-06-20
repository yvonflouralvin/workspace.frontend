import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const HR_API_URL = process.env.HR_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, HR_API_URL, "/hr/employees");
}

export async function POST(request: NextRequest) {
  return forwardToBackend(request, HR_API_URL, "/hr/employees");
}
