"use client";

import { useEffect, useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { CheckCircleOutlined } from "@mui/icons-material";
import {
  type LabRequest,
  type LabResult,
  type ResultValueInput,
  getRequestResults,
  validateResult,
  reviseResult,
} from "@/app/lib/lab-api";
import { ContextSnapshotCard, ResultValueRow, formatDate } from "./shared";

const RESULT_STATUS_LABEL: Record<string, string> = {
  SAISI:  "Saisi",
  VALIDE: "Validé",
  REVISE: "Révisé",
};

export function ValidationDrawer({
  req,
  onClose,
  onDone,
  canValidate,
}: {
  req: LabRequest;
  onClose: () => void;
  onDone: () => void;
  canValidate: boolean;
}) {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [conclusion, setConclusion] = useState("");
  const [validating, setValidating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviseTarget, setReviseTarget] = useState<LabResult | null>(null);
  const [reviseReason, setReviseReason] = useState("");
  const [reviseSaving, setReviseSaving] = useState(false);

  useEffect(() => {
    getRequestResults(req.id)
      .then(setResults)
      .finally(() => setLoading(false));
  }, [req.id]);

  async function handleValidate(resultId: number) {
    setValidating(resultId);
    setError(null);
    try {
      const updated = await validateResult(resultId, conclusion || undefined);
      setResults((prev) => prev.map((r) => (r.id === resultId ? updated : r)));
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la validation.");
    } finally {
      setValidating(null);
    }
  }

  async function handleRevise(result: LabResult) {
    if (!reviseReason.trim()) return;
    setReviseSaving(true);
    const values: ResultValueInput[] = result.values.map((v) => ({
      lab_parameter_id: v.lab_parameter_id,
      value_numeric: v.value_numeric ?? undefined,
      value_text: v.value_text ?? undefined,
    }));
    try {
      const updated = await reviseResult(result.id, reviseReason, values);
      setResults((prev) => prev.map((r) => (r.id === result.id ? updated : r)));
      setReviseTarget(null);
      setReviseReason("");
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la révision.");
    } finally {
      setReviseSaving(false);
    }
  }

  return (
    <RightDrawer
      title={`Validation — ${req.patient?.prenom} ${req.patient?.nom}`}
      onClose={onClose}
      width="w-[560px] max-w-full"
      contentClassName="px-6 py-5 overflow-y-auto space-y-5">

      <ContextSnapshotCard req={req} />

      {loading ? (
        <p className="text-body-sm text-on-surface-variant">Chargement…</p>
      ) : (
        <div className="space-y-5">
          {results.map((result) => {
            const itemName = req.items.find((i) => i.id === result.lab_request_item_id)?.lab_test_name_cache ?? "Examen";
            const isValide = result.status === "VALIDE";
            const isSaisi = result.status === "SAISI";

            return (
              <div key={result.id} className="rounded-xl border border-outline-variant bg-surface">
                <div className="px-4 py-3 flex items-center justify-between border-b border-outline-variant/50">
                  <span className="text-body-sm font-semibold text-on-surface">{itemName}</span>
                  <span className={`text-label-xs px-2 py-0.5 rounded-full font-medium ${isValide ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                    {RESULT_STATUS_LABEL[result.status] ?? result.status}
                  </span>
                </div>

                <div className="px-4 py-4 space-y-2">
                  {result.values.map((v) => <ResultValueRow key={v.id} v={v} />)}

                  {isValide && (
                    <div className="pt-2 space-y-1">
                      <p className="text-body-sm text-secondary flex items-center gap-1.5">
                        <CheckCircleOutlined style={{ fontSize: 16 }} />
                        Validé le {result.validated_at ? formatDate(result.validated_at) : "—"}
                      </p>
                      {result.conclusion && (
                        <p className="text-body-sm text-on-surface-variant italic">{result.conclusion}</p>
                      )}
                      {canValidate && (
                        <button
                          onClick={() => setReviseTarget(result)}
                          className="text-label-sm text-on-surface-variant hover:text-error transition-colors underline">
                          Corriger ce résultat
                        </button>
                      )}
                    </div>
                  )}

                  {isSaisi && canValidate && (
                    <div className="pt-2 space-y-2">
                      <div>
                        <label className="text-label-md font-medium text-on-surface-variant block mb-1">Conclusion biologiste (optionnel)</label>
                        <textarea
                          value={conclusion}
                          onChange={(e) => setConclusion(e.target.value)}
                          rows={2}
                          placeholder="Observations, commentaires…"
                          className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary resize-none" />
                      </div>
                      <button
                        onClick={() => handleValidate(result.id)}
                        disabled={validating === result.id}
                        className="w-full py-2 rounded-xl bg-secondary text-on-primary text-body-sm font-medium hover:opacity-90 transition-colors disabled:opacity-40">
                        {validating === result.id ? "Validation…" : "Valider ce résultat (immuable)"}
                      </button>
                    </div>
                  )}

                  {isSaisi && !canValidate && (
                    <p className="text-body-sm text-on-surface-variant/60 italic pt-2">
                      Consultation uniquement — vous n&apos;avez pas le droit de valider.
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {error && (
            <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>
      )}

      {reviseTarget && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40">
          <div className="bg-surface rounded-2xl border border-outline-variant p-6 max-w-[448px] w-full mx-4 space-y-4">
            <h3 className="text-body-md font-semibold text-on-surface">Corriger le résultat</h3>
            <p className="text-body-sm text-on-surface-variant">
              La correction sera tracée. Le snapshot de prélèvement restera inchangé.
            </p>
            <div>
              <label className="text-label-md font-medium text-on-surface-variant block mb-1">
                Motif de correction <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={reviseReason}
                onChange={(e) => setReviseReason(e.target.value)}
                placeholder="Ex : erreur de saisie, vérification…"
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setReviseTarget(null); setReviseReason(""); }}
                className="flex-1 px-4 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                Annuler
              </button>
              <button
                onClick={() => handleRevise(reviseTarget)}
                disabled={reviseSaving || !reviseReason.trim()}
                className="flex-1 px-4 py-2 rounded-xl bg-error text-on-error text-body-sm font-medium hover:opacity-90 transition-colors disabled:opacity-40">
                {reviseSaving ? "Correction…" : "Confirmer la correction"}
              </button>
            </div>
          </div>
        </div>
      )}
    </RightDrawer>
  );
}
