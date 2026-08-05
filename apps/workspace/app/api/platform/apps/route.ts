import { NextRequest } from "next/server";
import { forwardToAuthApi } from "@/app/lib/server/proxy";

export async function GET(request: NextRequest) {
  return forwardToAuthApi(request, "/auth/platform/apps");
}

export async function PATCH(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return forwardToAuthApi(request, `/auth/platform/apps/${searchParams.get("id")}`);
}
