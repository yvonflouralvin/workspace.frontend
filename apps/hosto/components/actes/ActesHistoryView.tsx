"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ExpandMoreOutlined,
  HealingOutlined,
  PlaylistAddCheckOutlined,
} from "@mui/icons-material";
import {
  getActesHistory,
  getActesStats,
  type ActePrescrit,
  type ActeStats,
  type ActeType,
} from "@/app/lib/actes-api";
import { actorLabel, fmtDate, fmtDateTime } from "./shared";

const TYPE_FILTERS: { key: "all" | ActeType; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "MEDICAL", label: "Médical" },
  { key: "INFIRMIER", label: "Infirmier" },
];

const inputCls =
  "rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors";

function HistoryCard({ acte }: { acte: ActePrescrit }) {
  const [open, setOpen] = useState(false);
  const r = acte.realise;
  const executant = r
    ? actorLabel(r.performed_by_name, r.performed_by_role, r.performed_by)
    : "—";

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-5 py-3.5 flex items-start gap-3"
      >
        <span className="mt-0.5 shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <HealingOutlined style={{ fontSize: 17 }} className="text-primary" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-body-md font-semibold text-on-surface">{acte.acte_libelle}</span>
            {acte.acte_category && (
              <span className="text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                {acte.acte_category}
              </span>
            )}
          </div>
          <p className="text-body-sm text-on-surface-variant mt-0.5">
            {r ? fmtDateTime(r.performed_at) : "—"} · par {executant}
          </p>
          {r?.observations && !open && (
            <p className="text-body-sm text-on-surface-variant/80 italic mt-0.5 truncate">
              {r.observations}
            </p>
          )}
        </div>
        <ExpandMoreOutlined
          style={{ fontSize: 20 }}
          className={`text-on-surface-variant/50 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && r && (
        <div className="border-t border-outline-variant px-5 py-4 space-y-3 text-body-sm">
          {r.observations && (
            <div>
              <p className="text-label-sm font-medium text-on-surface-variant">Observations</p>
              <p className="text-on-surface whitespace-pre-wrap">{r.observations}</p>
            </div>
          )}
          {r.complications && (
            <div>
              <p className="text-label-sm font-medium text-error">Complications</p>
              <p className="text-error">{r.complications}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <p className="text-label-sm text-on-surface-variant">Quantité réalisée</p>
              <p className="text-on-surface">{r.quantite_realisee}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant">Prescrit le</p>
              <p className="text-on-surface">{fmtDate(acte.prescribed_at)}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant">Prescripteur</p>
              <p className="text-on-surface">
                {actorLabel(acte.prescribed_by_name, acte.prescribed_by_role, acte.prescribed_by)}
              </p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant">Indication</p>
              <p className="text-on-surface">{acte.indication || "—"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ActesHistoryView({ patientId }: { patientId: number | string }) {
  const [items, setItems] = useState<ActePrescrit[]>([]);
  const [stats, setStats] = useState<ActeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | ActeType>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getActesHistory(patientId, {
        type: typeFilter === "all" ? undefined : typeFilter,
        from: from ? `${from}T00:00:00` : undefined,
        to: to ? `${to}T23:59:59` : undefined,
      }),
      getActesStats(patientId),
    ])
      .then(([h, s]) => {
        setItems(h);
        setStats(s);
      })
      .catch(() => setError("Impossible de charger l'historique des actes."))
      .finally(() => setLoading(false));
  }, [patientId, typeFilter, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      {stats && (
        <div className="flex items-center gap-4 flex-wrap rounded-2xl border border-outline-variant bg-surface-container-low/40 px-5 py-3">
          <div>
            <p className="text-headline-sm font-semibold text-on-surface">{stats.total_realises}</p>
            <p className="text-label-sm text-on-surface-variant">acte(s) réalisé(s)</p>
          </div>
          {stats.dernier_acte_libelle && (
            <div className="border-l border-outline-variant pl-4">
              <p className="text-body-sm text-on-surface">{stats.dernier_acte_libelle}</p>
              <p className="text-label-sm text-on-surface-variant">
                dernier acte · {fmtDate(stats.dernier_acte_date)}
              </p>
            </div>
          )}
          {stats.par_categorie.length > 0 && (
            <div className="border-l border-outline-variant pl-4 flex items-center gap-2 flex-wrap">
              {stats.par_categorie.map((c) => (
                <span key={c.categorie} className="text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                  {c.categorie} · {c.count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filtres */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-xl border border-outline-variant overflow-hidden">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setTypeFilter(f.key)}
              className={`px-3 py-1.5 text-body-sm transition-colors ${
                typeFilter === f.key
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
          Du
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        </label>
        <label className="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
          Au
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
        </label>
      </div>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* Frise */}
      {loading ? (
        <div className="space-y-2" aria-busy>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-surface-container animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
          <PlaylistAddCheckOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Aucun acte réalisé sur cette période.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <HistoryCard key={a.id} acte={a} />
          ))}
        </div>
      )}
    </div>
  );
}
