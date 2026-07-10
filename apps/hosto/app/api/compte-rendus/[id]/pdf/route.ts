import { NextRequest } from "next/server";

const HOSTO_API_URL = process.env.HOSTO_API_URL!;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await fetch(`${HOSTO_API_URL}/hosto/compte-rendus/${id}/pdf`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });
  return new Response(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/pdf",
      "content-disposition": res.headers.get("content-disposition") ?? "",
    },
  });
}
