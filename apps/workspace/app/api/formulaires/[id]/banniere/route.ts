import { NextRequest, NextResponse } from "next/server";

const PROJECTS_API_URL = process.env.PROJECTS_API_URL!;

// Image : ni corps JSON à l'aller, ni à l'arrivée. Pass-through des octets.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${PROJECTS_API_URL}/formulaires/${id}/banniere`, {
    method: "PUT",
    headers: {
      cookie: request.headers.get("cookie") ?? "",
      "content-type": request.headers.get("content-type") ?? "",
    },
    body: await request.arrayBuffer(),
  });
  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${PROJECTS_API_URL}/formulaires/${id}/banniere`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });
  if (!res.ok) return NextResponse.json({ error: "not_found" }, { status: res.status });
  return new NextResponse(await res.arrayBuffer(), {
    status: 200,
    headers: {
      "content-type": res.headers.get("content-type") ?? "image/png",
      "cache-control": "private, max-age=600",
    },
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const res = await fetch(`${PROJECTS_API_URL}/formulaires/${id}/banniere`, {
    method: "DELETE",
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });
  return new NextResponse(null, { status: res.status });
}
