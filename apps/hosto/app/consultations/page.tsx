"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/DashboardShell";
import { getMyEncounters, type EncounterRead } from "@/app/lib/emr-api";
import {
  SearchOutlined,
  MedicalInformationOutlined,
  ChevronLeftOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-CD", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(started: string | null, ended: string | null): string {
  if (!started) return "—";
  const end = ended ? new Date(ended) : new Date();
  const mins = Math.round((end.getTime() - new Date(started).getTime()) / 60_000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, "0")}`;
}

const STATUS_CLS: Record<string, string> = {
  EN_COURS: "bg-green-100 text-green-800",
  CLOS:     "bg-surface-container text-on-surface-variant",
  PLANIFIE: "bg-blue-100 text-blue-700",
};

const STATUS_LABEL: Record<string, string> = {
  EN_COURS: "En cours",
  CLOS:     "Clôturée",
  PLANIFIE: "Planifiée",
};

const PER_PAGE = 15;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConsultationsListPage() {
  const router = useRouter();

  const [items, setItems]           = useState<EncounterRead[]>([]);
  const [total, setTotal]           = useState(0);
  const [pages, setPages]           = useState(1);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const [search, setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate]     = useState("");
  const [toDate, setToDate]         = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyEncounters({
        q: debouncedSearch || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        page,
        per_page: PER_PAGE,
      });
      setItems(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch {
      setError("Impossible de charger les consultations.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, fromDate, toDate, page]);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardShell>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── En-tête ── */}
        <div>
          <h1 className="text-headline-sm font-semibold text-on-surface">Mes consultations</h1>
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            Historique des consultations que vous avez initiées
          </p>
        </div>

        {/* ── Filtres ── */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <SearchOutlined
              style={{ fontSize: 18 }}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom ou numéro de dossier…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface text-body-md text-on-surface focus:outline-none focus:border-primary" />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="text-label-sm text-on-surface-variant">Du</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary" />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="text-label-sm text-on-surface-variant">Au</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary" />
          </div>

          {(fromDate || toDate || debouncedSearch) && (
            <button
              onClick={() => { setSearch(""); setFromDate(""); setToDate(""); setPage(1); }}
              className="text-label-sm text-on-surface-variant hover:text-on-surface transition-colors shrink-0">
              Réinitialiser
            </button>
          )}
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* ── Tableau ── */}
        <div className="overflow-auto rounded-2xl border border-outline-variant min-h-[calc(100vh-320px)]">
          {loading ? (
            <div className="space-y-px">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 bg-surface border-b border-outline-variant/50 last:border-0">
                  <div className="h-4 w-36 rounded bg-surface-container animate-pulse" />
                  <div className="h-4 w-24 rounded bg-surface-container animate-pulse" />
                  <div className="h-4 flex-1 rounded bg-surface-container animate-pulse" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <MedicalInformationOutlined style={{ fontSize: 40 }} className="text-outline" />
              <p className="text-body-md text-on-surface-variant">
                {debouncedSearch || fromDate || toDate
                  ? "Aucune consultation ne correspond à ces critères."
                  : "Vous n'avez pas encore initié de consultation."}
              </p>
            </div>
          ) : (
            <table className="w-full text-body-sm text-on-surface">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container/50">
                  <th className="text-left px-5 py-3 text-label-sm font-medium text-on-surface-variant">Patient</th>
                  <th className="text-left px-5 py-3 text-label-sm font-medium text-on-surface-variant">Motif</th>
                  <th className="text-left px-5 py-3 text-label-sm font-medium text-on-surface-variant">Début</th>
                  <th className="text-left px-5 py-3 text-label-sm font-medium text-on-surface-variant">Durée</th>
                  <th className="text-left px-5 py-3 text-label-sm font-medium text-on-surface-variant">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {items.map((enc) => (
                  <tr
                    key={enc.id}
                    onClick={() => router.push(`/consultations/${enc.id}`)}
                    className="bg-surface hover:bg-surface-container/40 cursor-pointer transition-colors">
                    <td className="px-5 py-3.5">
                      {enc.patient ? (
                        <>
                          <div className="font-medium text-on-surface">
                            {enc.patient.prenom} {enc.patient.nom}
                          </div>
                          <div className="text-label-sm text-on-surface-variant">{enc.patient.dossier_number}</div>
                        </>
                      ) : (
                        <span className="text-on-surface-variant/50 italic">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-on-surface-variant max-w-[200px] truncate">
                      {enc.motif ?? <span className="italic text-on-surface-variant/50">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-on-surface-variant tabular-nums whitespace-nowrap">
                      {fmtDateTime(enc.started_at)}
                    </td>
                    <td className="px-5 py-3.5 text-on-surface-variant tabular-nums whitespace-nowrap">
                      {fmtDuration(enc.started_at, enc.ended_at)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-label-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[enc.status] ?? "bg-surface-container text-on-surface-variant"}`}>
                        {STATUS_LABEL[enc.status] ?? enc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Pagination ── */}
        {!loading && pages > 1 && (
          <div className="flex items-center justify-between text-body-sm text-on-surface-variant">
            <span>{total} consultation{total !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded-lg hover:bg-surface-container disabled:opacity-40 transition-colors">
                <ChevronLeftOutlined style={{ fontSize: 20 }} />
              </button>
              <span className="tabular-nums">{page} / {pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-1 rounded-lg hover:bg-surface-container disabled:opacity-40 transition-colors">
                <ChevronRightOutlined style={{ fontSize: 20 }} />
              </button>
            </div>
          </div>
        )}

      </div>
    </DashboardShell>
  );
}
