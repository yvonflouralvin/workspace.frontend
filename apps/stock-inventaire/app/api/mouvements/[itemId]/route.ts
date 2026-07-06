import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const STOCK_API_URL = process.env.STOCK_API_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return forwardToBackend(request, STOCK_API_URL, `/items/${itemId}/mouvements`);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return forwardToBackend(request, STOCK_API_URL, `/items/${itemId}/mouvements`);
}
