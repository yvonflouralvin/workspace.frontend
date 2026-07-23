"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { KpiCard } from "@repo/ui/KpiCard";
import { Avatar } from "@repo/ui/Avatar";
import { DashboardShell } from "@/components/DashboardShell";
import { getRootGroup, listGroupOptions, type GroupDetail } from "./lib/api";
import {
  PeopleAltOutlined,
  AccountTreeOutlined,
  BadgeOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";

const SECTION_LABEL = "text-label-sm uppercase text-outline";

export default function HomePage() {
  const { can } = usePermissions();
  const canView = can("hr.departments.view");

  const [root, setRoot] = useState<GroupDetail | null>(null);
  const [groupCount, setGroupCount] = useState<number | null>(null);
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

  // L'effectif total se lit sur la racine : elle porte le compte de ses enfants.
  const effectif = useMemo(() => {
    if (!root) return 0;
    return (
      root.employees.length +
      root.children.reduce((sum, c) => sum + c.employee_count, 0)
    );
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
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
        <div className="hidden md:block mb-6">
          <h1 className="font-display text-headline-md text-on-surface">Ressources humaines</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Organisation et effectif du workspace.
          </p>
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2 mb-4">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-7">
          <KpiCard
            label="Effectif"
            value={loading ? "—" : effectif}
            icon={<PeopleAltOutlined style={{ fontSize: 20 }} />}
            hint={loading ? undefined : "Employés rattachés à l'organisation"}
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
        </div>

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
      </div>
    </DashboardShell>
  );
}
