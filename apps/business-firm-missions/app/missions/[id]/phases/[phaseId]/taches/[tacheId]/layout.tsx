"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  ArrowBackOutlined,
  CloudDoneOutlined,
  CloudOffOutlined,
  CloudSyncOutlined,
  PersonOutlined,
} from "@mui/icons-material";
import { updateTache, type Tache } from "@/lib/bfm-missions-api";
import { useMission } from "../../../../mission-context";
import { StatutTachePill, TypeTachePuce } from "../../../../ui";
import { usePhase, type EtatSauvegarde } from "../../phase-context";
import { TacheProvider } from "./tache-context";
import { tacheSectionForPathname, tacheSections } from "./tache-sections";

export default function TacheLayout({ children }: { children: ReactNode }) {
  const { tacheId } = useParams<{ tacheId: string }>();
  const pathname = usePathname();
  const { missionId, mission, taches, reload } = useMission();
  const { phase } = usePhase();
  const tache = taches.find((t) => t.id === Number(tacheId) && t.phase_id === phase.id) ?? null;

  const [titre, setTitre] = useState(tache?.titre ?? "");
  const [etat, setEtat] = useState<EtatSauvegarde>("idle");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (tache) setTitre(tache.titre);
  }, [tache?.id, tache?.titre]); // eslint-disable-line react-hooks/exhaustive-deps

  const tacheIdNum = tache?.id;
  const enregistrer = useCallback(
    async (patch: Partial<Tache>) => {
      if (!tacheIdNum) return;
      setEtat("saving");
      setErreur(null);
      try {
        await updateTache(missionId, tacheIdNum, patch);
        await reload();
        setEtat("saved");
      } catch (err) {
        setErreur(err instanceof Error ? err.message : "Enregistrement impossible.");
        setEtat("error");
      }
    },
    [missionId, tacheIdNum, reload],
  );

  const retour = `/missions/${missionId}/phases/${phase.id}/taches`;

  if (!tache) {
    return (
      <div className="space-y-4">
        <RetourTaches href={retour} />
        <p className="text-body-md text-error">Tâche introuvable.</p>
      </div>
    );
  }

  const base = `/missions/${missionId}/phases/${phase.id}/taches/${tache.id}`;
  const sections = tacheSections(tache.type_tache);
  const current = tacheSectionForPathname(sections, pathname, base);

  return (
    <div>
      <RetourTaches href={retour} />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-label-md font-medium text-outline">
            <Link href={`/missions/${missionId}`} className="truncate hover:text-primary transition-colors">
              {mission.nom}
            </Link>
            <span aria-hidden>·</span>
            <Link href={`/missions/${missionId}/phases/${phase.id}`} className="truncate hover:text-primary transition-colors">
              {phase.nom}
            </Link>
          </span>
          <input
            aria-label="Titre de la tâche"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            onBlur={() => {
              const v = titre.trim();
              if (!v) setTitre(tache.titre);
              else if (v !== tache.titre) void enregistrer({ titre: v });
            }}
            placeholder="Titre de la tâche"
            readOnly={!tache.peut_modifier}
            className="mt-0.5 w-full bg-transparent font-display text-headline-md text-on-surface outline-none border-b border-transparent hover:border-outline-soft focus:border-primary transition-colors"
          />
        </div>

        <div className="flex-none flex items-center gap-3 pt-4">
          <IndicateurSauvegarde etat={etat} />
          <TypeTachePuce type={tache.type_tache} />
          {tache.assignee_client && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-label-md font-semibold text-primary"
              title="Le client voit cette tâche"
            >
              <PersonOutlined style={{ fontSize: 13 }} />
              Client
            </span>
          )}
          <StatutTachePill statut={tache.statut} />
        </div>
      </div>

      <nav className="flex items-center gap-1 border-b border-outline-soft mt-5 mb-5 overflow-x-auto">
        {sections.map((section) => {
          const active = section.key === current.key;
          return (
            <Link
              key={section.key}
              href={`${base}${section.path}`}
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

      <TacheProvider value={{ tache, phase, enregistrer, etat, erreur }}>{children}</TacheProvider>
    </div>
  );
}

function RetourTaches({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
    >
      <ArrowBackOutlined style={{ fontSize: 15 }} /> Tâches
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
