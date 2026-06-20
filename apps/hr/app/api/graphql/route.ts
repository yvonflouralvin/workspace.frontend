import { NextRequest } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const GRAPHQL_API_URL = process.env.GRAPHQL_API_URL!;

export async function POST(request: NextRequest) {
  return forwardToBackend(request, GRAPHQL_API_URL, "/graphql");
}
