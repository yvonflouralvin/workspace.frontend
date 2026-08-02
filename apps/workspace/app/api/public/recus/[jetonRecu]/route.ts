import { NextRequest, NextResponse } from "next/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

// SANS SESSION : le jeton est l'autorisation. Il n'a été rendu qu'à celui qui
// vient d'envoyer sa réponse, et à ceux qui peuvent lire les résultats.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jetonRecu: string }> }
) {
  const { jetonRecu } = await params;
  const res = await fetch(
    `${PROJECTS_API_URL}/soumissions/recus/${encodeURIComponent(jetonRecu)}`
  );
  if (!res.ok) return NextResponse.json({ error: "not_found" }, { status: res.status });
  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": res.headers.get("content-disposition") ?? "attachment",
    },
  });
}
