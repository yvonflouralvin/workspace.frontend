import { NextRequest, NextResponse } from "next/server";
import { forwardToBackend } from "@repo/network/server";

const BUSINESS_FIRM_MISSIONS_API_URL = process.env.BUSINESS_FIRM_MISSIONS_API_URL!;

// Un segment d'URL, et rien d'autre : jamais de `..`, de `/` ou de `?` glissés dans un chemin
// pour sortir du préfixe voulu et joindre une autre route du backend.
const SEGMENT = /^[A-Za-z0-9_-]+$/;

/** Relais du BFF vers le backend, pour tout un préfixe de routes.
 *
 *  Trois cas, et seulement trois :
 *  - un corps multipart (fichier) : pas de JSON à chiffrer, les octets passent bruts — même
 *    exception que partout ailleurs dans la plateforme ;
 *  - un contenu binaire (`…/content`) : relayé tel quel, avec le `content-disposition` du
 *    backend — c'est LUI qui décide de ce qui s'affiche et de ce qui se télécharge ;
 *  - tout le reste : JSON chiffré par `@repo/network`.
 *
 *  Le backend authentifie chaque appel avec le cookie relayé : ce relais n'ouvre aucun droit,
 *  il évite seulement d'écrire vingt routes identiques.
 */
export async function relayer(
  request: NextRequest,
  prefixe: string,
  chemin: string[] | undefined,
): Promise<Response> {
  const segments = chemin ?? [];
  if (!segments.every((s) => SEGMENT.test(s))) {
    return NextResponse.json({ detail: "Chemin invalide" }, { status: 400 });
  }
  const path = `/bfm/${prefixe}${segments.length ? `/${segments.join("/")}` : ""}`;
  const cookie = request.headers.get("cookie") ?? "";
  const type = request.headers.get("content-type") ?? "";
  const search = new URL(request.url).search;

  if (type.startsWith("multipart/form-data")) {
    const res = await fetch(`${BUSINESS_FIRM_MISSIONS_API_URL}${path}${search}`, {
      method: request.method,
      headers: { cookie, "content-type": type },
      body: await request.arrayBuffer(),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  }

  if (request.method === "GET" && segments[segments.length - 1] === "content") {
    const res = await fetch(`${BUSINESS_FIRM_MISSIONS_API_URL}${path}`, { headers: { cookie } });
    if (!res.ok) return NextResponse.json({ error: "not_found" }, { status: res.status });
    return new NextResponse(await res.arrayBuffer(), {
      status: 200,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/octet-stream",
        "content-disposition": res.headers.get("content-disposition") ?? "attachment",
        "x-content-type-options": "nosniff",
        "cache-control": "private, max-age=300",
      },
    });
  }

  return forwardToBackend(request, BUSINESS_FIRM_MISSIONS_API_URL, path);
}
