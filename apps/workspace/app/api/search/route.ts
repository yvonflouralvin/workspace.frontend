import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { globalSearchHandler } from "@repo/network/server";

const AUTH_API_URL = process.env.AUTH_API_URL!;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const cookieStore = await cookies();
  return globalSearchHandler(q, cookieStore.toString(), AUTH_API_URL);
}
