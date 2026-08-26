import { revalidateTag } from "next/cache";

// Next 16 exige un profil de durée de vie sur `revalidateTag`. « max » demande
// l'expiration la plus longue possible du contenu remplaçant — ce qui est
// exactement ce qu'on veut : la page publiée reste en cache jusqu'à la
// PROCHAINE publication, qui rappellera cette route.
const PROFIL = "max";

import { etiquettes } from "../../lib/rendu";

/** Purge appelée par le service `website` à chaque publication.
 *
 *  Sans elle, une mise en ligne serait visible à l'expiration du cache — une
 *  heure. Avec elle, quelques secondes. Le service appelle en best-effort :
 *  cette route ne doit jamais faire échouer une publication, d'où la réponse
 *  200 même quand il n'y a rien à purger. */
export async function POST(requete: Request) {
  const secret = requete.headers.get("x-internal-secret") ?? "";
  const attendu = process.env.INTERNAL_SERVICE_SECRET ?? "";
  if (!attendu || secret !== attendu) {
    return Response.json({ detail: "Unauthorized" }, { status: 401 });
  }

  let corps: { hotes?: string[]; chemins?: string[]; etiquettes?: string[] } = {};
  try {
    corps = await requete.json();
  } catch {
    corps = {};
  }

  const hotes = corps.hotes ?? [];
  const chemins = corps.chemins ?? [];
  let purgees = 0;

  for (const hote of hotes) {
    revalidateTag(`site:${hote}`, PROFIL);
    purgees += 1;
    for (const chemin of chemins) {
      for (const etiquette of etiquettes(hote, chemin)) revalidateTag(etiquette, PROFIL);
      purgees += 1;
    }
  }

  // Les étiquettes explicites : celles que la convention d'ici ne saurait pas
  // deviner — la vitrine d'une boutique, une fiche produit. Le service les
  // envoie telles quelles.
  for (const etiquette of corps.etiquettes ?? []) {
    revalidateTag(etiquette, PROFIL);
    purgees += 1;
  }

  return Response.json({ purgees });
}
