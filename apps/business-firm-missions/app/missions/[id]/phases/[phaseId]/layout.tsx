"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  ArrowBackOutlined,
  CloudDoneOutlined,
  CloudOffOutlined,
  CloudSyncOutlined,
} from "@mui/icons-material";
import { peut, updatePhase, type Phase } from "@/lib/bfm-missions-api";
import { useMission } from "../../mission-context";
import { StatutPhasePill } from "../../ui";
import { PhaseProvider, type EtatSauvegarde } from "./phase-context";
import { PHASE_SECTIONS, phaseSectionForPathname } from "./phase-sections";

export default function PhaseLayout({ children }: { children: ReactNode }) {
  const { phaseId } = useParams<{ phaseId: string }>();
  const pathname = usePathname();
  const { missionId, mission, phases, taches, reload } = useMission();
  const phase = phases.find((p) => p.id === Number(phaseId)) ?? null;

  const [nom, setNom] = useState(phase?.nom ?? "");
  const [etat, setEtat] = useState<EtatSauvegarde>("idle");
  const [erreur, setErreur] = useState<string | null>(null);

  // Le nom local suit la phase résolue depuis le contexte (au chargement).
  useEffect(() => {
    if (phase) setNom(phase.nom);
  }, [phase?.id, phase?.nom]); // eslint-disable-line react-hooks/exhaustive-deps

  const phaseIdNum = phase?.id;
  const enregistrer = useCallback(
    async (patch: Partial<Phase>) => {
      if (!phaseIdNum) return;
      setEtat("saving");
      setErreur(null);
      try {
        await updatePhase(missionId, phaseIdNum, patch);
        await reload();
        setEtat("saved");
      } catch (err) {
        setErreur(err instanceof Error ? err.message : "Enregistrement impossible.");
        setEtat("error");
      }
    },
    [missionId, phaseIdNum, reload],
  );

  if (!phase) {
    return (
      <div className="space-y-4">
        <RetourPhases missionId={missionId} />
        <p className="text-body-md text-error">Phase introuvable.</p>
      </div>
    );
  }

  const current = phaseSectionForPathname(pathname, missionId, phase.id);
  const contexte = {
    phase,
    taches: taches.filter((t) => t.phase_id === phase.id),
    enregistrer,
    etat,
    erreur,
  };

  // Le détail d'une tâche porte sa propre identité (mission et phase en surtitre, tâche en
  // titre) et ses propres onglets : le layout de la phase s'efface, comme celui de la mission
  // s'efface devant la phase. Le contexte de la phase reste servi — la tâche en a besoin.
  if (/\/taches\/\d+/.test(pathname)) {
    return <PhaseProvider value={contexte}>{children}</PhaseProvider>;
  }

  return (
    <div>
      <RetourPhases missionId={missionId} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href={`/missions/${missionId}`}
            className="inline-block max-w-full truncate text-label-md font-medium text-outline hover:text-primary transition-colors"
          >
            {mission.nom}
          </Link>
          <input
            aria-label="Nom de la phase"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onBlur={() => {
              const v = nom.trim();
              if (!v) setNom(phase.nom);
              else if (v !== phase.nom) void enregistrer({ nom: v });
            }}
            placeholder="Nom de la phase"
            readOnly={!peut(mission, "phase.modifier")}
            className="mt-0.5 w-full bg-transparent font-display text-headline-md text-on-surface outline-none border-b border-transparent hover:border-outline-soft focus:border-primary transition-colors"
          />
        </div>

        <div className="flex-none flex items-center gap-3 pt-4">
          <IndicateurSauvegarde etat={etat} />
          <StatutPhasePill statut={phase.statut} />
        </div>
      </div>

      <nav className="flex items-center gap-1 border-b border-outline-soft mt-5 mb-5 overflow-x-auto">
        {PHASE_SECTIONS.map((section) => {
          const active = section.key === current.key;
          return (
            <Link
              key={section.key}
              href={`/missions/${missionId}/phases/${phase.id}${section.path}`}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 -mb-px border-b-2 whitespace-nowrap text-body-sm font-medium transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="inline-flex items-center">{section.icon}</span>
              {section.label}
            </Link>
          );
        })}
      </nav>

      <PhaseProvider value={contexte}>{children}</PhaseProvider>
    </div>
  );
}

function RetourPhases({ missionId }: { missionId: number }) {
  return (
    <Link
      href={`/missions/${missionId}/phases`}
      className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
    >
      <ArrowBackOutlined style={{ fontSize: 15 }} /> Phases
    </Link>
  );
}

function IndicateurSauvegarde({ etat }: { etat: EtatSauvegarde }) {
  if (etat === "idle") return null;
  const map = {
    saving: { icon: <CloudSyncOutlined style={{ fontSize: 16 }} />, label: "Enregistrement…", tone: "text-on-surface-variant" },
    saved: { icon: <CloudDoneOutlined style={{ fontSize: 16 }} />, label: "Enregistré", tone: "text-secondary" },
    error: { icon: <CloudOffOutlined style={{ fontSize: 16 }} />, label: "Échec de l'enregistrement", tone: "text-error" },
  } as const;
  const { icon, label, tone } = map[etat];
  return (
    <span className={`shrink-0 inline-flex items-center gap-1.5 text-label-md ${tone}`}>
      {icon}
      {label}
    </span>
  );
}
