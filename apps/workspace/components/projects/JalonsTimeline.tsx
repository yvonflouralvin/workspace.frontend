"use client";

import Link from "next/link";
import { ChevronRightOutlined, FlagOutlined } from "@mui/icons-material";
import {
  JALON_ROLE_LABELS,
  retientLaPhase,
  verdictLabel,
  type Jalon,
} from "@/app/lib/jalons-api";
import { PHASE_STATUS_LABELS, type Phase } from "@/app/lib/projects-api";
import { BloquantPill, EcheanceDepassee, StatutJalonPill, fmtEcheance } from "./JalonBadges";

/** Une ligne de jalon. Un jalon qui RETIENT la phase est encadré : c'est ce qui
 *  explique pourquoi une phase refuse de s'ouvrir ou de se fermer, ça ne peut pas
 *  se lire au même niveau que le reste. */
export function JalonRow({ jalon, projectId }: { jalon: Jalon; projectId: number }) {
  const retient = retientLaPhase(jalon);
  return (
    <Link
      href={`/projects/${projectId}/jalons/${jalon.id}`}
      className={`group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-container-low ${
        retient ? "border-l-2 border-l-error" : "border-l-2 border-l-transparent"
      }`}
    >
      <span className="mt-0.5 flex-none text-outline group-hover:text-primary transition-colors">
        <FlagOutlined style={{ fontSize: 17 }} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-body-md font-medium text-on-surface truncate">{jalon.nom}</span>
          <StatutJalonPill statut={jalon.statut} />
          {retient && <BloquantPill />}
        </span>

        <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label-md text-outline">
          <span>{JALON_ROLE_LABELS[jalon.role] ?? jalon.role}</span>
          {jalon.date_prevue && (
            <>
              <span aria-hidden>·</span>
              <span>Échéance {fmtEcheance(jalon.date_prevue)}</span>
            </>
          )}
          {jalon.verdict_courant && (
            <>
              <span aria-hidden>·</span>
              <span className="text-on-surface-variant">
                {verdictLabel(jalon.role, jalon.verdict_courant)}
              </span>
            </>
          )}
        </span>

        <span className="block">
          <EcheanceDepassee jalon={jalon} />
        </span>
      </span>

      <ChevronRightOutlined
        style={{ fontSize: 18 }}
        className="mt-1 flex-none text-outline group-hover:text-primary transition-colors"
      />
    </Link>
  );
}

/** Chronologie des jalons du projet : les phases dans l'ordre, chacune avec ses
 *  gates, puis les jalons qui n'appartiennent à aucune phase. */
export function JalonsTimeline({
  jalons,
  phases,
  projectId,
}: {
  jalons: Jalon[];
  phases: Phase[];
  projectId: number;
}) {
  const ordered = [...phases].sort((a, b) => a.position - b.position || a.id - b.id);
  const parPhase = ordered
    .map((phase) => ({
      phase,
      jalons: jalons
        .filter((j) => j.phase_id === phase.id)
        .sort((a, b) => a.position - b.position || a.id - b.id),
    }))
    .filter((groupe) => groupe.jalons.length > 0);
  const horsPhase = jalons
    .filter((j) => j.phase_id === null)
    .sort((a, b) => a.position - b.position || a.id - b.id);

  return (
    <div className="space-y-5">
      {parPhase.map(({ phase, jalons: gates }) => (
        <section key={phase.id}>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href={`/projects/${projectId}/phases/${phase.id}`}
              className="text-label-sm uppercase font-semibold text-on-surface-variant hover:text-primary transition-colors"
            >
              {phase.name}
            </Link>
            <span className="text-label-md text-outline">
              {PHASE_STATUS_LABELS[phase.status] ?? phase.status}
            </span>
          </div>
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline overflow-hidden">
            {gates.map((jalon) => (
              <JalonRow key={jalon.id} jalon={jalon} projectId={projectId} />
            ))}
          </div>
        </section>
      ))}

      {horsPhase.length > 0 && (
        <section>
          <p className="text-label-sm uppercase font-semibold text-on-surface-variant mb-1.5">
            Sans phase
          </p>
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline overflow-hidden">
            {horsPhase.map((jalon) => (
              <JalonRow key={jalon.id} jalon={jalon} projectId={projectId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
