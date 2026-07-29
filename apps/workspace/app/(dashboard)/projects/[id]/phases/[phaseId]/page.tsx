"use client";

import { useState } from "react";
import Link from "next/link";
import { AddOutlined, ChevronRightOutlined, TuneOutlined } from "@mui/icons-material";
import { RichTextEditor } from "@repo/ui/RichTextEditor";
import { TagInput } from "@repo/ui/TagInput";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import {
  PHASE_STATUS_LABELS,
  PHASE_STATUS_ORDER,
  PHASE_STATUS_TONES,
  projectsApi,
  refusBlocage,
  type RefusBlocage,
} from "@/app/lib/projects-api";
import { JalonDrawer } from "@/components/projects/JalonDrawer";
import { JalonRow } from "@/components/projects/JalonsTimeline";
import { EchecAutosave } from "@/components/projects/EchecAutosave";
import { MotifsBlocage } from "@/components/projects/MotifsBlocage";
import { useProject } from "../../project-context";
import { usePhase } from "./phase-context";

const LABEL = "block text-label-sm uppercase text-outline";

export default function PhaseOverviewPage() {
  const { phase, queue, echec, oublierEchec, canManage } = usePhase();
  const { projectId, jalons, reloadJalons, reloadPhases } = useProject();
  const { can } = usePermissions();
  const tone = PHASE_STATUS_TONES[phase.status] ?? PHASE_STATUS_TONES.A_VENIR!;

  const [refus, setRefus] = useState<RefusBlocage | null>(null);
  // Le statut VISÉ au moment du refus : ouvrir et clôturer sont tous deux
  // bloquables, et forcer doit rejouer la transition demandée, pas une autre.
  const [statutVise, setStatutVise] = useState<string | null>(null);
  const [erreurStatut, setErreurStatut] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drawerJalon, setDrawerJalon] = useState(false);

  const jalonsDeLaPhase = jalons
    .filter((j) => j.phase_id === phase.id)
    .sort((a, b) => a.position - b.position || a.id - b.id);

  /** Le statut NE passe PAS par la file d'autosauvegarde : elle avale le motif
   *  d'échec et n'affiche qu'un « Échec de l'enregistrement » muet. Un refus de
   *  clôture doit dire ce qui bloque. */
  async function changerStatut(nouveau: string, motifForcage?: string) {
    setBusy(true);
    setRefus(null);
    setErreurStatut(null);
    setStatutVise(nouveau);
    try {
      await projectsApi.updatePhase(phase.id, {
        status: nouveau,
        ...(motifForcage ? { motif_forcage: motifForcage } : {}),
      });
      await reloadPhases();
      await reloadJalons();
    } catch (e) {
      const bloque = refusBlocage(e);
      if (bloque) setRefus(bloque);
      else setErreurStatut(e instanceof Error ? e.message : "Changement de statut impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
      <div className="space-y-5">
        {refus && (
          <MotifsBlocage
            refus={refus}
            projectId={projectId}
            busy={busy}
            peutForcer={can("projects.jalons.force")}
            onForcer={(motif) => changerStatut(statutVise ?? "CLOTUREE", motif)}
          />
        )}
        {erreurStatut && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
            {erreurStatut}
          </p>
        )}
        {echec && <EchecAutosave echec={echec} projectId={projectId} onFermer={oublierEchec} />}

        <div>
          <p className={`${LABEL} mb-2`}>Aperçu de la phase</p>
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            <RichTextEditor
              value={phase.description_rich}
              fallbackText={phase.description}
              editable={canManage}
              placeholder="Objectif de la phase, ce qui change par rapport à la précédente…"
              className="min-h-[16rem]"
              onChange={canManage ? (json) => queue({ description_rich: json }) : undefined}
            />
          </div>
        </div>

        {(jalonsDeLaPhase.length > 0 || canManage) && (
          <div>
            <p className={`${LABEL} mb-2`}>Jalons de la phase</p>
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline overflow-hidden">
              {jalonsDeLaPhase.map((jalon) => (
                <JalonRow key={jalon.id} jalon={jalon} projectId={projectId} />
              ))}
              {jalonsDeLaPhase.length === 0 && (
                <p className="px-4 py-3 text-body-sm text-on-surface-variant">
                  Aucun jalon. Une gate bloquante retient la phase tant qu&apos;aucune décision
                  n&apos;a été rendue.
                </p>
              )}
              {canManage && (
                <div className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setDrawerJalon(true)}
                    className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline"
                  >
                    <AddOutlined style={{ fontSize: 16 }} />
                    Ajouter un jalon
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
        <MetaRow label="Statut">
          {canManage ? (
            <select
              value={phase.status}
              disabled={busy}
              onChange={(e) => changerStatut(e.target.value)}
              className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm font-semibold text-on-surface outline-none focus:border-primary disabled:opacity-50"
            >
              {PHASE_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {PHASE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-on-surface">
              <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
              {PHASE_STATUS_LABELS[phase.status] ?? phase.status}
            </span>
          )}
        </MetaRow>

        <MetaRow label="Début prévu">
          <PhaseDate value={phase.start_planned} editable={canManage} onChange={(v) => queue({ start_planned: v })} />
        </MetaRow>
        <MetaRow label="Fin prévue">
          <PhaseDate value={phase.end_planned} editable={canManage} onChange={(v) => queue({ end_planned: v })} />
        </MetaRow>
        <MetaRow label="Début réel">
          <PhaseDate value={phase.start_real} editable={canManage} onChange={(v) => queue({ start_real: v })} />
        </MetaRow>
        <MetaRow label="Fin réelle">
          <PhaseDate value={phase.end_real} editable={canManage} onChange={(v) => queue({ end_real: v })} />
        </MetaRow>

        <div className="px-4 py-3">
          <p className="text-body-sm text-on-surface-variant mb-1.5">Étiquettes</p>
          <TagInput
            value={phase.tags ?? []}
            disabled={!canManage}
            onChange={(tags) => queue({ tags })}
            placeholder="Chantier, Étude…"
          />
        </div>

        <MetaRow label="Éléments">
          <span className="text-body-sm font-semibold text-on-surface tabular-nums">{phase.task_count ?? 0}</span>
        </MetaRow>

        <Link
          href={`/projects/${phase.project_id}/phases/${phase.id}/tools`}
          className="flex items-center justify-between gap-3 px-4 py-3 text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors rounded-b-2xl"
        >
          <span className="inline-flex items-center gap-2 text-body-sm font-medium">
            <TuneOutlined style={{ fontSize: 17 }} />
            Outils
          </span>
          <ChevronRightOutlined style={{ fontSize: 18 }} />
        </Link>
      </aside>

      {drawerJalon && (
        <JalonDrawer
          jalon={null}
          phaseParDefaut={phase.id}
          onClose={() => setDrawerJalon(false)}
          onSaved={async () => {
            await reloadJalons();
            setDrawerJalon(false);
          }}
        />
      )}
    </div>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-body-sm text-on-surface-variant">{label}</span>
      {children}
    </div>
  );
}

function PhaseDate({
  value,
  editable,
  onChange,
}: {
  value: string | null;
  editable: boolean;
  onChange: (value: string | null) => void;
}) {
  if (!editable) {
    return (
      <span className="text-body-sm text-on-surface">
        {value ? new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—"}
      </span>
    );
  }
  return (
    <input
      type="date"
      value={value ? value.slice(0, 10) : ""}
      onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)}
      className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary"
    />
  );
}
