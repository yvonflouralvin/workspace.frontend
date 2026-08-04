import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ jalonId: string }> }) {
  const { jalonId } = await params;
  return forwardToBackend(request, PROJECTS_API_URL, `/jalons/${jalonId}`);
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ jalonId: string }> }) {
  const { jalonId } = await params;
  return forwardToBackend(request, PROJECTS_API_URL, `/jalons/${jalonId}`);
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ jalonId: string }> }) {
  const { jalonId } = await params;
  return forwardToBackend(request, PROJECTS_API_URL, `/jalons/${jalonId}`);
}
