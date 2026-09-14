import { NextRequest } from "next/server";

const COMPTABILITE_API_URL = process.env.COMPTABILITE_API_URL!;

// Réponse binaire (fichier Excel) — pas de JSON à chiffrer, même exception que le
// téléchargement de documents RH : pass-through brut des octets + headers.
export async function GET(request: NextRequest) {
  const res = await fetch(`${COMPTABILITE_API_URL}/compta/referentiels/modele`, {
    headers: { cookie: request.headers.get("cookie") ?? "" },
  });

  return new Response(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/octet-stream",
      "content-disposition": res.headers.get("content-disposition") ?? "",
    },
  });
}
