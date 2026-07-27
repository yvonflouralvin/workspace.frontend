"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AddOutlined,
  DeleteOutlineOutlined,
  OpenInFullOutlined,
} from "@mui/icons-material";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
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
  // drawer : Phase = édition, null = création, false = fermé.
  const [drawer, setDrawer] = useState<Phase | null | false>(false);

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
      <p className="text-body-sm text-on-surface-variant">
        Une phase est un segment ordonné de la vie du projet pendant lequel la nature du
        travail et l&apos;objectif ne changent pas. Elle se ferme par une décision — l&apos;ordre
        est une lecture, les dates peuvent se chevaucher.
      </p>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
        <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
          <span className="flex-1 min-w-0">Phase</span>
          <span className="w-[120px] flex-none">Statut</span>
          <span className="w-[80px] flex-none text-center">Éléments</span>
          <span className="w-[150px] flex-none">Prévu</span>
          {canManage && <span className="w-[40px] flex-none" />}
        </div>

        {ordered.map((phase, i) => (
          <div
            key={phase.id}
            className="flex flex-wrap md:flex-nowrap items-start md:items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3 border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors"
          >
            {/* Clic sur la phase → aperçu rapide en drawer. */}
            <button
              onClick={() => setDrawer(phase)}
              className="w-full md:flex-1 min-w-0 text-left"
            >
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
            </button>
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
              <span className="md:w-[40px] flex-none flex md:justify-end">
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
        ))}

        {canManage && (
          <div className="px-4 md:px-5 py-3 border-t border-hairline">
            <button
              onClick={() => setDrawer(null)}
              className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Ajouter une phase
            </button>
          </div>
        )}
      </div>

      {phases.length > 1 && (
        <p className="text-label-md text-outline">
          Supprimer une phase rebascule ses éléments de travail sur la première phase restante.
        </p>
      )}

      {drawer !== false && (
        <PhaseDrawer
          phase={drawer}
          projectId={projectId}
          canManage={canManage}
          onClose={() => setDrawer(false)}
          onSaved={async () => {
            await reloadPhases();
            setDrawer(false);
          }}
        />
      )}
    </div>
  );
}

function PhaseDrawer({
  phase,
  projectId,
  canManage,
  onClose,
  onSaved,
}: {
  phase: Phase | null;
  projectId: number;
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(phase?.name ?? "");
  const [status, setStatus] = useState(phase?.status ?? "A_VENIR");
  const [startPlanned, setStartPlanned] = useState(dateInput(phase?.start_planned ?? null));
  const [endPlanned, setEndPlanned] = useState(dateInput(phase?.end_planned ?? null));
  const [descRich, setDescRich] = useState<string | null>(phase?.description_rich ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) {
      setError("Le nom de la phase est requis.");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      name: name.trim(),
      status,
      start_planned: startPlanned || null,
      end_planned: endPlanned || null,
      description_rich: descRich,
    };
    try {
      if (phase) await projectsApi.updatePhase(phase.id, body);
      else await projectsApi.createPhase(projectId, body);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enregistrement impossible.");
      setSaving(false);
    }
  }

  const readOnly = !canManage;

  return (
    <RightDrawer
      title={phase ? "Aperçu de la phase" : "Nouvelle phase"}
      onClose={onClose}
      width="md:w-[560px] md:max-w-[92vw]"
      footer={
        <div className="flex items-center gap-2 w-full">
          {phase && (
            <button
              onClick={() => router.push(`/projects/${projectId}/phases/${phase.id}`)}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-soft text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <OpenInFullOutlined style={{ fontSize: 15 }} />
              Ouvrir la page
            </button>
          )}
          <span className="flex-1" />
          <button
            onClick={onClose}
            className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            {readOnly ? "Fermer" : "Annuler"}
          </button>
          {!readOnly && (
            <button
              onClick={save}
              disabled={saving || !name.trim()}
              className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : phase ? "Enregistrer" : "Créer"}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-label-sm uppercase text-outline mb-1.5">Titre</label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={readOnly}
            placeholder="Nom de la phase (ex. Cadrage, Développement…)"
            autoFocus={!phase}
          />
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <label className="block text-label-sm uppercase text-outline mb-1.5">Statut</label>
            <select
              className={`${inputCls} w-[150px]`}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={readOnly}
            >
              {PHASE_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {PHASE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-label-sm uppercase text-outline mb-1.5">Prévu</label>
            <div className="flex items-center gap-2">
              <input type="date" className={dateCls} value={startPlanned} onChange={(e) => setStartPlanned(e.target.value)} disabled={readOnly} />
              <span className="text-outline">→</span>
              <input type="date" className={dateCls} value={endPlanned} onChange={(e) => setEndPlanned(e.target.value)} disabled={readOnly} />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-label-sm uppercase text-outline mb-1.5">Description</label>
          <div className="rounded-xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            <RichTextEditor
              value={phase?.description_rich ?? null}
              fallbackText={phase?.description ?? null}
              editable={!readOnly}
              placeholder="Objectif de la phase, ce qui change…"
              className="min-h-[10rem]"
              onChange={readOnly ? undefined : (json) => setDescRich(json)}
            />
          </div>
        </div>

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}
      </div>
    </RightDrawer>
  );
}
