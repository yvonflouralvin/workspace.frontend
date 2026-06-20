import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const FLASK_URL = process.env.AUTH_API_URL!;

export async function forwardToAuthApi(request: NextRequest, path: string) {
  return forwardToBackend(request, FLASK_URL, path);
}
