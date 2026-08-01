import { NextRequest, NextResponse } from "next/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jeton: string }> }
) {
  const { jeton } = await params;
  const res = await fetch(
    `${PROJECTS_API_URL}/public/formulaires/${encodeURIComponent(jeton)}/soumissions`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
    }
  );
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
