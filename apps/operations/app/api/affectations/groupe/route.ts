import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const API = process.env.OPERATIONS_API_URL!;

export async function POST(request: NextRequest) {
  return forwardToBackend(request, API, "/affectations/groupe");
}
