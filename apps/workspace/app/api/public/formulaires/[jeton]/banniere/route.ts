import { NextRequest, NextResponse } from "next/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

// SANS SESSION : c'est le premier écran d'un visiteur sur un formulaire public.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jeton: string }> }
) {
  const { jeton } = await params;
  const res = await fetch(
    `${PROJECTS_API_URL}/public/formulaires/${encodeURIComponent(jeton)}/banniere`
  );
  if (!res.ok) return NextResponse.json({ error: "not_found" }, { status: res.status });
  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: {
      "content-type": res.headers.get("content-type") ?? "image/png",
      "cache-control": "public, max-age=600",
    },
  });
}
