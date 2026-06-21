"use client";

import { useEffect, useState } from "react";
import { RightDrawer } from "@repo/ui/RightDrawer";
import {
  createEmployeeContract,
  updateEmployeeContract,
  listEmployeeDocuments,
  ApiError,
  type Contract,
  type EmployeeDocument,
} from "@/app/lib/api";

export const CONTRACT_TYPES: { value: string; label: string }[] = [
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
  { value: "freelance", label: "Freelance" },
  { value: "stage", label: "Stage" },
];

export const CURRENCIES: { value: string; label: string }[] = [
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
  { value: "other", label: "Autre" },
];

export const SALARY_PERIODS: { value: string; label: string }[] = [
  { value: "annual", label: "/an" },
  { value: "monthly", label: "/mois" },
];

type ContractFormDrawerProps =
  | { mode: "create"; employeeId: number; onClose: () => void; onSaved: (contract: Contract) => void }
  | { mode: "edit"; employeeId: number; contract: Contract; onClose: () => void; onSaved: (contract: Contract) => void };

export function ContractFormDrawer(props: ContractFormDrawerProps) {
  const { employeeId, onClose, onSaved } = props;
  const existing = props.mode === "edit" ? props.contract : null;

  const [contractType, setContractType] = useState(existing?.contract_type ?? CONTRACT_TYPES[0]!.value);
  const [startDate, setStartDate] = useState(existing?.start_date ?? "");
  const [hasEndDate, setHasEndDate] = useState(existing ? existing.end_date !== null : true);
  const [endDate, setEndDate] = useState(existing?.end_date ?? "");
  const [workingTimePercent, setWorkingTimePercent] = useState(existing?.working_time_percent ?? 100);
  const [baseSalary, setBaseSalary] = useState(existing?.base_salary ?? 0);
  const [salaryPeriod, setSalaryPeriod] = useState(existing?.salary_period ?? "annual");
  const [currency, setCurrency] = useState(existing?.currency ?? "EUR");
  const [documentId, setDocumentId] = useState<number | null>(existing?.document_id ?? null);

  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listEmployeeDocuments(employeeId)
      .then(setDocuments)
      .catch(() => setDocuments([]));
  }, [employeeId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const data = {
        contract_type: contractType,
        start_date: startDate,
        end_date: hasEndDate ? endDate || null : null,
        working_time_percent: workingTimePercent,
        base_salary: baseSalary,
        salary_period: salaryPeriod,
        currency,
        document_id: documentId,
      };
      const contract =
        props.mode === "create"
          ? await createEmployeeContract(employeeId, data)
          : await updateEmployeeContract(employeeId, props.contract.id, data);
      onSaved(contract);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title={props.mode === "create" ? "Nouveau contrat" : "Modifier le contrat"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Type de contrat</label>
          <select
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          >
            {CONTRACT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-on-surface">Date de début</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-on-surface">Date de fin</label>
            <input
              type="date"
              disabled={!hasEndDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface disabled:opacity-50"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={!hasEndDate}
            onChange={(e) => setHasEndDate(!e.target.checked)}
          />
          CDI sans date de fin
        </label>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Temps de travail (%)</label>
          <input
            type="number"
            min={1}
            max={100}
            required
            value={workingTimePercent}
            onChange={(e) => setWorkingTimePercent(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1 space-y-1">
            <label className="text-sm font-medium text-on-surface">Rémunération</label>
            <input
              type="number"
              min={0}
              step="0.01"
              required
              value={baseSalary}
              onChange={(e) => setBaseSalary(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-on-surface">Devise</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-on-surface">Périodicité</label>
            <select
              value={salaryPeriod}
              onChange={(e) => setSalaryPeriod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
            >
              {SALARY_PERIODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-on-surface">Document associé</label>
          <select
            value={documentId ?? ""}
            onChange={(e) => setDocumentId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface text-sm text-on-surface"
          >
            <option value="">Aucun document</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.filename}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary text-on-primary disabled:opacity-50"
          >
            {submitting ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </RightDrawer>
  );
}
