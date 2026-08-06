import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const API = process.env.OPERATIONS_API_URL!;

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return forwardToBackend(request, API, `/plannings/${id}`);
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return forwardToBackend(request, API, `/plannings/${id}`);
}
