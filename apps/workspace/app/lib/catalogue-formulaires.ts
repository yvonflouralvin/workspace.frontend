import { formsApi, type FormulaireResume } from "@/app/lib/forms-api";
import { listerCircuits } from "@/app/lib/circuits-api";

/** Le catalogue des formulaires à remplir.
 *
 *  Deux moteurs répondent aujourd'hui à la même question de l'utilisateur —
 *  « quel formulaire puis-je remplir ? » : le module Formulaire, qui consigne
 *  une réponse, et les circuits d'approbation, qui font circuler une demande.
 *  Ce sont deux choses différentes UNE FOIS ENVOYÉ ; au moment de chercher, ce
 *  n'en est qu'une.
 *
 *  On réunit donc la porte, pas les moteurs. Chaque source reste interrogée
 *  avec la session de l'utilisateur : ses droits s'appliquent naturellement,
 *  sans qu'on ait à les rejouer ici.
 */

export type SourceFormulaire = "FORMULAIRE" | "APPROBATION";

export interface EntreeCatalogue {
  cle: string;
  source: SourceFormulaire;
  titre: string;
  description: string | null;
  /** Où aller pour le remplir. */
  href: string;
  /** Ce qui se passe une fois envoyé — la vraie différence entre les deux. */
  apres: string;
}

/** Les circuits d'approbation ouverts au catalogue.
 *
 *  Une panne de ce service ne doit pas vider le catalogue : les formulaires du
 *  module Formulaire restent, eux, parfaitement remplissables — `listerCircuits`
 *  rend donc une liste vide plutôt que de laisser l'erreur remonter.
 */
async function circuits(): Promise<EntreeCatalogue[]> {
  const flows = await listerCircuits();
  return (
    flows
      // Configuré : une version publiée existe, il y a quelque chose à
      // remplir. Ouvert au catalogue : son application n'a pas déjà sa porte.
      .filter((f) => f.configured && f.catalogue_visible)
      .map((f) => ({
        cle: `approbation:${f.id}`,
        source: "APPROBATION" as const,
        titre: f.title,
        description: null,
        href: `${process.env.NEXT_PUBLIC_AUTH_API_APPROVAL_FLOWS_DOMAIN ?? ""}/submit/${encodeURIComponent(f.id)}`,
        apres: "Passe par un circuit d'approbation",
      }))
  );
}

function depuisFormulaire(f: FormulaireResume): EntreeCatalogue {
  return {
    cle: `formulaire:${f.id}`,
    source: f.approbation_flow_id ? "APPROBATION" : "FORMULAIRE",
    titre: f.titre,
    description: f.description,
    href: `/forms/${f.id}/repondre`,
    // Ce qui compte au moment d'envoyer se dit avant de choisir : un
    // formulaire du module peut lui aussi partir en approbation.
    apres: f.approbation_flow_id
      ? "Passe par un circuit d'approbation"
      : "Réponse enregistrée",
  };
}

export async function catalogue(recherche?: string): Promise<EntreeCatalogue[]> {
  const [formulaires, approbations] = await Promise.all([
    formsApi.lister({ portee: "a_remplir", q: recherche }).catch(() => [] as FormulaireResume[]),
    circuits(),
  ]);

  const q = (recherche ?? "").trim().toLowerCase();
  const entrees = [
    ...formulaires.map(depuisFormulaire),
    // La recherche du module Formulaire se fait côté serveur ; celle des
    // circuits ici, faute d'un paramètre équivalent. Le filtre est le même.
    ...approbations.filter((e: EntreeCatalogue) => !q || e.titre.toLowerCase().includes(q)),
  ];

  return entrees.sort((a, b) => a.titre.localeCompare(b.titre, "fr"));
}
