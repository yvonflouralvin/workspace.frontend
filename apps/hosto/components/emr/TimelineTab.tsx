"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MeetingRoomOutlined,
  HistoryEduOutlined,
  MonitorHeartOutlined,
  LocalHospitalOutlined,
  HotelOutlined,
  WarningAmberOutlined,
  MedicationOutlined,
  BiotechOutlined,
  HealingOutlined,
  RefreshOutlined,
  FilterListOffOutlined,
} from "@mui/icons-material";
import {
  getPatientTimeline,
  type TimelineItemRead,
  type TimelineItemType,
} from "@/app/lib/emr-api";

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  TimelineItemType,
  {
    label: string;
    Icon: React.ElementType;
    dotCls: string;
    textCls: string;
    chipActiveCls: string;
    tab: string;
  }
> = {
  ENCOUNTER: {
    label: "Consultations",
    Icon: MeetingRoomOutlined,
    dotCls: "bg-tertiary",
    textCls: "text-tertiary",
    chipActiveCls: "bg-tertiary/15 text-tertiary ring-1 ring-tertiary/40",
    tab: "notes",
  },
  NOTE: {
    label: "Notes",
    Icon: HistoryEduOutlined,
    dotCls: "bg-primary",
    textCls: "text-primary",
    chipActiveCls: "bg-primary/10 text-primary ring-1 ring-primary/40",
    tab: "notes",
  },
  OBSERVATIONS: {
    label: "Constantes",
    Icon: MonitorHeartOutlined,
    dotCls: "bg-secondary",
    textCls: "text-secondary",
    chipActiveCls: "bg-secondary/10 text-secondary ring-1 ring-secondary/40",
    tab: "observations",
  },
  CONDITION: {
    label: "Problèmes",
    Icon: LocalHospitalOutlined,
    dotCls: "bg-error",
    textCls: "text-error",
    chipActiveCls: "bg-error/10 text-error ring-1 ring-error/40",
    tab: "conditions",
  },
  ALLERGY: {
    label: "Allergies",
    Icon: WarningAmberOutlined,
    dotCls: "bg-error",
    textCls: "text-error",
    chipActiveCls: "bg-error/10 text-error ring-1 ring-error/40",
    tab: "allergies",
  },
  MEDICATION: {
    label: "Traitements",
    Icon: MedicationOutlined,
    dotCls: "bg-secondary",
    textCls: "text-secondary",
    chipActiveCls: "bg-secondary/10 text-secondary ring-1 ring-secondary/40",
    tab: "medications",
  },
  LAB: {
    label: "Examens",
    Icon: BiotechOutlined,
    dotCls: "bg-tertiary",
    textCls: "text-tertiary",
    chipActiveCls: "bg-tertiary/15 text-tertiary ring-1 ring-tertiary/40",
    tab: "examens",
  },
  ACTE: {
    label: "Actes",
    Icon: HealingOutlined,
    dotCls: "bg-primary",
    textCls: "text-primary",
    chipActiveCls: "bg-primary/10 text-primary ring-1 ring-primary/40",
    tab: "actes",
  },
  HOSPITALISATION: {
    label: "Hospitalisations",
    Icon: HotelOutlined,
    dotCls: "bg-secondary",
    textCls: "text-secondary",
    chipActiveCls: "bg-secondary/12 text-secondary ring-1 ring-secondary/40",
    tab: "hospitalisations",
  },
};

const ALL_TYPES = Object.keys(TYPE_CONFIG) as TimelineItemType[];

// ─── Period presets ───────────────────────────────────────────────────────────

type PeriodPreset = "all" | "30d" | "3m" | "1y";

const PERIOD_LABELS: Record<PeriodPreset, string> = {
  all: "Tout",
  "30d": "30 jours",
  "3m": "3 mois",
  "1y": "1 an",
};

function periodToFrom(period: PeriodPreset): string | undefined {
  if (period === "all") return undefined;
  const days = { "30d": 30, "3m": 90, "1y": 365 }[period];
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function isoDay(iso: string): string {
  return iso.slice(0, 10);
}

function fmtDay(day: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  // Parse as local midnight to avoid TZ drift
  const [y, m, d] = day.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  if (target.getTime() === today.getTime()) return "Aujourd'hui";
  if (target.getTime() === yesterday.getTime()) return "Hier";
  return target.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Group by day ─────────────────────────────────────────────────────────────

function groupByDay(items: TimelineItemRead[]): { day: string; items: TimelineItemRead[] }[] {
  const map = new Map<string, TimelineItemRead[]>();
  for (const item of items) {
    const day = isoDay(item.date);
    const arr = map.get(day) ?? [];
    arr.push(item);
    map.set(day, arr);
  }
  return Array.from(map.entries()).map(([day, items]) => ({ day, items }));
}

// ─── Event card ───────────────────────────────────────────────────────────────

function TimelineEventCard({
  item,
  patientId,
  showAxis,
}: {
  item: TimelineItemRead;
  patientId: number;
  showAxis: boolean;
}) {
  const router = useRouter();
  const cfg = TYPE_CONFIG[item.type];
  if (!cfg) return null;
  const { Icon, dotCls, textCls, tab } = cfg;

  return (
    <div className="relative flex gap-4">
      {/* Axis */}
      <div className="flex flex-col items-center shrink-0 pt-1">
        <div
          className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-surface-container-lowest ${dotCls}`}
        />
        {showAxis && (
          <div className="w-px flex-1 mt-1 min-h-[32px] bg-outline-variant/30" />
        )}
      </div>

      {/* Card */}
      <button
        type="button"
        onClick={() => router.push(`/patients/${patientId}/emr?tab=${tab}`)}
        className="flex-1 mb-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-left hover:bg-surface-container/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors"
        aria-label={`${cfg.label} — ${item.title}`}
      >
        <div className="flex items-start gap-2.5">
          <Icon style={{ fontSize: 15 }} className={`${textCls} mt-0.5 shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={`text-label-xs font-semibold uppercase tracking-wide ${textCls}`}>
                {cfg.label}
              </span>
              <span className="text-label-xs text-on-surface-variant/50">{fmtTime(item.date)}</span>
            </div>
            <p className="text-body-sm font-medium text-on-surface truncate">{item.title}</p>
            {item.summary && (
              <p className="text-body-sm text-on-surface-variant mt-0.5 line-clamp-2 break-all">
                {item.summary}
              </p>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TimelineSkeleton() {
  return (
    <div className="space-y-6 p-5">
      {[3, 2, 2].map((count, gi) => (
        <div key={gi} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-outline-variant/30" />
            <div className="h-3 w-28 rounded bg-surface-container animate-pulse" />
            <div className="h-px flex-1 bg-outline-variant/30" />
          </div>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center shrink-0 pt-1">
                <div className="w-2.5 h-2.5 rounded-full bg-surface-container animate-pulse shrink-0" />
                {i < count - 1 && (
                  <div className="w-px flex-1 mt-1 min-h-[32px] bg-outline-variant/30" />
                )}
              </div>
              <div className="flex-1 mb-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 space-y-2">
                <div className="h-3 w-20 rounded bg-surface-container animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-surface-container animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-surface-container animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const PER_PAGE = 20;

export function TimelineTab({ patientId }: { patientId: number }) {
  // Filters
  const [activeTypes, setActiveTypes] = useState<Set<TimelineItemType>>(new Set());
  const [period, setPeriod] = useState<PeriodPreset>("all");

  // Data
  const [allItems, setAllItems] = useState<TimelineItemRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const hasMore = currentPage < totalPages;
  const types = activeTypes.size > 0 ? Array.from(activeTypes) : undefined;
  const from = periodToFrom(period);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAllItems([]);
    setCurrentPage(1);
    try {
      const data = await getPatientTimeline(patientId, {
        page: 1,
        per_page: PER_PAGE,
        type: activeTypes.size > 0 ? Array.from(activeTypes) : undefined,
        from: periodToFrom(period),
      });
      setAllItems(data.items);
      setCurrentPage(data.page);
      setTotalPages(data.pages);
    } catch {
      setError("Impossible de charger la chronologie.");
    } finally {
      setLoading(false);
    }
  }, [patientId, activeTypes, period]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const data = await getPatientTimeline(patientId, {
        page: nextPage,
        per_page: PER_PAGE,
        type: types,
        from,
      });
      setAllItems((prev) => [...prev, ...data.items]);
      setCurrentPage(data.page);
      setTotalPages(data.pages);
    } catch {
      // silent — user can retry by clicking again
    } finally {
      setLoadingMore(false);
    }
  }

  function toggleType(t: TimelineItemType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function clearFilters() {
    setActiveTypes(new Set());
    setPeriod("all");
  }

  const filtersActive = activeTypes.size > 0 || period !== "all";
  const groups = groupByDay(allItems);

  return (
    <div className="space-y-4">

      {/* ── Filter bar ── */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
        <div className="px-5 py-3 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
          <h2 className="text-title-sm font-medium text-on-surface">Chronologie du dossier</h2>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <FilterListOffOutlined style={{ fontSize: 15 }} />
              Effacer les filtres
            </button>
          )}
        </div>

        {/* Type chips */}
        <div className="px-5 pt-4 pb-3 border-b border-outline-variant/40">
          <p className="text-label-xs font-medium text-on-surface-variant/70 uppercase tracking-wide mb-2">
            Type d'événement
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTypes(new Set())}
              className={`px-3 py-1 rounded-full text-label-sm font-medium transition-colors ${
                activeTypes.size === 0
                  ? "bg-on-surface/10 text-on-surface ring-1 ring-on-surface/20"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              Tout
            </button>
            {ALL_TYPES.map((t) => {
              const cfg = TYPE_CONFIG[t];
              const active = activeTypes.has(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleType(t)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-medium transition-colors ${
                    active
                      ? cfg.chipActiveCls
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <cfg.Icon style={{ fontSize: 13 }} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Period presets */}
        <div className="px-5 py-3">
          <p className="text-label-xs font-medium text-on-surface-variant/70 uppercase tracking-wide mb-2">
            Période
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(PERIOD_LABELS) as PeriodPreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-full text-label-sm font-medium transition-colors ${
                  period === p
                    ? "bg-secondary/10 text-secondary ring-1 ring-secondary/30"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">

        {loading && <TimelineSkeleton />}

        {error && !loading && (
          <div className="p-10 flex flex-col items-center gap-3 text-center">
            <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 max-w-[24rem]">
              {error}
            </p>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1.5 text-label-sm font-medium text-primary hover:underline"
            >
              <RefreshOutlined style={{ fontSize: 15 }} />
              Réessayer
            </button>
          </div>
        )}

        {!loading && !error && allItems.length === 0 && (
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <p className="text-body-md text-on-surface-variant">
              Aucun événement pour {filtersActive ? "ces filtres" : "ce dossier"}.
            </p>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-label-sm font-medium text-primary hover:underline"
              >
                Élargir les filtres
              </button>
            )}
          </div>
        )}

        {!loading && !error && allItems.length > 0 && (
          <div className="p-5">
            {groups.map(({ day, items: dayItems }, gi) => (
              <div key={day}>
                {/* Day header */}
                <div className="flex items-center gap-3 mb-3 mt-2 first:mt-0">
                  <div className="h-px flex-1 bg-outline-variant/30" />
                  <span className="text-label-xs font-semibold uppercase tracking-wide text-on-surface-variant/60 capitalize whitespace-nowrap">
                    {fmtDay(day)}
                  </span>
                  <div className="h-px flex-1 bg-outline-variant/30" />
                </div>

                {/* Events */}
                {dayItems.map((item, idx) => {
                  const isLastInGroup = idx === dayItems.length - 1;
                  const isLastGroup = gi === groups.length - 1;
                  const showAxis = !(isLastInGroup && isLastGroup && !hasMore);
                  return (
                    <TimelineEventCard
                      key={`${item.entity_type}-${item.entity_id}-${item.date}`}
                      item={item}
                      patientId={patientId}
                      showAxis={showAxis}
                    />
                  );
                })}
              </div>
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-xl text-label-sm font-medium bg-surface-container text-on-surface hover:bg-surface-container-high disabled:opacity-50 transition-colors"
                >
                  {loadingMore ? "Chargement…" : "Charger plus"}
                </button>
              </div>
            )}

            {!hasMore && (
              <p className="mt-4 text-center text-label-xs text-on-surface-variant/50">
                {allItems.length} événement{allItems.length > 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
