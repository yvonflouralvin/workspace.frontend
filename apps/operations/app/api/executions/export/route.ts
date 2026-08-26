import { NextRequest } from "next/server";

const API = process.env.OPERATIONS_API_URL!;

/** Voir la note du même fichier côté process : le CSV se relaie en octets
 *  bruts, pas par le canal JSON chiffré. */
export async function GET(request: NextRequest) {
  const requete = new URL(request.url);
  const reponse = await fetch(`${API}/executions/export${requete.search}`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  });

  return new Response(reponse.body, {
    status: reponse.status,
    headers: {
      "content-type": reponse.headers.get("content-type") ?? "text/csv; charset=utf-8",
      "content-disposition":
        reponse.headers.get("content-disposition") ?? 'attachment; filename="executions.csv"',
    },
  });
}
