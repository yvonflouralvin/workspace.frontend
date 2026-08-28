"use client";

import { useSessionStore as useSessionAccueil } from "@repo/auth/store/session.store";
import { usePermissions as usePermissionsAccueil } from "@repo/auth/hooks/usePermissions";
import { AccueilApp } from "@repo/ui/shell/AccueilApp";
import { NAV_ITEMS } from "@/components/DashboardShell";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Pagination } from "@repo/ui/Pagination";
import { Avatar } from "@repo/ui/Avatar";
import { DashboardShell } from "@/components/DashboardShell";
import { listPatients, type PatientSummary } from "./lib/api";
import { AddOutlined, PersonOutlined, SearchOutlined } from "@mui/icons-material";

const PAGE_SIZE = 20;

const SEXE_LABEL: Record<string, string> = {
  M: "Masculin",
  F: "Féminin",
  A: "Autre",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function ageFrom(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return `${age} ans`;
}

const SEXE_SHORT: Record<string, string> = { M: "M", F: "F", A: "A" };

function Patients() {
  const router = useRouter();
  const { can } = usePermissions();
  const canView = can("hosto.patients.view");
  const canCreate = can("hosto.patients.create");

  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSearch = useRef(search);

  function fetchPatients(q: string, p: number) {
    setLoading(true);
    setError(null);
    listPatients({ q: q || undefined, page: p, pageSize: PAGE_SIZE })
      .then((data) => {
        setPatients(data.items);
        setTotal(data.total);
        setPages(data.pages);
      })
      .catch(() => setError("Impossible de charger les patients."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    fetchPatients(search, page);
  }, [canView]);

  function handleSearch(value: string) {
    setSearch(value);
    pendingSearch.current = value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchPatients(pendingSearch.current, 1);
    }, 300);
  }

  function handlePage(p: number) {
    setPage(p);
    fetchPatients(search, p);
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="hidden md:block">
            <h1 className="text-headline-md font-display text-on-surface">Patients</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Répertoire · recherche par nom ou n° de dossier.
            </p>
          </div>
          {canCreate && (
            <Link
              href="/patients/new"
              className="inline-flex flex-1 md:flex-none justify-center items-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-tertiary text-on-primary text-body-sm font-semibold shadow-button hover:bg-tertiary-container transition-colors shrink-0"
            >
              <AddOutlined style={{ fontSize: 18 }} />
              Nouveau patient
            </Link>
          )}
        </div>

        {canView && (
          <div className="relative w-full md:w-[300px]">
            <SearchOutlined
              style={{ fontSize: 18 }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
            <input
              type="search"
              placeholder="Rechercher un patient…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full h-[38px] pl-9 pr-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-tertiary transition-colors"
            />
          </div>
        )}

        {!canView && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de voir les patients.
          </p>
        )}

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {canView && loading && (
          <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        )}

        {canView && !loading && !error && patients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-3">
            <PersonOutlined style={{ fontSize: 48, opacity: 0.4 }} />
            <p className="text-body-md">
              {search ? `Aucun résultat pour « ${search} ».` : "Aucun patient enregistré."}
            </p>
            {!search && canCreate && (
              <Link
                href="/patients/new"
                className="text-body-sm text-tertiary underline underline-offset-2"
              >
                Enregistrer le premier patient
              </Link>
            )}
          </div>
        )}

        {canView && !loading && !error && patients.length > 0 && (
          <>
            <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
              <div className="hidden md:flex items-center gap-4 px-5 py-2.5 bg-surface-row-alt border-b border-surface-container-low text-label-sm uppercase text-outline">
                <span className="flex-1 min-w-0">Patient</span>
                <span className="w-[140px] flex-none">N° dossier</span>
                <span className="w-[60px] flex-none">Sexe</span>
                <span className="w-[170px] flex-none">Âge · Naissance</span>
              </div>

              {patients.map((p) => {
                const fullName = `${p.nom} ${p.postnom} ${p.prenom}`.trim();
                return (
                  <button
                    key={p.id}
                    onClick={() => router.push(`/patients/${p.id}`)}
                    className="w-full block text-left border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors"
                  >
                    {/* Carte (mobile) / rangée (bureau) — blocs distincts. */}
                    <span className="md:hidden block px-4 py-3">
                      <span className="flex items-center gap-3">
                        <Avatar name={fullName} letters={1} size={34} variant="solid" color="var(--color-tertiary)" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-body-md font-medium text-on-surface truncate">
                            {fullName || "—"}
                          </span>
                          <span className="block text-label-md text-outline font-mono truncate">
                            {p.dossier_number}
                          </span>
                        </span>
                        <span className="flex-none text-label-md text-on-surface-variant text-right">
                          {SEXE_SHORT[p.sexe] ?? p.sexe} · {ageFrom(p.date_naissance)}
                        </span>
                      </span>
                    </span>

                    <span className="hidden md:flex items-center gap-4 px-5 py-3">
                      <span className="flex-1 min-w-0 flex items-center gap-3">
                        <Avatar name={fullName} letters={1} size={32} variant="solid" color="var(--color-tertiary)" />
                        <span className="text-body-md font-medium text-on-surface truncate">
                          {fullName || "—"}
                        </span>
                      </span>
                      <span className="w-[140px] flex-none font-mono text-label-md text-on-surface-variant truncate">
                        {p.dossier_number}
                      </span>
                      <span className="w-[60px] flex-none text-body-sm text-on-surface-variant">
                        {SEXE_SHORT[p.sexe] ?? p.sexe}
                      </span>
                      <span className="w-[170px] flex-none text-body-sm text-on-surface-variant">
                        {ageFrom(p.date_naissance)} · {formatDate(p.date_naissance)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between gap-3 pt-1 min-w-0">
                <p className="text-body-sm text-on-surface-variant truncate">
                  {total} patient{total > 1 ? "s" : ""}
                  {search && ` pour « ${search} »`}
                </p>
                <Pagination page={page} pages={pages} onChange={handlePage} className="flex-none" />
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}

/** La porte d'entrée de Hosto.
 *
 *  Son accueil EST un module, et tout le monde n'y a pas droit : sans cette
 *  garde, un membre dont le groupe fait de Hosto sa page de démarrage
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

  if (!chargement && (raccourcis || !can("hosto.menu.patients.access"))) {
    return (
      <DashboardShell>
        <AccueilApp items={NAV_ITEMS} can={can} appName="Hosto"
          accueil={accueil}
          prenom={prenom} pret={!chargement} />
      </DashboardShell>
    );
  }
  return <Patients />;
}
