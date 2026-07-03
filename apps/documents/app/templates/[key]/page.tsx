"use client";

import { useEffect, useState, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getTemplate,
  getLayout,
  saveLayout,
  getSettings,
  saveSettings,
  previewTemplate,
  type PDFTemplate,
  type WorkspaceLayout,
  type WorkspaceSettings,
  type VariableDef,
} from "@/app/lib/api";
import {
  ArrowBackOutlined,
  CheckOutlined,
  OpenInNewOutlined,
} from "@mui/icons-material";

type Tab = "variables" | "presentation" | "settings";

const SOURCE_LABEL: Record<string, string> = {
  entity: "Document",
  workspace: "Workspace",
};

const TYPE_LABEL: Record<string, string> = {
  TEXT: "Texte",
  MULTILINE_TEXT: "Texte long",
  NUMBER: "Nombre",
  DATE: "Date",
  IMAGE: "Image",
  TABLE: "Tableau",
  LIST: "Liste",
};

// ─── Variables tab ────────────────────────────────────────────────────────────

function VariablesTab({ variables }: { variables: VariableDef[] }) {
  const workspace = variables.filter((v) => v.source === "workspace");
  const entity = variables.filter((v) => v.source === "entity");

  return (
    <div className="space-y-lg">
      {workspace.length > 0 && (
        <section>
          <h3 className="text-body-md font-semibold text-on-surface mb-sm">
            Variables workspace
          </h3>
          <p className="text-body-sm text-on-surface-variant mb-md">
            Configurées une fois dans l&apos;onglet Paramètres. Partagées par tous les documents
            de ce template pour ce workspace.
          </p>
          <VariableTable vars={workspace} />
        </section>
      )}
      {entity.length > 0 && (
        <section>
          <h3 className="text-body-md font-semibold text-on-surface mb-sm">
            Variables document
          </h3>
          <p className="text-body-sm text-on-surface-variant mb-md">
            Envoyées par l&apos;application à chaque génération (ex: nom du patient, liste de
            médicaments).
          </p>
          <VariableTable vars={entity} />
        </section>
      )}
    </div>
  );
}

function VariableTable({ vars }: { vars: VariableDef[] }) {
  return (
    <div className="rounded-xl border border-outline-variant overflow-hidden">
      <table className="w-full text-body-sm">
        <thead className="bg-surface-container">
          <tr>
            <th className="text-left px-md py-sm text-on-surface-variant font-medium">Clé</th>
            <th className="text-left px-md py-sm text-on-surface-variant font-medium">Label</th>
            <th className="text-left px-md py-sm text-on-surface-variant font-medium">Type</th>
            <th className="text-left px-md py-sm text-on-surface-variant font-medium">Requis</th>
          </tr>
        </thead>
        <tbody>
          {vars.map((v, i) => (
            <tr
              key={v.key}
              className={i % 2 === 0 ? "bg-surface-container-lowest" : "bg-surface-container-low"}
            >
              <td className="px-md py-sm font-mono text-primary">{v.key}</td>
              <td className="px-md py-sm text-on-surface">{v.label}</td>
              <td className="px-md py-sm text-on-surface-variant">
                {TYPE_LABEL[v.type] ?? v.type}
                {v.columns && (
                  <span className="text-label-sm text-on-surface-variant ml-xs">
                    ({v.columns.map((c) => c.label ?? c.key).join(", ")})
                  </span>
                )}
              </td>
              <td className="px-md py-sm text-on-surface-variant">
                {v.required ? (
                  <span className="text-secondary font-medium">Oui</span>
                ) : (
                  <span>Non</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Presentation tab ─────────────────────────────────────────────────────────

function PresentationTab({
  templateKey,
  template,
  workspaceId,
  userId,
  canManage,
}: {
  templateKey: string;
  template: PDFTemplate;
  workspaceId: number;
  userId: number;
  canManage: boolean;
}) {
  const [layoutData, setLayoutData] = useState<WorkspaceLayout | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    getLayout(templateKey, workspaceId).then((l) => {
      setLayoutData(l);
      setJsonText(JSON.stringify(l.layout, null, 2));
    });
  }, [templateKey, workspaceId]);

  const handleJsonChange = (val: string) => {
    setJsonText(val);
    setJsonError(null);
    setSaved(false);
    try {
      JSON.parse(val);
    } catch {
      setJsonError("JSON invalide");
    }
  };

  const handleSave = async () => {
    if (jsonError) return;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      setJsonError("JSON invalide");
      return;
    }
    setSaving(true);
    try {
      await saveLayout(templateKey, workspaceId, userId, parsed);
      setSaved(true);
      setLayoutData((prev) => (prev ? { ...prev, layout: parsed } : null));
    } catch (e: unknown) {
      setJsonError(e instanceof Error ? e.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    let layout: Record<string, unknown>;
    try {
      layout = JSON.parse(jsonText);
    } catch {
      setJsonError("JSON invalide — corrigez avant de prévisualiser");
      return;
    }
    setPreviewing(true);
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    try {
      // Build sample data from template variable definitions
      const sampleData: Record<string, unknown> = {};
      for (const v of template.variables) {
        if (v.source !== "entity") continue;
        if (v.type === "TABLE") {
          sampleData[v.key] = [
            Object.fromEntries((v.columns ?? []).map((c) => [c.key, `(${c.label ?? c.key})`])),
          ];
        } else if (v.type === "IMAGE") {
          // skip — no sample image
        } else {
          sampleData[v.key] = `[${v.label}]`;
        }
      }

      const blob = await previewTemplate(templateKey, workspaceId, sampleData);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (e: unknown) {
      setJsonError(e instanceof Error ? e.message : "Erreur de prévisualisation");
    } finally {
      setPreviewing(false);
    }
  };

  return (
    <div className="space-y-md">
      {layoutData?.is_default && (
        <div className="rounded-xl bg-surface-container border border-outline-variant p-sm text-body-sm text-on-surface-variant">
          Aucun layout personnalisé pour ce workspace — affichage du layout par défaut du
          template. Modifiez le JSON ci-dessous et sauvegardez pour créer votre version.
        </div>
      )}

      <div className="flex items-center gap-sm">
        {canManage && (
          <button
            onClick={handleSave}
            disabled={saving || !!jsonError}
            className="inline-flex items-center gap-xs rounded-lg bg-primary text-on-primary px-md py-sm text-body-sm font-medium disabled:opacity-50 hover:bg-primary-container transition-colors"
          >
            {saved && <CheckOutlined style={{ fontSize: 16 }} />}
            {saving ? "Sauvegarde…" : saved ? "Sauvegardé" : "Sauvegarder"}
          </button>
        )}
        <button
          onClick={handlePreview}
          disabled={previewing || !!jsonError}
          className="inline-flex items-center gap-xs rounded-lg border border-outline-variant text-on-surface px-md py-sm text-body-sm font-medium disabled:opacity-50 hover:bg-surface-container transition-colors"
        >
          <OpenInNewOutlined style={{ fontSize: 16 }} />
          {previewing ? "Génération…" : "Prévisualiser"}
        </button>
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-xs rounded-lg border border-secondary text-secondary px-md py-sm text-body-sm font-medium hover:bg-secondary/10 transition-colors"
          >
            <OpenInNewOutlined style={{ fontSize: 16 }} />
            Ouvrir le PDF
          </a>
        )}
      </div>

      {jsonError && (
        <p className="text-body-sm text-error">{jsonError}</p>
      )}

      <div className="rounded-xl border border-outline-variant overflow-hidden">
        <div className="bg-surface-container px-md py-sm border-b border-outline-variant">
          <span className="text-label-md text-on-surface-variant font-medium">
            Layout JSON (CSS Paged Media — WeasyPrint)
          </span>
        </div>
        <textarea
          value={jsonText}
          onChange={(e) => handleJsonChange(e.target.value)}
          readOnly={!canManage}
          rows={28}
          spellCheck={false}
          className="w-full p-md font-mono text-body-sm text-on-surface bg-surface-container-lowest resize-y outline-none border-none"
        />
      </div>

      <div className="rounded-xl bg-surface-container border border-outline-variant p-md">
        <p className="text-label-md font-semibold text-on-surface-variant mb-sm">
          Blocs disponibles
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-xs text-body-sm text-on-surface-variant">
          {["TEXT", "LABEL_VALUE", "TABLE", "IMAGE", "COLUMNS", "DIVIDER", "SPACER"].map((b) => (
            <code key={b} className="font-mono text-primary text-label-sm bg-primary/5 rounded px-xs py-0.5">
              {b}
            </code>
          ))}
        </div>
        <p className="text-label-sm text-on-surface-variant mt-sm">
          Sections : <code className="font-mono">body</code>, <code className="font-mono">header_all</code>,{" "}
          <code className="font-mono">header_first</code>, <code className="font-mono">footer_all</code>,{" "}
          <code className="font-mono">footer_last</code>
        </p>
      </div>
    </div>
  );
}

// ─── Settings tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  templateKey,
  template,
  workspaceId,
  userId,
  canManage,
}: {
  templateKey: string;
  template: PDFTemplate;
  workspaceId: number;
  userId: number;
  canManage: boolean;
}) {
  const workspaceVars = template.variables.filter((v) => v.source === "workspace");
  const [data, setData] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSettings(templateKey, workspaceId).then((s) => {
      setData(s.data as Record<string, string>);
      setLoaded(true);
    });
  }, [templateKey, workspaceId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveSettings(templateKey, workspaceId, userId, data);
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <div className="text-body-md text-on-surface-variant">Chargement…</div>;

  if (workspaceVars.length === 0) {
    return (
      <div className="text-body-md text-on-surface-variant">
        Ce template n&apos;a pas de variables workspace à configurer.
      </div>
    );
  }

  return (
    <div className="space-y-md max-w-lg">
      <p className="text-body-sm text-on-surface-variant">
        Ces valeurs sont pré-renseignées pour ce workspace et réutilisées à chaque génération de
        document.
      </p>

      {workspaceVars.map((v) => (
        <div key={v.key}>
          <label className="block text-label-md text-on-surface-variant mb-xs">
            {v.label}
            {v.required && <span className="text-error ml-xs">*</span>}
          </label>
          <input
            type="text"
            value={data[v.key] ?? ""}
            onChange={(e) => {
              setSaved(false);
              setData((d) => ({ ...d, [v.key]: e.target.value }));
            }}
            readOnly={!canManage}
            placeholder={`Entrez ${v.label.toLowerCase()}`}
            className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-md py-sm text-body-md text-on-surface outline-none focus:border-primary transition-colors"
          />
        </div>
      ))}

      {error && <p className="text-body-sm text-error">{error}</p>}

      {canManage && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-xs rounded-lg bg-primary text-on-primary px-md py-sm text-body-sm font-medium disabled:opacity-50 hover:bg-primary-container transition-colors"
        >
          {saved && <CheckOutlined style={{ fontSize: 16 }} />}
          {saving ? "Sauvegarde…" : saved ? "Sauvegardé" : "Sauvegarder"}
        </button>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TemplatePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = use(params);
  const workspace = useSessionStore((s) => s.activeWorkspace);
  const user = useSessionStore((s) => s.user);
  const { can } = usePermissions();
  const canManage = can("documents.templates.manage");

  const [tab, setTab] = useState<Tab>("variables");
  const [template, setTemplate] = useState<PDFTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTemplate(key)
      .then(setTemplate)
      .catch((e) => setError(e.message));
  }, [key]);

  const workspaceId = workspace?.id ?? 0;
  const userId = user?.id ?? 0;

  const tabs: { id: Tab; label: string }[] = [
    { id: "variables", label: "Variables" },
    { id: "presentation", label: "Présentation" },
    { id: "settings", label: "Paramètres workspace" },
  ];

  return (
    <DashboardShell>
      <div className="p-lg">
        <div className="mb-lg">
          <Link
            href="/"
            className="inline-flex items-center gap-xs text-body-sm text-on-surface-variant hover:text-on-surface mb-sm"
          >
            <ArrowBackOutlined style={{ fontSize: 16 }} />
            Templates PDF
          </Link>
          {template ? (
            <>
              <h1 className="text-headline-md text-on-surface">{template.name}</h1>
              <div className="flex items-center gap-sm mt-xs">
                <span className="text-label-sm text-on-surface-variant bg-surface-container rounded-full px-sm py-0.5">
                  {template.app_key}
                </span>
                <span className="text-body-sm text-on-surface-variant font-mono">{template.key}</span>
              </div>
              {template.description && (
                <p className="text-body-sm text-on-surface-variant mt-sm">{template.description}</p>
              )}
            </>
          ) : error ? (
            <div className="text-body-md text-error">{error}</div>
          ) : (
            <div className="h-7 w-48 bg-surface-container rounded animate-pulse" />
          )}
        </div>

        {template && (
          <>
            {/* Tabs */}
            <div className="border-b border-outline-variant mb-lg">
              <div className="flex gap-md">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={[
                      "pb-sm text-body-md font-medium border-b-2 transition-colors",
                      tab === t.id
                        ? "border-primary text-primary"
                        : "border-transparent text-on-surface-variant hover:text-on-surface",
                    ].join(" ")}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {tab === "variables" && <VariablesTab variables={template.variables} />}

            {tab === "presentation" && (
              <PresentationTab
                templateKey={key}
                template={template}
                workspaceId={workspaceId}
                userId={userId}
                canManage={canManage}
              />
            )}

            {tab === "settings" && (
              <SettingsTab
                templateKey={key}
                template={template}
                workspaceId={workspaceId}
                userId={userId}
                canManage={canManage}
              />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
