"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowBackOutlined, EditOutlined } from "@mui/icons-material";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import { CriteresJalon } from "@/components/projects/CriteresJalon";
import { DecisionJalon } from "@/components/projects/DecisionJalon";
import { HistoriqueJalon } from "@/components/projects/HistoriqueJalon";
import { JalonDrawer } from "@/components/projects/JalonDrawer";
import { BloquantPill, EcheanceDepassee, StatutJalonPill, fmtEcheance } from "@/components/projects/JalonBadges";
import {
  JALON_ROLE_LABELS,
  jalonsApi,
  retientLaPhase,
  type JalonDetail,
  type ResultatDecision,
} from "@/app/lib/jalons-api";
import { projectsApi } from "@/app/lib/projects-api";
import { useProject } from "../../project-context";

export default function JalonDetailPage() {
  const { jalonId } = useParams<{ jalonId: string }>();
  const router = useRouter();
  const { projectId, project, phases, deliverables, reloadJalons, reloadPhases, canManage } =
    useProject();

  const id = Number(jalonId);
  const [jalon, setJalon] = useState<JalonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [proposerArret, setProposerArret] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => jalonsApi.get(id).then(setJalon), [id]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch(() => setJalon(null))
      .finally(() => setLoading(false));
  }, [load]);

  const apresChangement = useCallback(
    async (resultat?: ResultatDecision) => {
      await load();
      await reloadJalons();
      // Une décision peut annuler la phase (kill) ou la rouvrir (recycle) : le
      // statut affiché ailleurs doit suivre.
      await reloadPhases();
      if (resultat?.proposer_annulation_projet) setProposerArret(true);
    },
    [load, reloadJalons, reloadPhases]
  );

  if (loading) return <p className="text-body-md text-on-surface-variant">Chargement…</p>;
  if (!jalon) {
    return (
      <div className="space-y-4">
        <Retour projectId={projectId} />
        <p className="text-body-md text-error">Jalon introuvable.</p>
      </div>
    );
  }

  const phase = phases.find((p) => p.id === jalon.phase_id) ?? null;
  // Les livrables proposés en critère restent ceux de la phase du jalon.
  const livrablesCandidats = phase
    ? deliverables.filter((d) => d.phase_id === phase.id)
    : deliverables;

  return (
    <div>
      <Retour projectId={projectId} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-label-md font-medium text-outline">
            <Link
              href={`/projects/${projectId}`}
              className="truncate hover:text-primary transition-colors"
            >
              {project.name}
            </Link>
            {phase && (
              <>
                <span aria-hidden>·</span>
                <Link
                  href={`/projects/${projectId}/phases/${phase.id}`}
                  className="truncate hover:text-primary transition-colors"
                >
                  {phase.name}
                </Link>
              </>
            )}
          </span>
          <h1 className="mt-0.5 font-display text-headline-md text-on-surface">{jalon.nom}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label-md text-outline">
            <span>{JALON_ROLE_LABELS[jalon.role] ?? jalon.role}</span>
            {jalon.date_prevue && (
              <>
                <span aria-hidden>·</span>
                <span>Échéance {fmtEcheance(jalon.date_prevue)}</span>
              </>
            )}
          </div>
          <EcheanceDepassee jalon={jalon} />
        </div>

        <div className="flex-none flex flex-col items-end gap-2 pt-1">
          <div className="flex items-center gap-2">
            <StatutJalonPill statut={jalon.statut} />
            {retientLaPhase(jalon) && <BloquantPill />}
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-outline-soft text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <EditOutlined style={{ fontSize: 15 }} />
              Modifier
            </button>
          )}
        </div>
      </div>

      {jalon.description && (
        <p className="mt-4 max-w-[70ch] text-body-sm text-on-surface-variant whitespace-pre-wrap">
          {jalon.description}
        </p>
      )}

      <div className="mt-6 max-w-[820px] space-y-6">
        <CriteresJalon
          jalon={jalon}
          deliverables={livrablesCandidats}
          canManage={canManage}
          onChange={apresChangement}
        />
        <DecisionJalon jalon={jalon} canManage={canManage} onChange={apresChangement} />
        <HistoriqueJalon jalon={jalon} />
      </div>

      {drawer && (
        <JalonDrawer
          jalon={jalon}
          onClose={() => setDrawer(false)}
          onSaved={async () => {
            await apresChangement();
            setDrawer(false);
          }}
          onDeleted={async () => {
            await reloadJalons();
            router.push(`/projects/${projectId}/jalons`);
          }}
        />
      )}

      {/* Un kill annule la PHASE. Arrêter le projet est un second acte, jamais
          enchaîné automatiquement : une gate de faisabilité tuée arrête souvent
          le projet, une branche exploratoire non. */}
      {proposerArret && (
        <ConfirmDialog
          title="Arrêter aussi le projet ?"
          confirmLabel="Archiver le projet"
          cancelLabel="Non, garder le projet ouvert"
          busy={busy}
          onCancel={() => setProposerArret(false)}
          onConfirm={async () => {
            setBusy(true);
            try {
              await projectsApi.updateProject(projectId, { status: "ARCHIVE" });
              setProposerArret(false);
              setToast("Projet archivé.");
              router.push(`/projects/${projectId}`);
            } finally {
              setBusy(false);
            }
          }}
          message={
            <>
              La phase {phase ? `« ${phase.name} » ` : ""}est annulée par cette décision. Le
              projet, lui, reste ouvert tant que vous n&apos;en décidez pas autrement.
            </>
          }
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Retour({ projectId }: { projectId: number }) {
  return (
    <Link
      href={`/projects/${projectId}/jalons`}
      className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
    >
      <ArrowBackOutlined style={{ fontSize: 15 }} /> Jalons
    </Link>
  );
}
