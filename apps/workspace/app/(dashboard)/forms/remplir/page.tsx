"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowBackOutlined,
  AssignmentTurnedInOutlined,
  DescriptionOutlined,
  OpenInNewOutlined,
} from "@mui/icons-material";
import { SearchField } from "@repo/ui/SearchField";
import { catalogue, type EntreeCatalogue } from "@/app/lib/catalogue-formulaires";

/** « Quel formulaire puis-je remplir ? »
 *
 *  Une seule réponse à une seule question. Jusqu'ici deux écrans y répondaient,
 *  dans deux applications, et un formulaire publié restait introuvable selon
 *  l'endroit où l'on cherchait.
 *
 *  Les deux moteurs restent distincts — l'un consigne une réponse, l'autre fait
 *  circuler une demande — et l'écran le DIT plutôt que de le masquer : c'est
 *  une différence qui compte après l'envoi, pas au moment de chercher.
 */
export default function RemplirPage() {
  const [recherche, setRecherche] = useState("");
  const [entrees, setEntrees] = useState<EntreeCatalogue[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setEntrees(await catalogue(recherche));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Catalogue indisponible.");
      setEntrees([]);
    }
  }, [recherche]);

  useEffect(() => {
    const t = setTimeout(() => void charger(), 250);
    return () => clearTimeout(t);
  }, [charger]);

  return (
    <div className="mx-auto max-w-[1024px] p-4 md:p-8">
      <Link
        href="/forms"
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowBackOutlined style={{ fontSize: 15 }} />
        Formulaires
      </Link>

      <h1 className="font-display text-headline-md text-on-surface">Remplir un formulaire</h1>
      <p className="mt-1 max-w-[70ch] text-body-md text-on-surface-variant">
        Tout ce que vous pouvez remplir, d&apos;où que cela vienne : les formulaires du
        workspace et les demandes qui passent par un circuit d&apos;approbation.
      </p>

      <div className="mt-5">
        <SearchField
          value={recherche}
          onChange={setRecherche}
          placeholder="Rechercher un formulaire…"
          className="w-full sm:w-[320px]"
        />
      </div>

      {erreur && (
        <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      {entrees === null ? (
        <p className="mt-6 text-body-md text-on-surface-variant">Chargement…</p>
      ) : entrees.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-12 text-center">
          <DescriptionOutlined style={{ fontSize: 30 }} className="text-outline" />
          <p className="mt-2 text-body-md text-on-surface">
            {recherche ? "Aucun formulaire ne correspond." : "Aucun formulaire à remplir."}
          </p>
          <p className="mx-auto mt-1 max-w-[52ch] text-body-sm text-on-surface-variant">
            Un formulaire apparaît ici s&apos;il est publié et ouvert à vous. Les demandes
            portées par une application ne s&apos;y trouvent que si elles ont été ouvertes
            au catalogue.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {entrees.map((e) => {
            const externe = e.href.startsWith("http");
            const Icone = e.source === "APPROBATION" ? AssignmentTurnedInOutlined : DescriptionOutlined;
            return (
              <Link
                key={e.cle}
                href={e.href}
                // Un circuit vit dans une autre application : on ouvre à côté
                // plutôt que d'éjecter l'utilisateur de là où il cherchait.
                target={externe ? "_blank" : undefined}
                rel={externe ? "noreferrer" : undefined}
                className="group rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 transition-colors hover:border-primary"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-xl ${
                      e.source === "APPROBATION"
                        ? "bg-secondary/15 text-secondary"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icone style={{ fontSize: 18 }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-body-md font-medium text-on-surface group-hover:text-primary">
                      <span className="truncate">{e.titre}</span>
                      {externe && (
                        <OpenInNewOutlined style={{ fontSize: 14 }} className="flex-none text-outline" />
                      )}
                    </p>
                    {e.description && (
                      <p className="mt-0.5 line-clamp-2 text-body-sm text-on-surface-variant">
                        {e.description}
                      </p>
                    )}
                    <p className="mt-1.5 text-label-md text-outline">{e.apres}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
