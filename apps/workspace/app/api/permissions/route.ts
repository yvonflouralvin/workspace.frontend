import { NextRequest } from "next/server";
import { forwardToAuthApi } from "@/app/lib/server/proxy";

export async function GET(request: NextRequest) {
  return forwardToAuthApi(request, "/auth/permissions");
}
