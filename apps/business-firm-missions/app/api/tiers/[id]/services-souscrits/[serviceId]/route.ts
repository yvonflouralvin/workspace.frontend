import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const TIERS_API_URL = process.env.TIERS_API_URL!;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; serviceId: string }> }) {
  const { id, serviceId } = await params;
  return forwardToBackend(request, TIERS_API_URL, `/tiers/${id}/services-souscrits/${serviceId}`);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; serviceId: string }> }) {
  const { id, serviceId } = await params;
  return forwardToBackend(request, TIERS_API_URL, `/tiers/${id}/services-souscrits/${serviceId}`);
}
