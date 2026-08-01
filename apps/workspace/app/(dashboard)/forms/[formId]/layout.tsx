"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  ArrowBackOutlined,
  ContentCopyOutlined,
  EditOutlined,
  InsightsOutlined,
  SettingsOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import { STATUT_LABELS, formsApi, type Formulaire } from "@/app/lib/forms-api";
import { FormulaireProvider } from "./form-context";

const TEINTE_STATUT: Record<string, string> = {
  BROUILLON: "bg-surface-container text-on-surface-variant",
  PUBLIE: "bg-secondary/15 text-secondary",
  CLOS: "bg-surface-container text-outline",
};

/** L'enveloppe des quatre onglets.
 *
 *  Le formulaire est chargé UNE fois ici et partagé : chaque onglet le lisant
 *  pour son compte, passer de Édition à Paramètres afficherait un état d'avant
 *  la dernière modification.
 */
export default function FormulaireLayout({ children }: { children: ReactNode }) {
  const { formId } = useParams<{ formId: string }>();
  const pathname = usePathname();
  const id = Number(formId);

  const [forme, setForme] = useState<Formulaire | null>(null);
  const [introuvable, setIntrouvable] = useState(false);

  const recharger = useCallback(async () => {
    try {
      const lu = await formsApi.get(id);
      setForme(lu);
      return lu;
    } catch {
      setIntrouvable(true);
      return null;
    }
  }, [id]);

  useEffect(() => {
    void recharger();
  }, [recharger]);

  if (introuvable) {
    return (
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto space-y-4">
        <Retour />
        <p className="text-body-md text-error">Formulaire introuvable.</p>
      </div>
    );
  }
  if (!forme) {
    return <p className="p-4 md:p-8 text-body-md text-on-surface-variant">Chargement…</p>;
  }

  const base = `/forms/${id}`;
  const onglets = [
    ...(forme.peut_modifier
      ? [
          { href: base, libelle: "Édition", icone: <EditOutlined style={{ fontSize: 17 }} /> },
          {
            href: `${base}/parametres`,
            libelle: "Paramètres",
            icone: <SettingsOutlined style={{ fontSize: 17 }} />,
          },
        ]
      : []),
    {
      href: `${base}/repondre`,
      libelle: "Aperçu",
      icone: <VisibilityOutlined style={{ fontSize: 17 }} />,
    },
    ...(forme.peut_voir_resultats
      ? [
          {
            href: `${base}/resultats`,
            libelle: "Résultats",
            icone: <InsightsOutlined style={{ fontSize: 17 }} />,
          },
        ]
      : []),
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1280px] mx-auto">
      <Retour />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 text-label-md text-outline">
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${TEINTE_STATUT[forme.statut] ?? ""}`}
            >
              {STATUT_LABELS[forme.statut]}
            </span>
            {forme.nb_soumissions} réponse{forme.nb_soumissions > 1 ? "s" : ""}
          </span>
          <h1 className="mt-0.5 font-display text-headline-md text-on-surface">{forme.titre}</h1>
        </div>
        {forme.peut_voir_resultats && (
          <button
            type="button"
            onClick={() =>
              formsApi
                .dupliquer(id)
                .then((copie) => {
                  window.location.href = `/forms/${copie.id}`;
                })
                .catch(() => {})
            }
            className="inline-flex flex-none items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-soft text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <ContentCopyOutlined style={{ fontSize: 16 }} />
            Dupliquer
          </button>
        )}
      </div>

      <nav className="mt-5 mb-5 flex items-center gap-1 overflow-x-auto border-b border-outline-soft">
        {onglets.map((onglet) => {
          const actif = pathname === onglet.href;
          return (
            <Link
              key={onglet.href}
              href={onglet.href}
              className={`-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-body-sm font-medium transition-colors ${
                actif
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {onglet.icone}
              {onglet.libelle}
            </Link>
          );
        })}
      </nav>

      <FormulaireProvider value={{ forme, recharger, setForme }}>{children}</FormulaireProvider>
    </div>
  );
}

function Retour() {
  return (
    <Link
      href="/forms"
      className="mb-4 inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
    >
      <ArrowBackOutlined style={{ fontSize: 15 }} /> Formulaires
    </Link>
  );
}
