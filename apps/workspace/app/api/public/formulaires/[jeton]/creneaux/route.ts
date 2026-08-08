import { NextRequest, NextResponse } from "next/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

// SANS SESSION : le jeton est l'autorisation. Le backend va chercher les
// occupations auprès de l'application qui a posé la question — le navigateur
// ne voit ni son adresse ni le secret de service.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jeton: string }> },
) {
  const { jeton } = await params;
  const res = await fetch(
    `${PROJECTS_API_URL}/public/formulaires/${encodeURIComponent(jeton)}/creneaux${request.nextUrl.search}`,
  );
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
