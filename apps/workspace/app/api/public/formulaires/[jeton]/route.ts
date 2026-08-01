import { NextRequest, NextResponse } from "next/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

// AUCUNE SESSION ici, et donc aucun chiffrement @repo/network : le visiteur n'a
// pas de compte, il n'a pas non plus la clé. On relaie en clair, et le backend
// décide seul ce qu'il accepte de montrer derrière ce jeton.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jeton: string }> }
) {
  const { jeton } = await params;
  const res = await fetch(`${PROJECTS_API_URL}/public/formulaires/${encodeURIComponent(jeton)}`);
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
