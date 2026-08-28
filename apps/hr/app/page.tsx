"use client";

import { useSessionStore as useSessionAccueil } from "@repo/auth/store/session.store";
import { usePermissions as usePermissionsAccueil } from "@repo/auth/hooks/usePermissions";
import { AccueilApp } from "@repo/ui/shell/AccueilApp";
import { NAV_ITEMS } from "@/components/DashboardShell";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useSessionStore } from "@repo/auth/store/session.store";
import { KpiCard } from "@repo/ui/KpiCard";
import { Avatar } from "@repo/ui/Avatar";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getRootGroup,
  listGroupOptions,
  listEmployees,
  type GroupDetail,
} from "./lib/api";
import {
  PeopleAltOutlined,
  AccountTreeOutlined,
  BadgeOutlined,
  LinkOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";

const SECTION_LABEL = "text-label-sm uppercase text-outline";

// Palette d'accents pour les barres d'effectif — stable par rang.
const BAR_COLORS = ["#3525cd", "#006c49", "#004598", "#7c3aed", "#0e7490", "#a16207"];

// Congés en attente — DONNÉES SIMULÉES en attendant le service réel (cf. la
// note d'endpoints). À remplacer par un fetch dès que l'API congés existe.
const CONGES_DEMO = [
  { id: 1, name: "Aline Mbaki", dates: "12 – 16 août", color: "#7c3aed" },
  { id: 2, name: "Serge Ilunga", dates: "19 – 23 août", color: "#0e7490" },
  { id: 3, name: "Josée Kalonji", dates: "26 – 27 août", color: "#9a3412" },
];

function Departements() {
  const { can } = usePermissions();
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);
  const canView = can("hr.departments.view");
  const canViewEmployees = can("hr.employees.view");

  const [root, setRoot] = useState<GroupDetail | null>(null);
  const [groupCount, setGroupCount] = useState<number | null>(null);
  const [linkedCount, setLinkedCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    getRootGroup()
      .then(setRoot)
      .catch(() => setError("Une erreur est survenue"))
      .finally(() => setLoading(false));
    listGroupOptions()
      .then((g) => setGroupCount(g.length))
      .catch(() => {});
  }, [canView]);

  useEffect(() => {
    if (!canViewEmployees) return;
    listEmployees()
      .then((emps) => setLinkedCount(emps.filter((e) => e.user_id !== null).length))
      .catch(() => {});
  }, [canViewEmployees]);

  // L'effectif total se lit sur la racine : elle porte le compte de ses enfants.
  const effectif = useMemo(() => {
    if (!root) return 0;
    return (
      root.employees.length +
      root.children.reduce((sum, c) => sum + c.employee_count, 0)
    );
  }, [root]);

  // Barres d'effectif par département, du plus grand au plus petit.
  const deptBars = useMemo(() => {
    if (!root) return [];
    const sorted = [...root.children]
      .filter((c) => c.employee_count > 0)
      .sort((a, b) => b.employee_count - a.employee_count)
      .slice(0, 8);
    const max = Math.max(1, ...sorted.map((c) => c.employee_count));
    return sorted.map((c, i) => ({
      id: c.id,
      name: c.name,
      count: c.employee_count,
      width: `${Math.round((c.employee_count / max) * 100)}%`,
      color: BAR_COLORS[i % BAR_COLORS.length],
    }));
  }, [root]);

  if (!canView) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
          <h1 className="font-display text-headline-md text-on-surface">Ressources humaines</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Vous n&apos;avez pas accès à cette page.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
        <div className="hidden md:block mb-6">
          <h1 className="font-display text-headline-md text-on-surface">Ressources humaines</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            {[activeWorkspace?.name, loading ? null : `${effectif} employé${effectif > 1 ? "s" : ""}`]
              .filter(Boolean)
              .join(" · ") || "Organisation et effectif du workspace."}
          </p>
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <KpiCard
            label="Effectif"
            value={loading ? "—" : effectif}
            icon={<PeopleAltOutlined style={{ fontSize: 20 }} />}
            hint={loading ? undefined : "Employés de l'organisation"}
            href="/employees"
          />
          <KpiCard
            label="Unités d'organisation"
            value={groupCount === null ? "—" : groupCount}
            icon={<AccountTreeOutlined style={{ fontSize: 20 }} />}
            href="/groups"
          />
          <KpiCard
            label="Rattachés directement"
            value={loading ? "—" : (root?.employees.length ?? 0)}
            icon={<BadgeOutlined style={{ fontSize: 20 }} />}
            hint={loading ? undefined : "Sans sous-groupe"}
          />
          <KpiCard
            label="Comptes liés"
            value={linkedCount === null ? "—" : linkedCount}
            icon={<LinkOutlined style={{ fontSize: 20 }} />}
            hint={linkedCount === null ? undefined : "Employés avec un compte"}
            href="/employees"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className={SECTION_LABEL}>Organisation</h2>
              <Link href="/groups" className="text-label-md font-semibold text-primary hover:underline">
                Ouvrir l&apos;organigramme
              </Link>
            </div>

            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
              {loading ? (
                <p className="px-4 py-6 text-body-sm text-on-surface-variant">Chargement…</p>
              ) : !root || root.children.length === 0 ? (
                <p className="px-4 py-8 text-center text-body-sm text-on-surface-variant">
                  Aucune unité d&apos;organisation.
                </p>
              ) : (
                root.children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/groups/${child.id}`}
                    className="flex items-center gap-3 px-4 py-3 border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors"
                  >
                    <Avatar name={child.name} letters={1} size={32} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-body-md font-medium text-on-surface truncate">
                        {child.name}
                      </span>
                      <span className="block text-label-md text-outline">
                        {child.employee_count} employé{child.employee_count > 1 ? "s" : ""}
                        {child.subgroup_count > 0
                          ? ` · ${child.subgroup_count} sous-groupe${child.subgroup_count > 1 ? "s" : ""}`
                          : ""}
                      </span>
                    </span>
                    <ChevronRightOutlined style={{ fontSize: 18 }} className="flex-none text-outline" />
                  </Link>
                ))
              )}
            </div>
          </section>

          <div className="flex flex-col gap-6">
            <section>
              <div className="flex items-center gap-2 mb-2.5">
                <h2 className={SECTION_LABEL}>Congés en attente</h2>
                <span className="inline-flex items-center rounded-full bg-locked-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-locked">
                  Démo
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                {CONGES_DEMO.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-3.5"
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <Avatar name={l.name} letters={2} size={30} variant="solid" color={l.color} />
                      <div className="min-w-0">
                        <p className="text-body-sm font-medium text-on-surface truncate">{l.name}</p>
                        <p className="text-label-md text-outline">{l.dates}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled
                        title="Données simulées — intégration des congés à venir"
                        className="flex-1 h-8 rounded-lg border border-outline-soft text-label-md font-semibold text-on-surface-variant opacity-70 cursor-not-allowed"
                      >
                        Refuser
                      </button>
                      <button
                        type="button"
                        disabled
                        title="Données simulées — intégration des congés à venir"
                        className="flex-1 h-8 rounded-lg bg-secondary text-on-primary text-label-md font-semibold opacity-70 cursor-not-allowed"
                      >
                        Approuver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-label-md text-outline mt-2">
                Données simulées — l&apos;intégration des congés arrivera avec le service dédié.
              </p>
            </section>

            <section>
              <h2 className={`${SECTION_LABEL} mb-2.5`}>Effectif par département</h2>
              <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
                {loading ? (
                  <p className="text-body-sm text-on-surface-variant">Chargement…</p>
                ) : deptBars.length === 0 ? (
                  <p className="text-body-sm text-on-surface-variant">Aucun effectif à afficher.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {deptBars.map((d) => (
                      <div key={d.id}>
                        <div className="flex items-center justify-between text-label-md mb-1">
                          <span className="text-on-surface truncate">{d.name}</span>
                          <span className="font-semibold text-on-surface-variant tabular-nums">
                            {d.count}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-surface-container-low overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: d.width, background: d.color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

/** La porte d'entrée de RH.
 *
 *  Son accueil EST un module, et tout le monde n'y a pas droit : sans cette
 *  garde, un membre dont le groupe fait de RH sa page de démarrage
 *  atterrissait sur un 403 juste après s'être connecté. On l'envoie vers le
 *  premier module qui lui est ouvert — ou on le lui dit franchement.
 */
export default function Racine() {
  const chargement = useSessionAccueil((s) => s.loading);
  const accueil = useSessionAccueil((s) => s.accueil);
  const prenom = useSessionAccueil((s) => s.user?.username);
  const { can } = usePermissionsAccueil();

  // Les raccourcis du groupe passent AVANT le module par défaut : c'est un
  // accueil qu'on a choisi pour ce membre, pas un pis-aller.
  const raccourcis = !!accueil?.accueil_personnalise && accueil.liens_rapides.length > 0;

  if (!chargement && (raccourcis || !can("hr.departments.view"))) {
    return (
      <DashboardShell>
        <AccueilApp
          items={NAV_ITEMS}
          can={can}
          appName="RH"
          accueil={accueil}
          prenom={prenom}
          pret={!chargement}
        />
      </DashboardShell>
    );
  }
  return <Departements />;
}
