"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AddOutlined, CheckOutlined, PeopleAltOutlined } from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Avatar } from "@repo/ui/Avatar";
import { SearchField } from "@repo/ui/SearchField";
import { DashboardShell } from "@/components/DashboardShell";
import { CreateEmployeeDrawer } from "@/components/CreateEmployeeDrawer";
import { listEmployees, type Employee } from "@/app/lib/api";

// Palette d'accents pour les avatars — variété visuelle stable par employé.
const AVATAR_COLORS = [
  "#3525cd",
  "#006c49",
  "#004598",
  "#9a3412",
  "#7c3aed",
  "#b91c1c",
  "#0e7490",
  "#a16207",
];
const accentFor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

export default function EmployeesPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canView = can("hr.employees.view");
  const canManage = can("hr.employees.manage");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  function fetchData() {
    setLoading(true);
    setError(null);
    listEmployees()
      .then(setEmployees)
      .catch(() => setError("Impossible de charger les employés."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const linkedCount = useMemo(
    () => employees.filter((e) => e.user_id !== null).length,
    [employees]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [`${e.first_name} ${e.last_name}`, e.email, e.group_name, e.job_title ?? ""]
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [employees, search]);

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto space-y-5">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="hidden md:block flex-1">
            <h1 className="font-display text-headline-md text-on-surface">Employés</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              {loading
                ? "Effectif du workspace."
                : `${employees.length} employé${employees.length > 1 ? "s" : ""} · ${linkedCount} rattaché${linkedCount > 1 ? "s" : ""} à un compte`}
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex flex-1 md:flex-none justify-center items-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors whitespace-nowrap"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Nouvel employé
            </button>
          )}
        </div>

        {canView && (
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Rechercher un employé…"
            className="w-full md:w-[300px]"
          />
        )}

        {!canView && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de voir les employés.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
        )}

        {canView && loading && (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 md:px-5 py-3.5 border-b border-hairline">
                <div className="w-8 h-8 rounded-full bg-surface-container-low animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-40 rounded bg-surface-container-low animate-pulse" />
                  <div className="h-2.5 w-32 rounded bg-surface-container-low animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {canView && !loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
            <PeopleAltOutlined style={{ fontSize: 48 }} className="text-outline-variant" />
            <p className="text-body-md">
              {search ? `Aucun résultat pour « ${search} ».` : "Aucun employé pour le moment."}
            </p>
          </div>
        )}

        {canView && !loading && !error && filtered.length > 0 && (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
              <span className="flex-1 min-w-0">Employé</span>
              <span className="w-[190px] flex-none">Département</span>
              <span className="w-[140px] flex-none">Compte</span>
            </div>

            {filtered.map((e, i) => {
              const fullName = `${e.first_name} ${e.last_name}`.trim();
              const linked = e.user_id !== null;
              return (
                <button
                  key={e.id}
                  onClick={() => router.push(`/employees/${e.id}`)}
                  className={`w-full block text-left border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors ${
                    i % 2 === 1 ? "bg-surface-row-alt" : ""
                  }`}
                >
                  {/* Carte (mobile) et rangée (bureau) — blocs distincts pour éviter
                      qu'une variante md: manquante ne casse la mise en ligne. */}
                  <span className="md:hidden block px-4 py-3">
                    <span className="flex items-center gap-3">
                      <Avatar name={fullName} letters={2} size={36} variant="solid" color={accentFor(e.id)} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-body-md font-medium text-on-surface truncate">
                          {fullName || "—"}
                        </span>
                        <span className="block text-label-md text-outline truncate">
                          {e.job_title || e.email}
                        </span>
                      </span>
                      <AccountBadge linked={linked} />
                    </span>
                    <span className="block text-label-md text-on-surface-variant mt-1.5 pl-[48px] truncate">
                      {e.group_name}
                    </span>
                  </span>

                  <span className="hidden md:flex items-center gap-4 px-5 py-3">
                    <span className="flex-1 min-w-0 flex items-center gap-3">
                      <Avatar name={fullName} letters={2} size={32} variant="solid" color={accentFor(e.id)} />
                      <span className="min-w-0">
                        <span className="block text-body-md font-medium text-on-surface truncate">
                          {fullName || "—"}
                        </span>
                        <span className="block text-label-md text-outline truncate">
                          {e.job_title || e.email}
                        </span>
                      </span>
                    </span>
                    <span className="w-[190px] flex-none text-body-sm text-on-surface-variant truncate">
                      {e.group_name}
                    </span>
                    <span className="w-[140px] flex-none">
                      <AccountBadge linked={linked} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateEmployeeDrawer onClose={() => setShowCreate(false)} onCreated={fetchData} />
      )}
    </DashboardShell>
  );
}

function AccountBadge({ linked }: { linked: boolean }) {
  if (linked) {
    return (
      <span className="inline-flex flex-none items-center gap-1 rounded-full bg-member-active-container px-2 py-0.5 text-[11px] font-semibold text-member-active whitespace-nowrap">
        <CheckOutlined style={{ fontSize: 12 }} />
        Compte lié
      </span>
    );
  }
  return (
    <span className="inline-flex flex-none items-center rounded-full bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant whitespace-nowrap">
      Non lié
    </span>
  );
}
