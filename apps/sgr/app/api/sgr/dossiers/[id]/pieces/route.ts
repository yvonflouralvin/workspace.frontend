import { NextRequest, NextResponse } from "next/server";

const SGR_API_URL = process.env.SGR_API_URL!;

/** Dépôt d'une pièce — body multipart.
 *
 *  Pas de JSON à chiffrer : on relaie les octets bruts, comme les autres
 *  téléversements du monorepo. Cette route est plus spécifique que le
 *  relais générique, elle passe donc devant.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cle = new URL(request.url).searchParams.get("cle_piece") ?? "";
  const res = await fetch(
    `${SGR_API_URL}/dossiers/${id}/pieces?cle_piece=${encodeURIComponent(cle)}`,
    {
      method: "POST",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        "content-type": request.headers.get("content-type") ?? "",
      },
      body: await request.arrayBuffer(),
    }
  );
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
