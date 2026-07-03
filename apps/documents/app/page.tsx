"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSessionStore } from "@repo/auth/store/session.store";
import { DashboardShell } from "@/components/DashboardShell";
import { listTemplates, type PDFTemplate } from "./lib/api";
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

export default function TemplatesPage() {
  const workspace = useSessionStore((s) => s.activeWorkspace);
  const [templates, setTemplates] = useState<PDFTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTemplates()
      .then(setTemplates)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell>
      <div className="p-lg">
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

        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const workspaceVars = t.variables.filter((v) => v.source === "workspace");
            const entityVars = t.variables.filter((v) => v.source === "entity");
            return (
              <Link
                key={t.key}
                href={`/templates/${t.key}`}
                className="block rounded-xl border border-outline-variant bg-surface-container-lowest p-md hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-start gap-sm mb-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <DescriptionOutlined
                      style={{ fontSize: 18 }}
                      className="text-primary"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-body-md font-semibold text-on-surface truncate">
                      {t.name}
                    </p>
                    <p className="text-label-md text-on-surface-variant">{t.app_key}</p>
                  </div>
                </div>

                {t.description && (
                  <p className="text-body-sm text-on-surface-variant mb-sm line-clamp-2">
                    {t.description}
                  </p>
                )}

                <div className="flex gap-xs flex-wrap">
                  {workspaceVars.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-secondary/10 text-secondary text-label-sm px-xs py-0.5">
                      {workspaceVars.length} var. workspace
                    </span>
                  )}
                  {entityVars.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-tertiary/10 text-tertiary text-label-sm px-xs py-0.5">
                      {entityVars.length} var. document
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </DashboardShell>
  );
}
