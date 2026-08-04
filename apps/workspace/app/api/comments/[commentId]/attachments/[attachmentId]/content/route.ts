import { NextRequest, NextResponse } from "next/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

// Réponse binaire : pass-through brut. On relaie le `content-disposition` du
// backend sans le réécrire — c'est LUI qui décide de ce qui s'affiche dans le
// navigateur et de ce qui se télécharge.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string; attachmentId: string }> }
) {
  const { commentId, attachmentId } = await params;
  const res = await fetch(
    `${PROJECTS_API_URL}/comments/${commentId}/attachments/${attachmentId}/content`,
    { headers: { cookie: request.headers.get("cookie") ?? "" } }
  );
  if (!res.ok) {
    return NextResponse.json({ error: "not_found" }, { status: res.status });
  }
  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/octet-stream",
      "content-disposition": res.headers.get("content-disposition") ?? "attachment",
      "cache-control": "private, max-age=300",
    },
  });
}
