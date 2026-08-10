"use client";

import { use, useEffect, useState } from "react";
import { PrintOutlined } from "@mui/icons-material";
import { sgrApi, type Certificat } from "@/app/lib/api";

/** Le certificat de soumission.
 *
 *  Le seul écran de l'application conçu pour être IMPRIMÉ : c'est le papier que
 *  le candidat joint à son dossier physique, et par lequel la faculté puis le
 *  SGR retrouvent son dossier en ligne. Pas de shell, pas de menu — ce qui
 *  n'apparaîtrait pas sur le papier n'a rien à faire à l'écran.
 */
export default function CertificatPage({
  params,
}: {
  params: Promise<{ dossierId: string }>;
}) {
  const { dossierId } = use(params);
  const [certificat, setCertificat] = useState<Certificat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    sgrApi
      .certificat(Number(dossierId))
      .then(setCertificat)
      .catch((e) => setErreur(e instanceof Error ? e.message : "Certificat indisponible."));
  }, [dossierId]);

  if (erreur) {
    return <p className="p-8 text-body-md text-error">{erreur}</p>;
  }
  if (!certificat) {
    return <p className="p-8 text-body-md text-on-surface-variant">Chargement…</p>;
  }

  const date = new Date(certificat.soumis_le);

  return (
    <div className="mx-auto max-w-[800px] p-6 md:p-10">
      <button
        type="button"
        onClick={() => window.print()}
        className="mb-6 inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low print:hidden"
      >
        <PrintOutlined style={{ fontSize: 17 }} />
        Imprimer
      </button>

      <article className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-8 print:border-0">
        <header className="text-center">
          <p className="text-body-md font-semibold uppercase text-on-surface">
            Université de Kinshasa
          </p>
          <p className="text-body-sm text-on-surface-variant">
            Secrétariat Général chargé de la Recherche
          </p>
          <h1 className="mt-6 font-display text-headline-sm uppercase text-on-surface">
            Certificat de soumission de dossier
          </h1>
          <p className="mt-2 text-body-sm text-on-surface-variant">
            Référence : <span className="font-mono font-semibold">{certificat.reference}</span>
          </p>
        </header>

        <p className="mt-6 text-body-md text-on-surface">
          Le Secrétariat Général chargé de la Recherche de l&apos;Université de Kinshasa accuse
          réception du dossier de <strong>{certificat.type_libelle}</strong> soumis par :
        </p>

        <dl className="mt-4 space-y-1.5 text-body-sm">
          {[
            ["Candidat", certificat.candidat],
            ["Faculté", certificat.faculte ?? "—"],
            ["Département", certificat.departement ?? "—"],
            ["Niveau d'études", certificat.niveau],
            ["Sujet", certificat.sujet ?? "Non spécifié"],
            [
              "Date de soumission",
              `${date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} à ${date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
            ],
          ].map(([libelle, valeur]) => (
            <div key={libelle} className="flex gap-3">
              <dt className="w-[170px] flex-none text-on-surface-variant">{libelle}</dt>
              <dd className="min-w-0 flex-1 font-medium text-on-surface">{valeur}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 rounded-xl bg-surface-container-low p-4 text-body-sm text-on-surface-variant">
          <p className="font-semibold text-on-surface">Prochaine étape</p>
          <p className="mt-1">
            Imprimez ce certificat et déposez-le à votre faculté avec votre dossier physique
            complet. La faculté transmettra ensuite votre dossier au Secrétariat Général à la
            Recherche pour traitement.
          </p>
          <p className="mt-1">
            Délai moyen de traitement : 5 jours ouvrables après réception du dossier physique.
          </p>
        </div>

        <p className="mt-6 text-body-sm text-on-surface-variant">
          En foi de quoi, le présent certificat de soumission est délivré à l&apos;intéressé(e)
          pour servir et valoir ce que de droit.
        </p>

        <p className="mt-8 text-right text-body-sm text-on-surface">
          Kinshasa, le{" "}
          {new Date().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          <br />
          <span className="font-semibold">Le Secrétaire Général à la Recherche</span>
        </p>

        <footer className="mt-10 border-t border-outline-soft pt-3 text-center text-label-md text-outline">
          Document généré automatiquement par la plateforme SGR — Université de Kinshasa
        </footer>
      </article>
    </div>
  );
}
