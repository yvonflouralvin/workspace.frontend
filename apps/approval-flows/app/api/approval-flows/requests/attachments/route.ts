import { NextRequest, NextResponse } from "next/server";

const APPROVAL_FLOWS_API_URL = process.env.APPROVAL_FLOWS_API_URL!;

// Body multipart (upload de fichier) — pas de JSON à chiffrer, même exception que
// les routes OAuth et l'upload de documents `hr` : on bypass @repo/network et on
// forward les octets bruts.
export async function POST(request: NextRequest) {
  const res = await fetch(`${APPROVAL_FLOWS_API_URL}/approval-flows/requests/attachments`, {
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
