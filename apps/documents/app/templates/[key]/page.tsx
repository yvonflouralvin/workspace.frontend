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
  RestartAltOutlined,
} from "@mui/icons-material";

/** Squelettes insérables — les types que sait rendre le moteur WeasyPrint. */
const BLOCK_SNIPPETS: { type: string; snippet: string }[] = [
  { type: "TEXT", snippet: '{ "type": "TEXT", "text": "" }' },
  { type: "LABEL_VALUE", snippet: '{ "type": "LABEL_VALUE", "label": "", "variable": "" }' },
  { type: "TABLE", snippet: '{ "type": "TABLE", "variable": "", "columns": [] }' },
  { type: "IMAGE", snippet: '{ "type": "IMAGE", "variable": "" }' },
  { type: "COLUMNS", snippet: '{ "type": "COLUMNS", "columns": [{ "width": "50%", "blocks": [] }] }' },
  { type: "DIVIDER", snippet: '{ "type": "DIVIDER" }' },
  { type: "SPACER", snippet: '{ "type": "SPACER", "height": 8 }' },
];

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

  // L'aperçu se recompose tout seul après une modification valide : le design
  // demande un aperçu continu, pas un bouton à cliquer.
  useEffect(() => {
    if (jsonError || !jsonText) return;
    const timer = setTimeout(() => void handlePreview(), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jsonText, jsonError]);

  /** Insère un fragment JSON à la position du curseur dans l'éditeur. */
  function insertAtCursor(fragment: string) {
    const el = document.getElementById("layout-json") as HTMLTextAreaElement | null;
    if (!el) return;
    const start = el.selectionStart ?? jsonText.length;
    const end = el.selectionEnd ?? start;
    const next = jsonText.slice(0, start) + fragment + jsonText.slice(end);
    handleJsonChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + fragment.length, start + fragment.length);
    });
  }

  async function restoreDefault() {
    if (!template.default_layout) return;
    const text = JSON.stringify(template.default_layout, null, 2);
    handleJsonChange(text);
  }

  return (
    <div className="space-y-4">
      {layoutData?.is_default && (
        <div className="rounded-xl bg-surface-container-low border border-outline-soft px-3.5 py-3 text-body-sm text-on-surface-variant">
          Aucune mise en page personnalisée pour ce workspace — c&apos;est le modèle par
          défaut qui s&apos;affiche. Enregistrez pour créer votre version.
        </div>
      )}

      <div className="flex items-center gap-2.5 flex-wrap">
        {canManage && (
          <button
            onClick={handleSave}
            disabled={saving || !!jsonError}
            className="inline-flex items-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button disabled:opacity-50 hover:bg-primary-container transition-colors"
          >
            {saved && <CheckOutlined style={{ fontSize: 16 }} />}
            {saving ? "Enregistrement…" : saved ? "Enregistré" : "Enregistrer"}
          </button>
        )}
        {canManage && template.default_layout && (
          <button
            onClick={restoreDefault}
            className="inline-flex items-center gap-1.5 h-11 md:h-[38px] px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <RestartAltOutlined style={{ fontSize: 16 }} />
            Revenir au défaut
          </button>
        )}
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-11 md:h-[38px] px-3.5 rounded-lg border border-outline-soft text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <OpenInNewOutlined style={{ fontSize: 16 }} />
            Ouvrir le PDF
          </a>
        )}
        <span className="text-label-md text-outline">
          {previewing ? "Aperçu en cours…" : jsonError ? "" : "Aperçu à jour"}
        </span>
      </div>

      {jsonError && <p className="text-body-sm text-error">{jsonError}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_400px] gap-4 items-start">
        {/* Palette : blocs et variables insérables */}
        <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-3 space-y-4">
          <div>
            <p className="text-label-sm uppercase text-outline mb-2">Blocs</p>
            <div className="flex flex-wrap gap-1.5">
              {BLOCK_SNIPPETS.map((b) => (
                <button
                  key={b.type}
                  type="button"
                  disabled={!canManage}
                  onClick={() => insertAtCursor(b.snippet)}
                  title={`Insérer un bloc ${b.type}`}
                  className="rounded-md bg-primary/5 px-2 py-1 font-mono text-label-sm text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
                >
                  {b.type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-label-sm uppercase text-outline mb-2">Variables</p>
            <div className="flex flex-col gap-1 max-h-[420px] overflow-y-auto">
              {template.variables.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  disabled={!canManage}
                  onClick={() =>
                    insertAtCursor(`{ "type": "TEXT", "variable": "${v.key}" }`)
                  }
                  title={`Insérer ${v.key}`}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left hover:bg-surface-container-low disabled:opacity-50 transition-colors"
                >
                  <span
                    className={`w-1.5 h-1.5 flex-none rounded-full ${
                      v.source === "entity" ? "bg-tertiary" : "bg-primary"
                    }`}
                    title={v.source === "entity" ? "Fournie par l'app" : "Saisie par le workspace"}
                  />
                  <span className="flex-1 min-w-0 truncate text-body-sm text-on-surface">
                    {v.label}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-outline mt-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-tertiary align-middle" />{" "}
              fournie par l&apos;app ·{" "}
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary align-middle" />{" "}
              saisie par le workspace
            </p>
          </div>
        </aside>

        {/* Source de la mise en page */}
        <div className="rounded-2xl border border-outline-soft overflow-hidden">
          <div className="flex items-center gap-2 bg-surface-row-alt px-4 py-2.5 border-b border-outline-soft">
            <span className="text-label-sm uppercase text-outline">Mise en page</span>
            <span className="ml-auto text-[11px] text-outline">
              Sections : body · header_all · header_first · footer_all · footer_last
            </span>
          </div>
          <textarea
            id="layout-json"
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            readOnly={!canManage}
            rows={26}
            spellCheck={false}
            className="w-full p-4 font-mono text-body-sm text-on-surface bg-surface-container-lowest resize-y outline-none border-none"
          />
        </div>

        {/* Aperçu continu */}
        <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
          <div className="flex items-center gap-2 bg-surface-row-alt px-4 py-2.5 border-b border-outline-soft">
            <span className="text-label-sm uppercase text-outline">Aperçu</span>
            {previewing && <span className="ml-auto text-[11px] text-outline">génération…</span>}
          </div>
          {previewUrl ? (
            <iframe
              key={previewUrl}
              src={previewUrl}
              title="Aperçu du document"
              className="w-full h-[560px] bg-surface-container-low"
            />
          ) : (
            <p className="px-4 py-8 text-center text-body-sm text-on-surface-variant">
              L&apos;aperçu se génère automatiquement après chaque modification valide.
            </p>
          )}
        </aside>
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
    <div className="space-y-md max-w-[32rem]">
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
