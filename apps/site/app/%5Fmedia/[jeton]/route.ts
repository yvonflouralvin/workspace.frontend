import { lireOctets } from "../../lib/rendu";

/** Le proxy de médias.
 *
 *  Le service `documents` garde TOUTES ses routes derrière le secret interne
 *  et répond `Content-Disposition: attachment` — un `<img src>` de navigateur
 *  ne peut fournir ni l'un ni l'autre, et téléchargerait au lieu d'afficher.
 *
 *  Le double saut Python est le coût connu de cette solution ; il disparaîtra
 *  quand `documents` exposera lui-même une porte publique (lot 5). En
 *  attendant, le cache immuable fait qu'un média n'est relayé qu'une fois par
 *  cache : le jeton change si le fichier change, donc l'URL est immuable par
 *  construction. */
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ jeton: string }> },
) {
  const { jeton } = await params;
  const media = await lireOctets(jeton);
  if (!media) return new Response("Introuvable", { status: 404 });

  return new Response(media.contenu, {
    headers: {
      "Content-Type": media.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: `"${jeton}"`,
    },
  });
}
