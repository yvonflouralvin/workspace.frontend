"use client";

import { useState } from "react";
import {
  AddOutlined,
  EditOutlined,
  DeleteOutlineOutlined,
  CheckOutlined,
  CloseOutlined,
} from "@mui/icons-material";
import {
  projectsApi,
  PHASE_STATUS_LABELS,
  PHASE_STATUS_ORDER,
  PHASE_STATUS_TONES,
  type Phase,
} from "@/app/lib/projects-api";
import { useProject } from "../project-context";

const inputCls =
  "w-full h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors";
const dateCls =
  "h-9 px-2 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function dateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function StatusPill({ status }: { status: string }) {
  const tone = PHASE_STATUS_TONES[status] ?? PHASE_STATUS_TONES.A_VENIR!;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-label-md font-semibold ${tone.chip}`}>
      <span className={`w-[6px] h-[6px] rounded-full ${tone.dot}`} />
      {PHASE_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default function PhasesPage() {
  const { projectId, phases, reloadPhases, canManage } = useProject();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const ordered = [...phases].sort((a, b) => a.position - b.position || a.id - b.id);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await reloadPhases();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Une erreur est survenue.");
    }
  }

  return (
    <div className="max-w-[820px] space-y-5">
      <div>
        <p className="text-body-sm text-on-surface-variant">
          Une phase est un segment ordonné de la vie du projet pendant lequel la nature du
          travail et l&apos;objectif ne changent pas. Elle se ferme par une décision — l&apos;ordre
          est une lecture, les dates peuvent se chevaucher.
        </p>
      </div>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
        <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
          <span className="flex-1 min-w-0">Phase</span>
          <span className="w-[120px] flex-none">Statut</span>
          <span className="w-[80px] flex-none text-center">Éléments</span>
          <span className="w-[150px] flex-none">Prévu</span>
          {canManage && <span className="w-[70px] flex-none" />}
        </div>

        {ordered.map((phase, i) =>
          editingId === phase.id ? (
            <PhaseEditor
              key={phase.id}
              phase={phase}
              onCancel={() => setEditingId(null)}
              onSave={(body) => run(() => projectsApi.updatePhase(phase.id, body)).then(() => setEditingId(null))}
            />
          ) : (
            <div
              key={phase.id}
              className="flex flex-wrap md:flex-nowrap items-start md:items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3 border-b border-hairline last:border-b-0"
            >
              <span className="w-full md:flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-mono text-label-sm text-outline">{i + 1}.</span>
                  <span className="text-body-md font-medium text-on-surface truncate">{phase.name}</span>
                  {phase.est_implicite && (
                    <span className="rounded bg-surface-container px-1.5 py-0.5 text-[10px] font-semibold uppercase text-outline">
                      Auto
                    </span>
                  )}
                </span>
                {phase.description && (
                  <span className="block text-label-md text-outline truncate">{phase.description}</span>
                )}
              </span>
              <span className="md:w-[120px] flex-none">
                <StatusPill status={phase.status} />
              </span>
              <span className="md:w-[80px] flex-none md:text-center text-body-sm text-on-surface-variant tabular-nums">
                {phase.task_count ?? 0}
              </span>
              <span className="md:w-[150px] flex-none text-label-md text-on-surface-variant">
                {fmtDate(phase.start_planned)} → {fmtDate(phase.end_planned)}
              </span>
              {canManage && (
                <span className="md:w-[70px] flex-none flex items-center gap-0.5 md:justify-end">
                  <button
                    onClick={() => setEditingId(phase.id)}
                    title="Modifier"
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                  >
                    <EditOutlined style={{ fontSize: 16 }} />
                  </button>
                  <button
                    onClick={() => {
                      if (phases.length <= 1) {
                        setError("Impossible de supprimer la dernière phase du projet.");
                        return;
                      }
                      run(() => projectsApi.deletePhase(phase.id));
                    }}
                    title="Supprimer"
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/8 transition-colors"
                  >
                    <DeleteOutlineOutlined style={{ fontSize: 16 }} />
                  </button>
                </span>
              )}
            </div>
          )
        )}

        {canManage && (
          <div className="px-4 md:px-5 py-3 border-t border-hairline">
            {creating ? (
              <PhaseEditor
                phase={null}
                onCancel={() => setCreating(false)}
                onSave={(body) =>
                  run(() => projectsApi.createPhase(projectId, body)).then(() => setCreating(false))
                }
              />
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Ajouter une phase
              </button>
            )}
          </div>
        )}
      </div>

      {phases.length > 1 && (
        <p className="text-label-md text-outline">
          Supprimer une phase rebascule ses éléments de travail sur la première phase restante.
        </p>
      )}
    </div>
  );
}

function PhaseEditor({
  phase,
  onCancel,
  onSave,
}: {
  phase: Phase | null;
  onCancel: () => void;
  onSave: (body: Partial<Phase>) => void;
}) {
  const [name, setName] = useState(phase?.name ?? "");
  const [status, setStatus] = useState(phase?.status ?? "A_VENIR");
  const [startPlanned, setStartPlanned] = useState(dateInput(phase?.start_planned ?? null));
  const [endPlanned, setEndPlanned] = useState(dateInput(phase?.end_planned ?? null));

  function submit() {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      status,
      start_planned: startPlanned || null,
      end_planned: endPlanned || null,
    });
  }

  return (
    <div className="w-full py-2 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de la phase (ex. Cadrage, Développement…)"
          autoFocus
        />
        <select
          className={`${inputCls} sm:w-[160px]`}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {PHASE_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {PHASE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-label-md text-outline">Prévu</label>
        <input type="date" className={dateCls} value={startPlanned} onChange={(e) => setStartPlanned(e.target.value)} />
        <span className="text-outline">→</span>
        <input type="date" className={dateCls} value={endPlanned} onChange={(e) => setEndPlanned(e.target.value)} />
        <span className="flex-1" />
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <CloseOutlined style={{ fontSize: 15 }} /> Annuler
        </button>
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50"
        >
          <CheckOutlined style={{ fontSize: 15 }} /> {phase ? "Enregistrer" : "Créer"}
        </button>
      </div>
    </div>
  );
}
