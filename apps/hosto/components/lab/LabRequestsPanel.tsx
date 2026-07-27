"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { LabTrends } from "./LabTrends";
import {
  AddOutlined,
  BiotechOutlined,
  BlockOutlined,
  CancelOutlined,
  CheckCircleOutlined,
  ExpandMoreOutlined,
  LockOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import {
  type LabRequest,
  type LabRequestItem,
  type LabRequestStatus,
  type LabResult,
  type LabResultValue,
  type LabTestSummary,
  getPatientLabRequests,
  getEncounterLabRequests,
  getRequestResults,
  cancelLabRequest,
  createLabRequest,
  searchLabTests,
} from "@/app/lib/lab-api";
import {
  ContextSnapshotCard,
  ResultValueRow,
  FlagBadge,
} from "@/components/laboratory/shared";
import {
  getPatientEncounters,
  createEncounter,
  type EncounterRead,
} from "@/app/lib/emr-api";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STEPS: LabRequestStatus[] = ["DEMANDE", "PRELEVE", "EN_ANALYSE", "VALIDE"];

const STATUS_LABEL: Record<LabRequestStatus, string> = {
  DEMANDE:    "Demandé",
  PARTIELLEMENT_PRELEVE: "Part. prélevé",
  PRELEVE:    "Prélevé",
  EN_ANALYSE: "En analyse",
  VALIDE:     "Validé",
  ANNULE:     "Annulé",
};

const STATUS_CLS: Record<LabRequestStatus, string> = {
  DEMANDE:    "bg-blue-100 text-blue-700",
  PARTIELLEMENT_PRELEVE: "bg-amber-100 text-amber-800",
  PRELEVE:    "bg-yellow-100 text-yellow-800",
  EN_ANALYSE: "bg-orange-100 text-orange-800",
  VALIDE:     "bg-secondary/10 text-secondary",
  ANNULE:     "bg-error-container text-error",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatValue(v: LabResultValue): string {
  if (v.value_numeric !== null && v.value_numeric !== undefined) {
    return v.unit_cache ? `${v.value_numeric} ${v.unit_cache}` : String(v.value_numeric);
  }
  return v.value_text ?? "–";
}

// ─── StatusStepper ────────────────────────────────────────────────────────────

function StatusStepper({ status }: { status: LabRequestStatus }) {
  if (status === "ANNULE") {
    return (
      <div className="flex items-center gap-2 pt-1">
        <CancelOutlined style={{ fontSize: 16 }} className="text-error" />
        <span className="text-body-sm text-error">Annulé</span>
      </div>
    );
  }

  const currentIdx = STATUS_STEPS.indexOf(status);

  return (
    <div className="flex items-center gap-0 mt-2">
      {STATUS_STEPS.map((step, idx) => {
        const done    = idx < currentIdx;
        const current = idx === currentIdx;
        const pending = idx > currentIdx;
        const isLast  = idx === STATUS_STEPS.length - 1;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center gap-0.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-label-xs font-bold transition-colors ${
                done    ? "bg-secondary text-on-primary"  :
                current ? "bg-primary text-on-primary"    :
                          "bg-surface-container text-on-surface-variant/40"
              }`}>
                {done ? <CheckCircleOutlined style={{ fontSize: 12 }} /> : idx + 1}
              </div>
              <span className={`text-label-xs whitespace-nowrap ${
                current ? "text-primary font-medium" :
                done    ? "text-secondary" :
                          "text-on-surface-variant/40"
              }`}>
                {STATUS_LABEL[step]}
              </span>
            </div>
            {!isLast && (
              <div className={`w-8 h-px mx-0.5 mb-3.5 ${done || current ? "bg-primary" : "bg-outline-variant"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── AbnormalSummary ─────────────────────────────────────────────────────────

function AbnormalSummary({ results }: { results: LabResult[] }) {
  const abnormals = results.flatMap((r) => r.values.filter((v) => v.abnormal));
  if (abnormals.length === 0) return null;

  const critiques = abnormals.filter((v) => v.interpretation === "CRITIQUE");
  const hauts     = abnormals.filter((v) => v.interpretation === "HAUT");
  const bas       = abnormals.filter((v) => v.interpretation === "BAS");

  return (
    <div className="rounded-xl bg-error-container/20 border border-error/20 px-4 py-3 space-y-2">
      <div className="flex items-center gap-1.5 text-body-sm font-semibold text-error">
        <WarningAmberOutlined style={{ fontSize: 16 }} />
        {abnormals.length} valeur{abnormals.length > 1 ? "s" : ""} hors norme{abnormals.length > 1 ? "s" : ""}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {critiques.map((v) => (
          <span key={v.id} className="flex items-center gap-1 text-label-xs">
            <FlagBadge flag="CRITIQUE" />
            <span className="text-on-surface-variant">{v.parameter_name_cache}</span>
          </span>
        ))}
        {hauts.map((v) => (
          <span key={v.id} className="flex items-center gap-1 text-label-xs">
            <FlagBadge flag="HAUT" />
            <span className="text-on-surface-variant">{v.parameter_name_cache}</span>
          </span>
        ))}
        {bas.map((v) => (
          <span key={v.id} className="flex items-center gap-1 text-label-xs">
            <FlagBadge flag="BAS" />
            <span className="text-on-surface-variant">{v.parameter_name_cache}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── ExamTable ────────────────────────────────────────────────────────────────

function ExamTable({ item, result }: { item: LabRequestItem; result: LabResult | null }) {
  return (
    <div className="rounded-xl border border-outline-variant overflow-hidden">
      <div className="px-4 py-2.5 bg-surface-container-low border-b border-outline-variant/50 flex items-center gap-2">
        <BiotechOutlined style={{ fontSize: 15 }} className="text-primary shrink-0" />
        <span className="text-body-sm font-semibold text-on-surface">{item.lab_test_name_cache}</span>
        {result?.status === "VALIDE" && result.validated_at && (
          <span className="ml-auto flex items-center gap-1 text-label-sm text-secondary">
            <CheckCircleOutlined style={{ fontSize: 12 }} />
            Validé {fmtDate(result.validated_at)}
          </span>
        )}
      </div>

      {result && result.values.length > 0 ? (
        <>
          <table className="w-full text-body-sm">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant/50">
                <th className="text-left py-2 px-4 text-label-md font-medium text-on-surface-variant">Paramètre</th>
                <th className="text-left py-2 px-4 text-label-md font-medium text-on-surface-variant">Valeur</th>
                <th className="text-left py-2 px-4 text-label-md font-medium text-on-surface-variant">Valeurs de référence</th>
                <th className="text-left py-2 px-4 text-label-md font-medium text-on-surface-variant">Observation</th>
              </tr>
            </thead>
            <tbody>
              {result.values.map((v) => (
                <tr key={v.id} className={`border-t border-outline-variant/30 ${v.abnormal ? "bg-error-container/10" : ""}`}>
                  <td className="py-2 px-4 text-on-surface">{v.parameter_name_cache}</td>
                  <td className={`py-2 px-4 font-mono ${v.abnormal ? "text-error font-semibold" : "text-on-surface"}`}>
                    {formatValue(v)}
                  </td>
                  <td className="py-2 px-4 text-on-surface-variant/70 text-label-sm">{v.reference_used ?? "–"}</td>
                  <td className="py-2 px-4">
                    {v.interpretation === "NORMAL"
                      ? <span className="text-secondary text-label-sm">Normal</span>
                      : <FlagBadge flag={v.interpretation} />
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.conclusion && (
            <div className="px-4 py-2.5 border-t border-outline-variant/40 text-body-sm text-on-surface-variant italic bg-surface-container-lowest">
              <span className="font-medium not-italic text-on-surface">Avis biologiste : </span>
              {result.conclusion}
            </div>
          )}
        </>
      ) : result ? (
        <div className="px-4 py-3 text-body-sm text-on-surface-variant/60 italic">Aucune valeur enregistrée.</div>
      ) : (
        <div className="px-4 py-3 flex items-center gap-2 text-body-sm text-on-surface-variant">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
          En attente des résultats
        </div>
      )}
    </div>
  );
}

// ─── ExamSections ─────────────────────────────────────────────────────────────

function ExamSections({ req }: { req: LabRequest }) {
  const [results, setResults] = useState<LabResult[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (req.status === "DEMANDE" || req.status === "ANNULE") {
      setResults([]);
      setLoading(false);
      return;
    }
    getRequestResults(req.id)
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [req.id, req.status]);

  if (loading) {
    return <div className="h-16 rounded-xl bg-surface-container animate-pulse" />;
  }

  const allValues = results?.flatMap((r) => r.values) ?? [];
  const hasAbnormals = allValues.some((v) => v.abnormal);

  return (
    <div className="space-y-3">
      {hasAbnormals && results && <AbnormalSummary results={results} />}
      {req.status === "VALIDE" && <ContextSnapshotCard req={req} />}
      {req.items.map((item) => {
        const result = results?.find((r) => r.lab_request_item_id === item.id) ?? null;
        return <ExamTable key={item.id} item={item} result={result} />;
      })}
    </div>
  );
}

// ─── LabRequestAccordion ──────────────────────────────────────────────────────

function LabRequestAccordion({
  req,
  canWrite,
  onRefresh,
}: {
  req: LabRequest;
  canWrite: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded]           = useState(false);
  const [cancelOpen, setCancelOpen]       = useState(false);
  const [cancelReason, setCancelReason]   = useState("");
  const [cancelling, setCancelling]       = useState(false);
  const [cancelError, setCancelError]     = useState<string | null>(null);

  const isUrgent  = req.priority === "URGENT";
  const canCancel = canWrite && req.status !== "VALIDE" && req.status !== "ANNULE";

  async function handleCancel() {
    if (!cancelReason.trim()) return;
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelLabRequest(req.id, cancelReason.trim());
      setCancelOpen(false);
      setCancelReason("");
      onRefresh();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Erreur lors de l'annulation.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <>
      <div className={`rounded-2xl border bg-surface-container-lowest transition-colors ${
        expanded ? "border-primary/40" : "border-outline-variant hover:border-primary/30"
      }`}>
        {/* Header */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-left px-5 py-3.5 flex items-center gap-3"
        >
          <span className={`inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_CLS[req.status]}`}>
            {STATUS_LABEL[req.status]}
          </span>

          {isUrgent && (
            <span className="inline-flex text-label-xs px-2 py-0.5 rounded-full bg-error/10 text-error font-medium shrink-0">
              URGENT
            </span>
          )}

          <div className="flex-1 min-w-0 flex items-baseline gap-3 flex-wrap">
            <span className="text-body-sm text-on-surface font-medium">
              {req.items.map((i) => i.lab_test_name_cache).join(", ")}
            </span>
            <span className="text-label-sm text-on-surface-variant/60">{fmtDate(req.requested_at)}</span>
            {req.clinical_info && (
              <span className="text-label-sm text-on-surface-variant/60 italic truncate max-w-[200px]">{req.clinical_info}</span>
            )}
          </div>

          <ExpandMoreOutlined
            style={{ fontSize: 20 }}
            className={`text-on-surface-variant/50 shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>

        {/* Corps dépliable */}
        {expanded && (
          <div className="border-t border-outline-variant px-5 py-4 space-y-4">
            {/* Renseignement clinique */}
            {req.clinical_info && (
              <div>
                <p className="text-label-md font-medium text-on-surface-variant uppercase tracking-wide mb-1">Renseignement clinique</p>
                <p className="text-body-sm text-on-surface italic">{req.clinical_info}</p>
              </div>
            )}

            {/* Examens avec tableaux de résultats */}
            <ExamSections req={req} />

            {/* Action annulation */}
            {canCancel && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCancelOpen(true); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-error/40 text-error text-body-sm hover:bg-error/8 transition-colors"
                >
                  <BlockOutlined style={{ fontSize: 14 }} />
                  Annuler la demande
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal annulation */}
      {cancelOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40">
          <div className="bg-surface rounded-2xl shadow-2xl p-6 w-full max-w-[448px]">
            <div className="flex items-start gap-3 mb-4">
              <BlockOutlined className="text-error shrink-0 mt-0.5" style={{ fontSize: 22 }} />
              <div>
                <h2 className="text-body-md font-semibold text-on-surface">Annuler la demande</h2>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  La demande sera annulée. Si le prélèvement est déjà réalisé, contacter le laboratoire.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-1 mb-4">
              <label className="text-label-md font-medium text-on-surface-variant">
                Motif <span className="text-error">*</span>
              </label>
              <textarea
                className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-error resize-none transition-colors"
                rows={2}
                placeholder="Ex : Examen non pertinent, doublon…"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                autoFocus
              />
            </div>
            {cancelError && (
              <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 mb-4">{cancelError}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setCancelOpen(false); setCancelReason(""); setCancelError(null); }}
                disabled={cancelling}
                className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling || !cancelReason.trim()}
                className="px-4 py-2 rounded-xl text-body-md bg-error text-on-error hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {cancelling ? "Annulation…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

// ─── LabRequestEditor ─────────────────────────────────────────────────────────

function LabRequestEditor({
  patientId,
  encounterId: encounterIdProp,
  onClose,
  onSaved,
  bare = false,
}: {
  patientId: number;
  encounterId?: number;
  onClose: () => void;
  onSaved: () => void;
  bare?: boolean;
}) {
  const [searchQuery, setSearchQuery]       = useState("");
  const [searchResults, setSearchResults]   = useState<LabTestSummary[]>([]);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [selectedTests, setSelectedTests]   = useState<LabTestSummary[]>([]);
  const [priority, setPriority]             = useState<"ROUTINE" | "URGENT">("ROUTINE");
  const [clinicalInfo, setClinicalInfo]     = useState("");
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [encounterLoading, setEncounterLoading] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function resolveEncounter(): Promise<number> {
    if (encounterIdProp) return encounterIdProp;
    setEncounterLoading(true);
    try {
      const { items } = await getPatientEncounters(patientId, { per_page: 10 });
      const ongoing = items.find((e: EncounterRead) => e.status === "EN_COURS");
      if (ongoing) return ongoing.id;
      const created = await createEncounter({ patient_id: patientId, type: "CONSULTATION", status: "EN_COURS" });
      return created.id;
    } finally {
      setEncounterLoading(false);
    }
  }

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchLabTests(q);
        setSearchResults(results.filter((r) => !selectedTests.some((s) => s.id === r.id)));
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }

  function addTest(test: LabTestSummary) {
    setSelectedTests((prev) => [...prev, test]);
    setSearchResults([]);
    setSearchQuery("");
  }

  function removeTest(id: number) {
    setSelectedTests((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedTests.length === 0) { setError("Ajoutez au moins un examen."); return; }
    setSaving(true);
    setError(null);
    try {
      const encId = await resolveEncounter();
      await createLabRequest({
        patient_id: patientId,
        encounter_id: encId,
        priority,
        clinical_info: clinicalInfo.trim() || undefined,
        items: selectedTests.map((t) => ({ lab_test_id: t.id })),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création.");
      setSaving(false);
    }
  }

  const content = (
    <form onSubmit={handleSubmit} className="space-y-5">
        {/* Priorité */}
        <div>
          <p className="text-label-md font-medium text-on-surface-variant uppercase tracking-wide mb-2">Priorité</p>
          <div className="flex gap-2">
            {(["ROUTINE", "URGENT"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`px-4 py-2 rounded-xl text-body-sm font-medium border transition-colors ${
                  priority === p
                    ? p === "URGENT"
                      ? "bg-error/10 border-error/40 text-error"
                      : "bg-primary/10 border-primary/40 text-primary"
                    : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {p === "ROUTINE" ? "Routine" : "⚡ Urgent"}
              </button>
            ))}
          </div>
        </div>

        {/* Renseignement clinique */}
        <div>
          <label className="text-label-md font-medium text-on-surface-variant uppercase tracking-wide block mb-1">
            Renseignement clinique <span className="text-label-sm normal-case">(optionnel)</span>
          </label>
          <textarea
            value={clinicalInfo}
            onChange={(e) => setClinicalInfo(e.target.value)}
            rows={2}
            placeholder="Ex : suspicion d'anémie, suivi traitement…"
            className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Picker d'examens */}
        <div>
          <p className="text-label-md font-medium text-on-surface-variant uppercase tracking-wide mb-2">Examens</p>

          {/* Examens sélectionnés */}
          {selectedTests.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedTests.map((test) => (
                <div key={test.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-body-sm text-primary">
                  <BiotechOutlined style={{ fontSize: 14 }} />
                  <span className="font-medium">{test.short_name ?? test.name}</span>
                  {test.parameter_count > 0 && (
                    <span className="text-label-xs text-primary/60">({test.parameter_count} params)</span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeTest(test.id)}
                    className="ml-1 text-primary/60 hover:text-error transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Champ de recherche */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Rechercher un examen (nom, code LOINC)…"
              className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary"
            />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            )}
          </div>

          {/* Résultats de recherche */}
          {searchResults.length > 0 && (
            <div className="mt-1 rounded-xl border border-outline-variant bg-surface shadow-md overflow-hidden">
              {searchResults.map((test) => (
                <button
                  key={test.id}
                  type="button"
                  onClick={() => addTest(test)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-surface-container transition-colors border-b border-outline-variant/50 last:border-0"
                >
                  <BiotechOutlined style={{ fontSize: 18 }} className="text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-body-sm font-medium text-on-surface">{test.name}</p>
                    <p className="text-label-sm text-on-surface-variant/60">
                      {[test.category, test.specimen, test.parameter_count > 0 ? `${test.parameter_count} paramètres` : null]
                        .filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {test.loinc_code && (
                    <span className="text-label-xs text-on-surface-variant/50 font-mono shrink-0">{test.loinc_code}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {selectedTests.length === 0 && (
            <p className="text-body-sm text-on-surface-variant/60 italic mt-2">
              Aucun examen ajouté. Recherchez ci-dessus pour ajouter des examens à la demande.
            </p>
          )}
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || selectedTests.length === 0 || encounterLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-body-sm font-medium hover:bg-primary-container transition-colors disabled:opacity-40"
          >
            {saving || encounterLoading ? "Envoi…" : `Envoyer la demande (${selectedTests.length})`}
          </button>
        </div>
    </form>
  );

  if (bare) {
    return <div className="h-full overflow-y-auto px-6 py-5">{content}</div>;
  }
  return (
    <RightDrawer
      title="Demander des examens"
      onClose={onClose}
      width="md:w-[520px] md:max-w-[92vw]"
      contentClassName="px-6 py-5 overflow-y-auto space-y-5"
    >
      {content}
    </RightDrawer>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-2" aria-busy>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
          <div className="flex items-center gap-4">
            <div className="h-5 w-20 rounded-full bg-surface-container animate-pulse" />
            <div className="h-4 w-48 rounded bg-surface-container animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── LabRequestsPanel ─────────────────────────────────────────────────────────

export function LabRequestsPanel({
  patientId,
  encounterId,
  onSplit,
  onCloseSplit,
}: {
  patientId: number | string;
  encounterId?: number | string;
  onSplit?: (title: string, content: React.ReactNode) => void;
  onCloseSplit?: () => void;
}) {
  const { can } = usePermissions();
  const canView  = can("hosto.emr.view");
  const canWrite = can("hosto.emr.write");

  const [items, setItems]             = useState<LabRequest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showEditor, setShowEditor]   = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [view, setView]               = useState<"demandes" | "evolution">("demandes");

  const load = useCallback(() => {
    if (!canView) return;
    setLoading(true);
    setError(null);

    const fetcher = encounterId
      ? getEncounterLabRequests(encounterId)
      : getPatientLabRequests(patientId, { include_cancelled: true, per_page: 50 });

    fetcher
      .then((res) => {
        const sorted = [...res.items].sort(
          (a, b) => new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime(),
        );
        setItems(sorted);
      })
      .catch(() => setError("Impossible de charger les demandes d'examens."))
      .finally(() => setLoading(false));
  }, [patientId, encounterId, canView]);

  useEffect(() => { load(); }, [load]);

  function openEditor() {
    if (onSplit) {
      onSplit("Demander des examens", (
        <LabRequestEditor
          patientId={Number(patientId)}
          encounterId={encounterId !== undefined ? Number(encounterId) : undefined}
          bare
          onClose={() => onCloseSplit?.()}
          onSaved={() => { load(); onCloseSplit?.(); }}
        />
      ));
    } else {
      setShowEditor(true);
    }
  }

  if (!canView) {
    return (
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
        <LockOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
        <p className="text-body-md text-on-surface-variant">Vous n&apos;avez pas accès aux examens.</p>
      </div>
    );
  }

  const visible = showCancelled ? items : items.filter((r) => r.status !== "ANNULE");
  const cancelledCount = items.filter((r) => r.status === "ANNULE").length;

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-body-md font-semibold text-on-surface">Examens biologiques</h2>
          {!loading && (
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              {items.filter((r) => r.status !== "ANNULE").length} demande
              {items.filter((r) => r.status !== "ANNULE").length !== 1 ? "s" : ""}
              {cancelledCount > 0 && !showCancelled && (
                <button
                  type="button"
                  onClick={() => setShowCancelled(true)}
                  className="ml-2 text-label-sm text-on-surface-variant/60 underline underline-offset-2 hover:text-on-surface transition-colors"
                >
                  +{cancelledCount} annulée{cancelledCount > 1 ? "s" : ""}
                </button>
              )}
              {showCancelled && cancelledCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCancelled(false)}
                  className="ml-2 text-label-sm text-on-surface-variant/60 underline underline-offset-2 hover:text-on-surface transition-colors"
                >
                  Masquer les annulées
                </button>
              )}
            </p>
          )}
        </div>

        {canWrite && view === "demandes" && (
          <button
            type="button"
            onClick={openEditor}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 18 }} />
            Demander des examens
          </button>
        )}
      </div>

      {/* Sous-onglets */}
      <div className="flex gap-1 border-b border-outline-variant mb-4">
        {([["demandes", "Demandes"], ["evolution", "Évolution"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`px-4 py-2 text-body-sm font-medium border-b-2 -mb-px transition-colors ${
              view === key ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "evolution" && <LabTrends patientId={patientId} />}

      {view === "demandes" && error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 mb-4">{error}</p>
      )}

      {/* ── Liste ── */}
      {view === "demandes" && (loading ? (
        <Skeleton />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
          <BiotechOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Aucune demande d&apos;examen.</p>
          {canWrite && (
            <button
              type="button"
              onClick={openEditor}
              className="text-body-sm text-primary underline underline-offset-2 hover:opacity-70 transition-opacity"
            >
              Demander un examen
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((req) => (
            <LabRequestAccordion
              key={req.id}
              req={req}
              canWrite={canWrite}
              onRefresh={load}
            />
          ))}
        </div>
      ))}

      {/* ── Éditeur ── */}
      {showEditor && (
        <LabRequestEditor
          patientId={Number(patientId)}
          encounterId={encounterId !== undefined ? Number(encounterId) : undefined}
          onClose={() => setShowEditor(false)}
          onSaved={() => { setShowEditor(false); load(); }}
        />
      )}
    </>
  );
}
