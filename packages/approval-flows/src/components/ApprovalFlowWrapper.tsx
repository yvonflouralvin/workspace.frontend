// packages/approval-flows/components/ApprovalFlowWrapper.tsx
//
// Composant d'intégration mode 1 — une app embarque un formulaire de soumission
// généré depuis le fields_schema d'un flow déjà enregistré (template) en ne
// renseignant que son id. `basePath` doit pointer vers le proxy BFF de l'app
// hôte (ex: "/api/approval-flows" dans hr), jamais vers le service directement.

"use client";

import { useState } from "react";
import { useApprovalFlow } from "../hooks/useApprovalFlow.js";
import { submitRequest, uploadAttachment } from "../api/client.js";
import type { RequestDetail } from "../types/request.js";

interface AttachmentUploadState {
  uploading: boolean;
  filename: string | null;
  error: string | null;
}

export function ApprovalFlowWrapper({
  flowId,
  basePath,
  externalRef,
  callbackUrl,
  onSubmitted,
}: {
  flowId: string;
  basePath?: string;
  externalRef?: Record<string, unknown>;
  callbackUrl?: string;
  onSubmitted?: (request: RequestDetail) => void;
}) {
  const { flow, loading, error } = useApprovalFlow(flowId, basePath);
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [attachments, setAttachments] = useState<Record<string, AttachmentUploadState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<RequestDetail | null>(null);

  if (loading) {
    return <p className="text-sm text-on-surface-variant">Chargement du formulaire…</p>;
  }

  if (error || !flow) {
    return <p className="text-sm text-error">{error ?? "Flow introuvable."}</p>;
  }

  if (!flow.configured || !flow.published_version) {
    return (
      <p className="text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2">
        L&apos;admin doit configurer l&apos;approval flow.
      </p>
    );
  }

  if (submitted) {
    return (
      <p className="text-sm text-on-surface bg-surface-container rounded-lg px-3 py-2">
        Demande envoyée — statut : {submitted.status}.
      </p>
    );
  }

  const version = flow.published_version;

  async function handleFileChange(fieldKey: string, file: File | null) {
    if (!file) return;
    setAttachments((prev) => ({ ...prev, [fieldKey]: { uploading: true, filename: null, error: null } }));
    try {
      const result = await uploadAttachment(file, basePath);
      setValues((prev) => ({ ...prev, [fieldKey]: String(result.document_id) }));
      setAttachments((prev) => ({
        ...prev,
        [fieldKey]: { uploading: false, filename: result.filename, error: null },
      }));
    } catch (err) {
      setAttachments((prev) => ({
        ...prev,
        [fieldKey]: {
          uploading: false,
          filename: null,
          error: err instanceof Error ? err.message : "Échec de l'envoi du fichier",
        },
      }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const missingAttachment = version.fields_schema.find(
      (field) => field.type === "attachment" && field.required && !values[field.key]
    );
    if (missingAttachment) {
      setSubmitError(`Le champ « ${missingAttachment.label} » requiert une pièce jointe.`);
      return;
    }

    setSubmitting(true);
    try {
      const fieldValues: Record<string, unknown> = {};
      for (const field of version.fields_schema) {
        const raw = values[field.key];
        if (field.type === "number") {
          fieldValues[field.key] = Number(raw);
        } else if (field.type === "attachment") {
          fieldValues[field.key] = raw ? Number(raw) : null;
        } else if (field.type === "multi_choice") {
          fieldValues[field.key] = Array.isArray(raw) ? raw : [];
        } else {
          fieldValues[field.key] = raw ?? "";
        }
      }

      const request = await submitRequest(
        { flow_id: flowId, field_values: fieldValues, external_ref: externalRef, callback_url: callbackUrl },
        basePath
      );
      setSubmitted(request);
      onSubmitted?.(request);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-on-surface">{version.title}</h3>
        {version.description && (
          <p className="text-sm text-on-surface-variant mt-1">{version.description}</p>
        )}
      </div>

      {submitError && (
        <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{submitError}</p>
      )}

      {version.fields_schema.map((field) => (
        <div key={field.key} className="space-y-1">
          <label className="text-sm font-medium text-on-surface">{field.label}</label>
          {field.description && (
            <p className="text-xs text-on-surface-variant">{field.description}</p>
          )}

          {field.type === "text_long" ? (
            <textarea
              required={field.required}
              value={(values[field.key] as string) ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
            />
          ) : field.type === "single_choice" ? (
            <select
              required={field.required}
              value={(values[field.key] as string) ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
            >
              <option value="" disabled>
                Sélectionner…
              </option>
              {(field.options ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : field.type === "multi_choice" ? (
            <div className="space-y-1">
              {(field.options ?? []).map((option) => {
                const selected = (values[field.key] as string[] | undefined) ?? [];
                const checked = selected.includes(option);
                return (
                  <label key={option} className="flex items-center gap-2 text-sm text-on-surface">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setValues((prev) => {
                          const prevSelected = (prev[field.key] as string[] | undefined) ?? [];
                          return {
                            ...prev,
                            [field.key]: e.target.checked
                              ? [...prevSelected, option]
                              : prevSelected.filter((o) => o !== option),
                          };
                        })
                      }
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          ) : field.type === "attachment" ? (
            <div className="space-y-1">
              <input
                type="file"
                onChange={(e) => handleFileChange(field.key, e.target.files?.[0] ?? null)}
                className="w-full text-sm text-on-surface"
              />
              {attachments[field.key]?.uploading && (
                <p className="text-xs text-on-surface-variant">Envoi en cours…</p>
              )}
              {attachments[field.key]?.filename && (
                <p className="text-xs text-on-surface-variant">Fichier joint : {attachments[field.key]?.filename}</p>
              )}
              {attachments[field.key]?.error && (
                <p className="text-xs text-error">{attachments[field.key]?.error}</p>
              )}
            </div>
          ) : (
            <input
              type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
              required={field.required}
              value={(values[field.key] as string) ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
            />
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={submitting || Object.values(attachments).some((a) => a.uploading)}
        className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary disabled:opacity-50"
      >
        {submitting ? "Envoi…" : "Soumettre"}
      </button>
    </form>
  );
}
