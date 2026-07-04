import { NextRequest, NextResponse } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const HOSTO_API_URL = process.env.HOSTO_API_URL!;

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return forwardToBackend(request, HOSTO_API_URL, `/hosto/prescriptions/${id}`);
}

export const GET = handler;
export const PATCH = handler;

// DELETE returns 204 No Content — forwardToBackend cannot handle body-less responses in Next.js 16
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await fetch(`${HOSTO_API_URL}/hosto/prescriptions/${id}`, {
    method: "DELETE",
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });
  if (res.status === 204) {
    return new NextResponse(null, { status: 204 });
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const { encryptResponseBody } = await import("@repo/network/server");
    const data = await res.json().catch(() => ({}));
    return encryptResponseBody(data, { status: res.status });
  }
  return new NextResponse(await res.text(), { status: res.status });
}
