import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const API = process.env.OPERATIONS_API_URL!;

export async function GET(request: NextRequest, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  return forwardToBackend(request, API, `/process/${reference}`);
}

export async function PATCH(request: NextRequest, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  return forwardToBackend(request, API, `/process/${reference}`);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  return forwardToBackend(request, API, `/process/${reference}`);
}
