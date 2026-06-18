import { NextRequest } from "next/server";
import { forwardToAuthApi } from "@/app/lib/server/proxy";

export async function POST(request: NextRequest) {
  return forwardToAuthApi(request, `/auth/switch-workspace`);
}
