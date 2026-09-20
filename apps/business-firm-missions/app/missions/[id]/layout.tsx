"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useSessionStore } from "@repo/auth/store/session.store";
import { ArrowBackOutlined, CloudDoneOutlined, CloudSyncOutlined } from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getMission,
  updateMission,
  listPhases,
  listTaches,
  STATUT_MISSION_LABELS,
  type Mission,
  type Phase,
  type Tache,
} from "@/lib/bfm-missions-api";
import { listMembresWorkspace, type Membre } from "@/lib/membres-api";
import { MissionProvider } from "./mission-context";
import { MISSION_SECTIONS, isPhaseDetailPathname, sectionForPathname } from "./sections";

const COULEUR = "#7c2d12";

export default function MissionLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const missionId = Number(id);
  const pathname = usePathname();
  const workspaceId = useSessionStore((s) => s.activeWorkspace?.id);

  const [mission, setMission] = useState<Mission | null>(null);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [titre, setTitre] = useState("");
  const [etatTitre, setEtatTitre] = useState<"idle" | "saving" | "saved">("idle");

  // Le chargement initial signale l'échec ; un rechargement après une écriture ne
  // doit pas remplacer l'écran par une erreur si le réseau a eu un hoquet.
  const charger = useCallback(
    async (initial: boolean) => {
      try {
        const [m, ph, ta] = await Promise.all([getMission(missionId), listPhases(missionId), listTaches(missionId)]);
        setMission(m);
        setPhases(ph);
        setTaches(ta);
      } catch (err) {
        if (initial) setError(err instanceof Error ? err.message : "Erreur inattendue");
      }
    },
    [missionId],
  );
  const reload = useCallback(() => charger(false), [charger]);

  useEffect(() => {
    setMission(null);
    setError(null);
    void charger(true);
  }, [charger]);

  useEffect(() => {
    if (!workspaceId) return;
    listMembresWorkspace(workspaceId).then(setMembres).catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (mission) setTitre(mission.nom);
  }, [mission?.id, mission?.nom]);

  const enregistrerTitre = useCallback(async () => {
    const nom = titre.trim();
    if (!nom || nom === mission?.nom) return;
    setEtatTitre("saving");
    try {
      setMission(await updateMission(missionId, { nom }));
      setEtatTitre("saved");
    } catch {
      // Le champ reprend le nom que la mission porte réellement.
      setTitre(mission?.nom ?? "");
      setEtatTitre("idle");
    }
  }, [titre, mission?.nom, missionId]);

  if (error) {
    return (
      <DashboardShell>
        <div className="p-8"><p className="text-body-md text-error">{error}</p></div>
      </DashboardShell>
    );
  }
  if (!mission) {
    return (
      <DashboardShell>
        <div className="p-8"><p className="text-body-md text-on-surface-variant">Chargement…</p></div>
      </DashboardShell>
    );
  }

  const current = sectionForPathname(pathname, missionId);
  // Le détail d'une phase installe son propre en-tête et ses onglets.
  const detailPhase = isPhaseDetailPathname(pathname, missionId);

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
        {!detailPhase && (
          <>
            <Link
              href="/missions"
              className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
            >
              <ArrowBackOutlined style={{ fontSize: 15 }} />
              Missions
            </Link>

            <div className="flex items-center gap-3.5">
              <span
                className="w-11 h-11 flex-none rounded-[11px] flex items-center justify-center font-display text-body-lg font-semibold"
                style={{ background: `color-mix(in srgb, ${COULEUR} 10%, transparent)`, color: COULEUR }}
              >
                {mission.nom.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <input
                    value={titre}
                    onChange={(e) => setTitre(e.target.value)}
                    onBlur={enregistrerTitre}
                    placeholder="Nom de la mission"
                    className="min-w-0 flex-1 bg-transparent font-display text-headline-sm text-on-surface truncate outline-none border-b border-transparent hover:border-outline-soft focus:border-primary transition-colors"
                  />
                  {etatTitre === "saving" && (
                    <CloudSyncOutlined style={{ fontSize: 16 }} className="text-on-surface-variant shrink-0" />
                  )}
                  {etatTitre === "saved" && (
                    <CloudDoneOutlined style={{ fontSize: 16 }} className="text-secondary shrink-0" />
                  )}
                </div>
                <p className="font-mono text-label-md text-outline">
                  {mission.code} · {STATUT_MISSION_LABELS[mission.statut]}
                </p>
              </div>
            </div>

            <nav className="flex items-center gap-1 border-b border-outline-soft mt-5 mb-5 overflow-x-auto">
              {MISSION_SECTIONS.map((section) => {
                const active = section.key === current.key;
                return (
                  <Link
                    key={section.key}
                    href={`/missions/${missionId}${section.path}`}
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
          </>
        )}

        <MissionProvider value={{ missionId, mission, setMission, phases, taches, membres, reload }}>
          {children}
        </MissionProvider>
      </div>
    </DashboardShell>
  );
}
