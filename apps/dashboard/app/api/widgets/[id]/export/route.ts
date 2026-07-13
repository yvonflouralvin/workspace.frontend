import { NextRequest } from "next/server";

const DASHBOARD_API_URL = process.env.DASHBOARD_API_URL!;

// Téléchargement CSV : pass-through brut (pas de chiffrement @repo/network) car déclenché
// par une navigation <a download> du navigateur, pas par apiFetch. Le cookie de session
// (même origine) est relayé au backend qui gère l'auth.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const search = new URL(request.url).search;
  const res = await fetch(`${DASHBOARD_API_URL}/dashboard/widgets/${id}/export${search}`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });
  const body = await res.arrayBuffer();
  const headers = new Headers();
  headers.set("content-type", res.headers.get("content-type") ?? "text/csv; charset=utf-8");
  headers.set("content-disposition", res.headers.get("content-disposition") ?? `attachment; filename="widget-${id}.csv"`);
  return new Response(body, { status: res.status, headers });
}
