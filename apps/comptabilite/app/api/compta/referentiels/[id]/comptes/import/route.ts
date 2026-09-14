import { NextRequest, NextResponse } from "next/server";

const COMPTABILITE_API_URL = process.env.COMPTABILITE_API_URL!;

// Body multipart (upload de fichier) — pas de JSON à chiffrer, même exception que
// les routes OAuth et l'upload de documents RH : on bypass @repo/network et on
// forward les octets bruts.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${COMPTABILITE_API_URL}/compta/referentiels/${id}/comptes/import`, {
    method: "POST",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      "content-type": request.headers.get("content-type") ?? "",
    },
    body: await request.arrayBuffer(),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
