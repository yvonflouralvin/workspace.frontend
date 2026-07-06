import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const STOCK_API_URL = process.env.STOCK_API_URL!;

export async function GET(request: NextRequest) {
  return forwardToBackend(request, STOCK_API_URL, "/items/search");
}
