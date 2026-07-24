"use client";

import { useEffect, useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { CheckCircleOutlined } from "@mui/icons-material";
import {
  type LabRequest,
  type LabResult,
  type LabTestDetail,
  type ResultValueInput,
  getRequestResults,
  createResult,
  updateResult,
  getLabTestDetail,
} from "@/app/lib/lab-api";
import { ContextSnapshotCard, ResultValueRow } from "./shared";

type ItemWithResults = {
  item: LabRequest["items"][number];
  result: LabResult | null;
  testDetail: LabTestDetail | null;
};

export function ResultsDrawer({
  req,
  onClose,
  onDone,
  canTechnician,
}: {
  req: LabRequest;
  onClose: () => void;
  onDone: () => void;
  canTechnician: boolean;
}) {
  const [itemsData, setItemsData] = useState<ItemWithResults[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeItemId, setActiveItemId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedResults, setSavedResults] = useState<Record<number, LabResult>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [results, ...details] = await Promise.all([
          getRequestResults(req.id),
          ...req.items.map((item) => getLabTestDetail(item.lab_test_id)),
        ]);
        const resultsByItemId: Record<number, LabResult> = {};
        for (const r of results) resultsByItemId[r.lab_request_item_id] = r;
        setItemsData(
          req.items.map((item, idx) => ({
            item,
            result: resultsByItemId[item.id] ?? null,
            testDetail: (details[idx] as LabTestDetail | undefined) ?? null,
          })),
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [req]);

  async function handleSaveItem(itemId: number, testDetail: LabTestDetail | null, existingResult: LabResult | null) {
    if (!testDetail) return;
    setSaving(true);
    setError(null);
    try {
      const values: ResultValueInput[] = testDetail.parameters
        .filter((p) => p.active)
        .map((p) => {
          const raw = formValues[p.id] ?? "";
          if (p.value_type === "NUMERIC") {
            return { lab_parameter_id: p.id, value_numeric: raw.trim() ? parseFloat(raw) : undefined };
          }
          return { lab_parameter_id: p.id, value_text: raw.trim() || undefined };
        });

      let result: LabResult;
      if (existingResult && existingResult.status === "SAISI") {
        result = await updateResult(existingResult.id, values);
      } else {
        result = await createResult(itemId, values);
      }
      setSavedResults((prev) => ({ ...prev, [itemId]: result }));
      setActiveItemId(null);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RightDrawer
      title={`Résultats — ${req.patient?.prenom} ${req.patient?.nom}`}
      onClose={onClose}
      width="w-[560px] max-w-full"
      contentClassName="px-6 py-5 overflow-y-auto space-y-5">

      <ContextSnapshotCard req={req} />

      {loading ? (
        <div className="space-y-3">
          {req.items.map((item) => (
            <div key={item.id} className="h-16 rounded-xl bg-surface-container animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {itemsData.map(({ item, result: existingResult, testDetail }) => {
            const currentResult = savedResults[item.id] ?? existingResult;
            const isValide = currentResult?.status === "VALIDE";
            const hasSaisi = currentResult?.status === "SAISI" || currentResult?.status === "REVISE";
            const collected = item.status !== "EN_ATTENTE";
            const isOpen = activeItemId === item.id;

            return (
              <div key={item.id} className="rounded-xl border border-outline-variant bg-surface">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                  onClick={() => setActiveItemId(isOpen ? null : item.id)}>
                  <span className="text-body-sm font-semibold text-on-surface">{item.lab_test_name_cache}</span>
                  <div className="flex items-center gap-2">
                    {isValide && <CheckCircleOutlined style={{ fontSize: 16 }} className="text-secondary" />}
                    {hasSaisi && !isValide && <span className="text-label-xs px-1.5 py-0.5 rounded-full bg-locked-container text-locked">Saisi</span>}
                    {!collected && <span className="text-label-xs px-1.5 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">Non prélevé</span>}
                    <span className="text-on-surface-variant text-xs">{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-outline-variant/50 px-4 py-4 space-y-3">
                    {currentResult && (
                      <div className="space-y-2">
                        {currentResult.values.map((v) => <ResultValueRow key={v.id} v={v} />)}
                      </div>
                    )}

                    {!collected && (
                      <p className="text-body-sm text-on-surface-variant/70 italic">
                        Cet examen n&apos;a pas encore été prélevé — la saisie des résultats n&apos;est pas possible.
                      </p>
                    )}

                    {canTechnician && !isValide && collected && testDetail && (
                      <div className="space-y-3 pt-2">
                        <p className="text-label-md font-medium text-on-surface-variant uppercase tracking-wide">
                          {currentResult ? "Corriger les valeurs" : "Saisir les valeurs"}
                        </p>
                        {testDetail.parameters.filter((p) => p.active).map((p) => {
                          const existing = currentResult?.values.find((v) => v.lab_parameter_id === p.id);
                          const existingVal = existing?.value_numeric?.toString() ?? existing?.value_text ?? "";
                          return (
                            <div key={p.id} className="flex items-center gap-3">
                              <label className="text-body-sm text-on-surface-variant w-40 shrink-0">
                                {p.name}
                                {p.unit && <span className="text-on-surface-variant/60 ml-1">({p.unit})</span>}
                              </label>
                              <input
                                type={p.value_type === "NUMERIC" ? "number" : "text"}
                                step="any"
                                value={formValues[p.id] ?? existingVal}
                                onChange={(e) => setFormValues((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                placeholder="—"
                                className="flex-1 rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-tertiary" />
                            </div>
                          );
                        })}

                        {error && <p className="text-body-sm text-error">{error}</p>}

                        <button
                          onClick={() => handleSaveItem(item.id, testDetail, currentResult ?? null)}
                          disabled={saving}
                          className="w-full py-2 rounded-xl bg-secondary text-on-primary text-body-sm font-semibold hover:bg-secondary/90 transition-colors disabled:opacity-40">
                          {saving ? "Enregistrement…" : "Enregistrer"}
                        </button>
                      </div>
                    )}

                    {isValide && (
                      <p className="text-body-sm text-secondary flex items-center gap-1.5">
                        <CheckCircleOutlined style={{ fontSize: 16 }} />
                        Validé
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </RightDrawer>
  );
}
