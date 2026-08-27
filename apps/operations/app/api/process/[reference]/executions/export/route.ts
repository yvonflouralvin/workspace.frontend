import { NextRequest } from "next/server";

const API = process.env.OPERATIONS_API_URL!;

/** Le téléchargement du CSV — **pas** de `forwardToBackend`.
 *
 *  Le relais chiffré de `@repo/network` sert à du JSON : il chiffrerait le
 *  corps, et le navigateur enregistrerait un fichier illisible. Ici on relaie
 *  les octets tels quels, avec le cookie de session, comme le fait déjà l'app
 *  RH pour les pièces jointes. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ reference: string }> }) {
  const { reference } = await ctx.params;
  const requete = new URL(request.url);
  const amont = `${API}/process/${reference}/executions/export${requete.search}`;

  const reponse = await fetch(amont, {
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
