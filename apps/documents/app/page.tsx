"use client";

import { useSessionStore as useSessionAccueil } from "@repo/auth/store/session.store";
import { usePermissions as usePermissionsAccueil } from "@repo/auth/hooks/usePermissions";
import { AccueilApp } from "@repo/ui/shell/AccueilApp";
import { NAV_ITEMS } from "@/components/DashboardShell";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSessionStore } from "@repo/auth/store/session.store";
import { DashboardShell } from "@/components/DashboardShell";
import { listTemplates, getLayout, type PDFTemplate } from "./lib/api";
import { DescriptionOutlined } from "@mui/icons-material";

const TYPE_LABEL: Record<string, string> = {
  TEXT: "Texte",
  MULTILINE_TEXT: "Texte long",
  NUMBER: "Nombre",
  DATE: "Date",
  IMAGE: "Image",
  TABLE: "Tableau",
  LIST: "Liste",
};

function Templates() {
  const workspace = useSessionStore((s) => s.activeWorkspace);
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [customises, setCustomises] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // `is_default` dit si le workspace a sa propre mise en page : l'information
  // n'est pas dans la liste, on la demande template par template.
  useEffect(() => {
    if (!workspace?.id || templates.length === 0) return;
    Promise.all(
      templates.map((t) =>
        getLayout(t.key, workspace.id)
          .then((l) => [t.key, !l.is_default] as const)
          .catch(() => [t.key, false] as const)
      )
    ).then((entries) => setCustomises(Object.fromEntries(entries)));
  }, [workspace, templates]);

  const parApp = templates.reduce<Record<string, PDFTemplate[]>>((acc, t) => {
    (acc[t.app_key] ??= []).push(t);
    return acc;
  }, {});

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
        <div className="mb-lg">
          <h1 className="text-headline-md text-on-surface">Templates PDF</h1>
          <p className="text-body-md text-on-surface-variant mt-xs">
            Modèles de documents gérés par la plateforme. Personnalisez la présentation par
            workspace.
          </p>
        </div>

        {loading && (
          <div className="text-body-md text-on-surface-variant">Chargement…</div>
        )}

        {error && (
          <div className="rounded-xl bg-error-container text-on-error-container p-md text-body-md">
            {error}
          </div>
        )}

        {!loading && !error && templates.length === 0 && (
          <div className="text-body-md text-on-surface-variant">
            Aucun template enregistré. Les apps (Hosto, HR…) enregistrent leurs templates
            automatiquement au démarrage.
          </div>
        )}

        <div className="space-y-6">
          {Object.entries(parApp).map(([appKey, list]) => (
            <section key={appKey}>
              <h2 className="text-label-sm uppercase text-outline mb-2.5">{appKey}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((t) => {
                  const workspaceVars = t.variables.filter((v) => v.source === "workspace");
                  const entityVars = t.variables.filter((v) => v.source === "entity");
                  const perso = customises[t.key];
                  return (
                    <Link
                      key={t.key}
                      href={`/templates/${t.key}`}
                      className="block rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 hover:border-primary/40 hover:bg-primary/[0.03] transition-colors"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-none">
                          <DescriptionOutlined style={{ fontSize: 18 }} className="text-primary" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-body-md font-semibold text-on-surface truncate">
                            {t.name}
                          </p>
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 mt-0.5 text-[11px] font-semibold ${
                              perso
                                ? "bg-role-owner-container text-role-owner"
                                : "bg-role-member-container text-role-member"
                            }`}
                          >
                            {perso ? "Personnalisé" : "Modèle par défaut"}
                          </span>
                        </div>
                      </div>

                      {t.description && (
                        <p className="text-body-sm text-on-surface-variant mb-2.5 line-clamp-2">
                          {t.description}
                        </p>
                      )}

                      <div className="flex gap-1.5 flex-wrap text-[11px] font-semibold">
                        {entityVars.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-role-admin-container px-1.5 py-0.5 text-role-admin">
                            {entityVars.length} du document
                          </span>
                        )}
                        {workspaceVars.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-role-owner-container px-1.5 py-0.5 text-role-owner">
                            {workspaceVars.length} du workspace
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

/** La porte d'entrée de Documents.
 *
 *  Son accueil EST un module, et tout le monde n'y a pas droit : sans cette
 *  garde, un membre dont le groupe fait de Documents sa page de démarrage
 *  atterrissait sur un 403 juste après s'être connecté. On l'envoie vers le
 *  premier module qui lui est ouvert — ou on le lui dit franchement.
 */
export default function Racine() {
  const chargement = useSessionAccueil((s) => s.loading);
  const accueil = useSessionAccueil((s) => s.accueil);
  const prenom = useSessionAccueil((s) => s.user?.username);
  const { can } = usePermissionsAccueil();

  // Les raccourcis du groupe passent AVANT le module par défaut : c'est un
  // accueil qu'on a choisi pour ce membre, pas un pis-aller.
  const raccourcis = !!accueil?.accueil_personnalise && accueil.liens_rapides.length > 0;

  if (!chargement && (raccourcis || !can("documents.templates.view"))) {
    return (
      <DashboardShell>
        <AccueilApp
          items={NAV_ITEMS}
          can={can}
          appName="Documents"
          accueil={accueil}
          prenom={prenom}
          pret={!chargement}
        />
      </DashboardShell>
    );
  }
  return <Templates />;
}
