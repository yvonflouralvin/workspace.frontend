"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSessionStore } from "@repo/auth/store/session.store";
import { DashboardShell } from "@/components/DashboardShell";
import { TacheDrawer } from "@/components/TacheDrawer";
import { listMesTaches, PRIORITE_LABELS, type MaTache } from "@/lib/bfm-missions-api";
import { COULEUR_PRIORITE, FIELD, StatutTachePill, TypeTachePuce, estTerminee } from "@/app/missions/[id]/ui";
import { enRetard, jourFr } from "@/lib/format";
import { listMembresWorkspace, type Membre } from "@/lib/membres-api";

type Groupe = "a_valider" | "a_revoir" | "retard" | "aujourdhui" | "venir" | "sans" | "terminees";

// Ce qui attend une décision passe avant les dates : une tâche à valider retient quelqu'un d'autre, une
// tâche à revoir revient à son exécutant.
const GROUPES: { cle: Groupe; titre: string }[] = [
  { cle: "a_valider", titre: "À valider" },
  { cle: "a_revoir", titre: "À revoir" },
  { cle: "retard", titre: "En retard" },
  { cle: "aujourdhui", titre: "Aujourd'hui" },
  { cle: "venir", titre: "À venir" },
  { cle: "sans", titre: "Sans échéance" },
  { cle: "terminees", titre: "Terminées" },
];

// Date locale en AAAA-MM-JJ : `toISOString` donnerait celle d'UTC, et passé 23 h une tâche du
// lendemain se lirait « aujourd'hui ».
function aujourdhui(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function groupeDe(t: MaTache, auj: string): Groupe {
  if (t.a_valider) return "a_valider";
  if (t.statut === "A_REVOIR") return "a_revoir";
  if (estTerminee(t.statut)) return "terminees";
  const echeance = t.due_date?.slice(0, 10);
  if (!echeance) return "sans";
  if (echeance < auj) return "retard";
  return echeance === auj ? "aujourdhui" : "venir";
}

export default function MesTachesPage() {
  const [taches, setTaches] = useState<MaTache[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [terminees, setTerminees] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [drawer, setDrawer] = useState<MaTache | null>(null);
  const [membres, setMembres] = useState<Membre[]>([]);
  const workspaceId = useSessionStore((s) => s.activeWorkspace?.id);

  useEffect(() => {
    if (!workspaceId) return;
    listMembresWorkspace(workspaceId).then(setMembres).catch(() => {});
  }, [workspaceId]);

  const charger = useCallback(async () => {
    try {
      setTaches(await listMesTaches(terminees));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    }
  }, [terminees]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const auj = aujourdhui();
  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return taches ?? [];
    return (taches ?? []).filter((t) =>
      [t.titre, t.mission_nom, t.mission_code, t.phase_nom].some((v) => v.toLowerCase().includes(q)),
    );
  }, [taches, recherche]);

  const nbOuvertes = (taches ?? []).filter((t) => !t.a_valider && !estTerminee(t.statut)).length;
  const nbAValider = (taches ?? []).filter((t) => t.a_valider).length;

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-5">
        <div>
          <h1 className="font-display text-headline-lg text-on-surface">Mes tâches</h1>
          <p className="text-body-sm text-on-surface-variant">
            {taches === null
              ? "Chargement…"
              : `${nbOuvertes} tâche${nbOuvertes > 1 ? "s" : ""} à faire${
                  nbAValider > 0 ? `, ${nbAValider} à valider` : ""
                }, toutes missions confondues.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${FIELD} w-full md:w-[280px]`}
            placeholder="Rechercher une tâche ou une mission"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          <button
            type="button"
            aria-pressed={terminees}
            onClick={() => setTerminees((v) => !v)}
            className={`inline-flex items-center h-[38px] px-3 rounded-lg border text-body-sm font-medium whitespace-nowrap transition-colors ${
              terminees
                ? "border-primary bg-primary/10 text-primary"
                : "border-outline-soft bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            Afficher les terminées
          </button>
        </div>

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}

        {taches !== null && visibles.length === 0 && (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-5 py-4 text-body-sm text-on-surface-variant">
            {recherche.trim()
              ? "Aucune tâche ne correspond à cette recherche."
              : terminees
                ? "Aucune tâche ne vous est assignée."
                : "Rien n'attend votre action."}
          </div>
        )}

        {GROUPES.map(({ cle, titre }) => {
          const liste = visibles.filter((t) => groupeDe(t, auj) === cle);
          if (liste.length === 0) return null;
          return (
            <section key={cle}>
              <p className="mb-1.5 flex items-center gap-2 text-body-sm font-semibold text-on-surface">
                <span className={cle === "retard" || cle === "a_revoir" ? "text-error" : ""}>{titre}</span>
                <span className="text-label-md font-normal text-outline">{liste.length}</span>
              </p>
              <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
                {liste.map((t) => (
                  // Une ligne se LIT : on ne modifie rien ici. Un clic ouvre le tiroir, où l'on change ce
                  // qu'on veut et où l'on enregistre — une liste qu'on parcourt ne doit pas pouvoir
                  // modifier une tâche par un geste malheureux.
                  <div
                    key={t.id}
                    onClick={() => setDrawer(t)}
                    className="flex flex-wrap md:flex-nowrap items-center gap-x-4 gap-y-2 px-4 md:px-5 py-3 border-b border-hairline last:border-b-0 cursor-pointer hover:bg-surface-container-low transition-colors"
                  >
                    <button type="button" className="w-full md:flex-1 min-w-0 text-left">
                      <span className="flex items-center gap-2">
                        <span
                          className={`truncate text-body-md ${
                            t.statut === "VALIDEE" ? "text-outline line-through" : "text-on-surface"
                          }`}
                        >
                          {t.titre}
                        </span>
                        <TypeTachePuce type={t.type_tache} />
                      </span>
                      <span className="block truncate text-label-md text-outline">
                        <span className="font-mono">{t.mission_code}</span> · {t.mission_nom} — {t.phase_nom}
                      </span>
                    </button>
                    <span
                      className={`md:w-[80px] flex-none text-label-md font-semibold ${COULEUR_PRIORITE[t.priorite] ?? "text-outline"}`}
                    >
                      {t.priorite === "AUCUNE" ? "" : PRIORITE_LABELS[t.priorite]}
                    </span>
                    <span
                      className={`md:w-[100px] flex-none text-body-sm tabular-nums ${
                        enRetard(t.due_date, estTerminee(t.statut)) ? "text-error font-semibold" : "text-on-surface-variant"
                      }`}
                    >
                      {t.due_date ? jourFr(t.due_date) : "—"}
                    </span>
                    <span className="md:w-[120px] flex-none">
                      <StatutTachePill statut={t.statut} />
                    </span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {drawer && (
        <TacheDrawer
          missionId={drawer.mission_id}
          phaseId={drawer.phase_id}
          tache={drawer}
          membres={membres}
          clientDisponible={drawer.client_disponible}
          onClose={() => setDrawer(null)}
          onSaved={charger}
        />
      )}
    </DashboardShell>
  );
}
