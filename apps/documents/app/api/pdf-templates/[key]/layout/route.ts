import { NextRequest, NextResponse } from "next/server";

const DOCUMENTS_API_URL = process.env.DOCUMENTS_API_URL!;
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET!;

type Ctx = { params: Promise<{ key: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  const { key } = await params;
  const workspaceId = request.nextUrl.searchParams.get("workspace_id") ?? "";
  const res = await fetch(
    `${DOCUMENTS_API_URL}/pdf-templates/${key}/layout?workspace_id=${workspaceId}`,
    { headers: { "X-Internal-Secret": INTERNAL_SERVICE_SECRET } }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  const { key } = await params;
  const { searchParams } = request.nextUrl;
  const workspaceId = searchParams.get("workspace_id") ?? "";
  const updatedBy = searchParams.get("updated_by") ?? "";
  const body = await request.json();

  const res = await fetch(
    `${DOCUMENTS_API_URL}/pdf-templates/${key}/layout?workspace_id=${workspaceId}&updated_by=${updatedBy}`,
    {
      method: "PUT",
      headers: {
        "X-Internal-Secret": INTERNAL_SERVICE_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (res.status === 204) return new NextResponse(null, { status: 204 });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
