import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, PROJECTS_API_URL, "/projects/meta");
}
