// packages/approval-flows/components/ApprovalFlowWrapper.tsx
//
// Composant d'intégration mode 1 — une app embarque un formulaire de soumission
// généré depuis le fields_schema d'un flow déjà enregistré (template) en ne
// renseignant que son id. `basePath` doit pointer vers le proxy BFF de l'app
// hôte (ex: "/api/approval-flows" dans hr), jamais vers le service directement.

"use client";

import { useState } from "react";
import { useApprovalFlow } from "../hooks/useApprovalFlow.js";
import { submitRequest } from "../api/client.js";
import type { RequestDetail } from "../types/request.js";

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
  const [values, setValues] = useState<Record<string, string>>({});
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const fieldValues: Record<string, unknown> = {};
      for (const field of version.fields_schema) {
        fieldValues[field.key] = field.type === "number" ? Number(values[field.key]) : values[field.key];
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
          <input
            type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
            required={field.required}
            value={values[field.key] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary disabled:opacity-50"
      >
        {submitting ? "Envoi…" : "Soumettre"}
      </button>
    </form>
  );
}
