import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.redirect(
    new URL(process.env.NEXT_PUBLIC_AUTH_API_AUTH_DOMAIN!)
  );
  response.cookies.delete("access_token");
  response.cookies.delete("refresh_token");
  return response;
}
