"use client";

import { useEffect, useState } from "react";
import { AndroidOutlined, DownloadOutlined } from "@mui/icons-material";

/** Lien de téléchargement de l'application mobile, à poser dans les Paramètres.
 *
 *  L'APK est servi par le dossier `public/downloads/` de l'app web elle-même :
 *  pas de domaine dédié, pas de conteneur de plus, et le fichier arrive sur le
 *  même domaine que la page qui le propose — un lien vers un autre hôte
 *  demanderait à l'utilisateur de faire confiance à une adresse qu'il ne
 *  reconnaît pas.
 *
 *  Le bloc ne s'affiche **que si l'APK existe** : une app dont la version mobile
 *  n'est pas encore publiée ne doit pas proposer un lien qui donne un 404.
 */
export function MobileAppBlock({
  appKey,
  appLabel,
}: {
  /** Nom du fichier servi : `/downloads/<appKey>.apk`. */
  appKey: string;
  appLabel: string;
}) {
  const href = `/downloads/${appKey}.apk`;
  const [etat, setEtat] = useState<"verif" | "absent" | "present">("verif");
  const [poids, setPoids] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    fetch(href, { method: "HEAD" })
      .then((r) => {
        if (!vivant) return;
        if (!r.ok) {
          setEtat("absent");
          return;
        }
        const octets = Number(r.headers.get("content-length"));
        if (octets > 0) setPoids(`${(octets / 1024 / 1024).toFixed(1)} Mo`);
        setEtat("present");
      })
      .catch(() => vivant && setEtat("absent"));
    return () => {
      vivant = false;
    };
  }, [href]);

  if (etat !== "present") return null;

  return (
    <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-surface-container text-on-surface-variant">
            <AndroidOutlined style={{ fontSize: 18 }} />
          </span>
          <div>
            <p className="text-body-md font-medium text-on-surface">Application mobile</p>
            <p className="mt-0.5 max-w-[62ch] text-body-sm text-on-surface-variant">
              {appLabel} sur Android. Installez le fichier depuis votre téléphone ; il
              faudra autoriser l&apos;installation depuis cette source, l&apos;application
              n&apos;étant pas distribuée par le Play Store.
            </p>
          </div>
        </div>
        <a
          href={href}
          className="inline-flex h-9 flex-none items-center gap-1.5 rounded-lg border border-outline-soft px-4 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
        >
          <DownloadOutlined style={{ fontSize: 16 }} />
          Télécharger{poids ? ` (${poids})` : ""}
        </a>
      </div>
    </section>
  );
}
