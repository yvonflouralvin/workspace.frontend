"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
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
    month: "long",
    year: "numeric",
  });
}

export default function PatientsPage() {
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
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Patients</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Registre des patients enregistrés dans cet établissement.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canView && (
              <div className="relative w-64">
                <SearchOutlined
                  style={{ fontSize: 18 }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                />
                <input
                  type="search"
                  placeholder="Nom, postnom, prénom, dossier…"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            )}
            {canCreate && (
              <Link
                href="/patients/new"
                className="inline-flex items-center gap-1.5 bg-primary text-on-primary text-body-md font-medium px-4 py-2 rounded-xl hover:bg-primary-container transition-colors shrink-0"
              >
                <AddOutlined style={{ fontSize: 18 }} />
                Nouveau patient
              </Link>
            )}
          </div>
        </div>

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
                className="text-body-sm text-primary underline underline-offset-2"
              >
                Enregistrer le premier patient
              </Link>
            )}
          </div>
        )}

        {canView && !loading && !error && patients.length > 0 && (
          <>
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="border-b border-outline-variant text-left text-on-surface-variant">
                    <th className="px-5 py-3 font-medium">N° dossier</th>
                    <th className="px-5 py-3 font-medium">Nom complet</th>
                    <th className="px-5 py-3 font-medium">Sexe</th>
                    <th className="px-5 py-3 font-medium">Date de naissance</th>
                    <th className="px-5 py-3 font-medium">Lieu de naissance</th>
                    <th className="px-5 py-3 font-medium">Ville</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/patients/${p.id}`)}
                      className="border-b border-outline-variant last:border-0 hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-3 font-mono text-label-md text-on-surface-variant">
                        {p.dossier_number}
                      </td>
                      <td className="px-5 py-3 text-on-surface font-medium">
                        {p.nom} {p.postnom} {p.prenom}
                      </td>
                      <td className="px-5 py-3 text-on-surface-variant">
                        {SEXE_LABEL[p.sexe] ?? p.sexe}
                      </td>
                      <td className="px-5 py-3 text-on-surface-variant">
                        {formatDate(p.date_naissance)}
                      </td>
                      <td className="px-5 py-3 text-on-surface-variant">
                        {p.lieu_naissance_ville}, {p.lieu_naissance_pays}
                      </td>
                      <td className="px-5 py-3 text-on-surface-variant">
                        {p.adresse_ville ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-body-sm text-on-surface-variant">
                  {total} patient{total > 1 ? "s" : ""}
                  {search && ` pour « ${search} »`}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-default transition-colors"
                  >
                    ← Précédent
                  </button>
                  {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      onClick={() => handlePage(n)}
                      className={[
                        "w-8 h-8 rounded-lg text-body-sm font-medium transition-colors",
                        n === page
                          ? "bg-primary text-on-primary"
                          : "text-on-surface-variant hover:bg-surface-container",
                      ].join(" ")}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePage(page + 1)}
                    disabled={page === pages}
                    className="px-3 py-1.5 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 disabled:cursor-default transition-colors"
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
