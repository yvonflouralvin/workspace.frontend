"use client";

import { useState } from "react";
import { ContentCopyOutlined, OpenInNewOutlined } from "@mui/icons-material";

import { Carte } from "@/components/Bloc";

/** Le lien à donner aux candidats.
 *
 *  **Il doit être ICI**, à côté de l'interrupteur qui ouvre les candidatures :
 *  ouvrir les dépôts sans savoir où envoyer les gens n'ouvre rien du tout. Le
 *  réglage et son adresse sont une seule et même décision.
 *
 *  L'adresse se construit depuis l'origine du navigateur plutôt que depuis une
 *  variable d'environnement : elle est alors juste en dev, en UAT et en prod
 *  sans que personne n'ait à tenir une liste de domaines à jour.
 */
export function LienCandidature({
  etablissementId,
  slug,
  ouvertes,
}: {
  etablissementId: number;
  slug: string | null;
  ouvertes: boolean;
}) {
  const [copie, setCopie] = useState(false);

  // Le nom court s'il existe, l'identifiant sinon. Les deux fonctionnent côté
  // serveur — un lien déjà imprimé ne se rappelle pas — mais c'est le nom court
  // qu'on met sur une affiche.
  const lien =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/candidature/${slug || etablissementId}`;

  async function copier() {
    try {
      await navigator.clipboard.writeText(lien);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Le presse-papier peut être refusé (contexte non sécurisé, permission).
      // Le lien reste sélectionnable à la main : on ne bloque personne.
      setCopie(false);
    }
  }

  return (
    <Carte
      titre="Lien de candidature"
      sousTitre="L'adresse à diffuser aux candidats — affiche, réseaux sociaux, message. Elle s'ouvre sans compte."
    >
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 select-all truncate rounded-lg bg-surface-container px-3 py-2 text-body-sm text-on-surface">
            {lien || "…"}
          </code>
          <button
            type="button"
            onClick={() => void copier()}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            <ContentCopyOutlined style={{ fontSize: 16 }} />
            {copie ? "Copié" : "Copier"}
          </button>
          <a
            href={lien}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
          >
            <OpenInNewOutlined style={{ fontSize: 16 }} />
            Ouvrir
          </a>
        </div>

        {/* L'état est DIT ici aussi. Un lien qui existe mais qui affiche
            « dépôts fermés » se signale comme une panne à celui qui l'a
            diffusé ; le voir depuis les réglages évite l'aller-retour. */}
        {ouvertes ? (
          <p className="text-body-sm text-on-surface-variant">
            Les dépôts sont <span className="text-secondary">ouverts</span> : la page accepte les
            candidatures et propose les filières qui accueillent des étudiants.
          </p>
        ) : (
          <p className="text-body-sm text-on-surface-variant">
            Les dépôts sont <span className="text-error">fermés</span> : la page s&apos;ouvre et le
            dit, mais ne propose aucun formulaire. Activez « Les candidatures sont ouvertes »
            ci-dessous.
          </p>
        )}

        <p className="text-label-md text-outline">
          Le candidat n&apos;a pas de compte : il dépose, reçoit un numéro de référence — avec un
          code QR qui ramène ici — et suit son dossier depuis la même page. Le nom court se
          change dans « Établissement », juste au-dessus.
        </p>
      </div>
    </Carte>
  );
}
