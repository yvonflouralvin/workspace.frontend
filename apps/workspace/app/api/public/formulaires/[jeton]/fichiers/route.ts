import { NextRequest, NextResponse } from "next/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

// Dépôt SANS SESSION : ni cookie, ni chiffrement. Le backend borne seul ce
// qu'il accepte — formulaire public et publié, type et taille de la question.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jeton: string }> }
) {
  const { jeton } = await params;
  const res = await fetch(
    `${PROJECTS_API_URL}/public/formulaires/${encodeURIComponent(jeton)}/fichiers`,
    {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type") ?? "" },
      body: await request.arrayBuffer(),
    }
  );
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
