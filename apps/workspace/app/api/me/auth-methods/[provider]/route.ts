import { NextRequest } from "next/server";
import { forwardToAuthApi } from "@/app/lib/server/proxy";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  return forwardToAuthApi(request, `/auth/me/auth-methods/${provider}`);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  return forwardToAuthApi(request, `/auth/me/auth-methods/${provider}`);
}
