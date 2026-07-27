"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { listVisites, type Visite, type VisitePriority } from "@/app/lib/visites-api";
import {
  AccessTimeOutlined,
  WarningAmberOutlined,
  MedicalInformationOutlined,
  PaymentsOutlined,
  AddOutlined,
  MonitorHeartOutlined,
  GridViewOutlined,
  ShieldOutlined,
  ChevronRightOutlined,
} from "@mui/icons-material";

// Priorités sur les tokens du design (pas de couleurs Tailwind brutes).
// Aucun token orange dans le design system → valeur arbitraire pour « très
// urgent » (les autres priorités mappent sur des tokens existants).
const PRIO: Record<VisitePriority, { label: string; badge: string; dot: string; border: string }> = {
  CRITIQUE: {
    label: "Critique",
    badge: "bg-error-container text-error",
    dot: "bg-error",
    border: "border-l-error",
  },
  TRES_URGENT: {
    label: "Très urgent",
    badge: "bg-[#ffe6d0] text-[#8a3d12]",
    dot: "bg-[#c2410c]",
    border: "border-l-[#c2410c]",
  },
  URGENT: {
    label: "Urgent",
    badge: "bg-tertiary/10 text-tertiary",
    dot: "bg-tertiary",
    border: "border-l-tertiary",
  },
  NORMAL: {
    label: "Standard",
    badge: "bg-surface-container text-on-surface-variant",
    dot: "bg-outline-variant",
    border: "border-l-outline-variant",
  },
};

const PRIO_RANK: Record<VisitePriority, number> = {
  CRITIQUE: 0,
  TRES_URGENT: 1,
  URGENT: 2,
  NORMAL: 3,
};

const ACTIVE: Visite["status"][] = ["ARRIVE", "EN_ATTENTE", "EN_CONSULTATION"];

function patientName(v: Visite): string {
  const p = v.patient;
  return [p.nom, p.postnom, p.prenom].filter(Boolean).join(" ") || p.dossier_number;
}

function waitMinutes(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function waitLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  return `${h} h ${String(min % 60).padStart(2, "0")}`;
}

export default function TableauBordPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canView = can("hosto.menu.reception.access") || can("hosto.visites.view");

  const [visites, setVisites] = useState<Visite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    listVisites({ status: ["ARRIVE", "EN_ATTENTE", "EN_CONSULTATION"], per_page: 100 })
      .then((p) => setVisites(p.items))
      .catch(() => setError("Impossible de charger la file."))
      .finally(() => setLoading(false));
  }, [canView]);

  const stats = useMemo(() => {
    const waiting = visites.filter((v) => v.status === "ARRIVE" || v.status === "EN_ATTENTE");
    return {
      waiting: waiting.length,
      critiques: visites.filter((v) => v.priority === "CRITIQUE").length,
      enConsult: visites.filter((v) => v.status === "EN_CONSULTATION").length,
      aEncaisser: visites.filter((v) => v.paiement_status === "EN_ATTENTE_PAIEMENT").length,
    };
  }, [visites]);

  // File d'attente triée : priorité décroissante puis ancienneté d'arrivée.
  const prochains = useMemo(() => {
    return [...visites]
      .filter((v) => v.status === "ARRIVE" || v.status === "EN_ATTENTE")
      .sort(
        (a, b) =>
          PRIO_RANK[a.priority] - PRIO_RANK[b.priority] ||
          new Date(a.arrived_at).getTime() - new Date(b.arrived_at).getTime()
      )
      .slice(0, 6);
  }, [visites]);

  const shortcuts = [
    {
      label: "Nouvelle réception",
      icon: <AddOutlined style={{ fontSize: 20 }} />,
      href: "/reception",
      show: can("hosto.menu.reception.access"),
    },
    {
      label: "Voir la file complète",
      icon: <MonitorHeartOutlined style={{ fontSize: 20 }} />,
      href: "/reception",
      show: can("hosto.menu.reception.access"),
    },
    {
      label: "Occupation des lits",
      icon: <GridViewOutlined style={{ fontSize: 20 }} />,
      href: "/occupation",
      show: can("hosto.menu.occupation.access"),
    },
  ].filter((s) => s.show);

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
        <div className="mb-6">
          <h1 className="font-display text-headline-md text-on-surface">Tableau de bord</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            {loading
              ? "File d'attente temps réel."
              : `File temps réel · ${stats.waiting} patient${stats.waiting > 1 ? "s" : ""} en attente${
                  stats.critiques > 0 ? ` · ${stats.critiques} critique${stats.critiques > 1 ? "s" : ""}` : ""
                }`}
          </p>
        </div>

        {!canView && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de voir la file.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {canView && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard
                label="En attente"
                value={loading ? "—" : stats.waiting}
                sub="file globale"
                icon={<AccessTimeOutlined style={{ fontSize: 20 }} />}
                tone="neutral"
              />
              <KpiCard
                label="Critiques"
                value={loading ? "—" : stats.critiques}
                sub="à voir maintenant"
                icon={<WarningAmberOutlined style={{ fontSize: 20 }} />}
                tone="error"
              />
              <KpiCard
                label="En consultation"
                value={loading ? "—" : stats.enConsult}
                sub="en cours"
                icon={<MedicalInformationOutlined style={{ fontSize: 20 }} />}
                tone="tertiary"
              />
              <KpiCard
                label="Attente paiement"
                value={loading ? "—" : stats.aEncaisser}
                sub="patients bloqués"
                icon={<PaymentsOutlined style={{ fontSize: 20 }} />}
                tone="warning"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
              {/* Prochains patients */}
              <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
                <div className="flex items-center justify-between px-4 md:px-5 py-3.5 border-b border-hairline">
                  <h2 className="text-body-md font-semibold text-on-surface">Prochains patients</h2>
                  {can("hosto.menu.reception.access") && (
                    <button
                      onClick={() => router.push("/reception")}
                      className="text-label-md font-semibold text-primary hover:underline"
                    >
                      Tout voir
                    </button>
                  )}
                </div>

                {loading ? (
                  <p className="px-5 py-8 text-body-sm text-on-surface-variant">Chargement…</p>
                ) : prochains.length === 0 ? (
                  <p className="px-5 py-10 text-center text-body-sm text-on-surface-variant">
                    Aucun patient en attente.
                  </p>
                ) : (
                  prochains.map((v) => {
                    const p = PRIO[v.priority];
                    const min = waitMinutes(v.arrived_at);
                    return (
                      <button
                        key={v.id}
                        onClick={() => router.push(`/patients/${v.patient_id}`)}
                        className={`w-full flex items-center gap-3 px-4 md:px-5 py-3 border-b border-hairline last:border-b-0 border-l-4 ${p.border} hover:bg-surface-container-low transition-colors text-left`}
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block text-body-md font-medium text-on-surface truncate">
                            {patientName(v)}
                          </span>
                          <span className="block text-label-md text-outline truncate">
                            {v.reason || v.service?.nom || "—"} · arrivé{" "}
                            {new Date(v.arrived_at).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </span>
                        <span
                          className={`inline-flex flex-none items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${p.badge}`}
                        >
                          <span className={`w-[6px] h-[6px] rounded-full ${p.dot}`} />
                          {p.label}
                        </span>
                        <span className="flex-none w-[70px] text-right font-mono text-label-md text-on-surface-variant">
                          {waitLabel(min)}
                        </span>
                      </button>
                    );
                  })
                )}
              </section>

              {/* Raccourcis + sécurité */}
              <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
                <p className="text-label-sm uppercase text-outline mb-3">Raccourcis</p>
                <div className="flex flex-col gap-2">
                  {shortcuts.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => router.push(s.href)}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-outline-soft text-body-md font-medium text-on-surface hover:border-primary/40 hover:bg-primary/[0.03] transition-colors text-left"
                    >
                      <span className="text-primary flex-none">{s.icon}</span>
                      <span className="flex-1">{s.label}</span>
                      <ChevronRightOutlined style={{ fontSize: 16 }} className="text-outline flex-none" />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-4 px-3 py-2.5 rounded-xl bg-surface-container-low text-label-md text-on-surface-variant">
                  <ShieldOutlined style={{ fontSize: 16 }} className="text-tertiary flex-none" />
                  Tous les accès aux dossiers sont tracés.
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

const KPI_TONE = {
  neutral: "bg-primary/10 text-primary",
  error: "bg-error-container text-error",
  tertiary: "bg-tertiary/10 text-tertiary",
  warning: "bg-locked-container text-locked",
};

function KpiCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  icon: React.ReactNode;
  tone: keyof typeof KPI_TONE;
}) {
  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-body-sm text-on-surface-variant">{label}</span>
        <span className={`w-8 h-8 flex-none rounded-lg flex items-center justify-center ${KPI_TONE[tone]}`}>
          {icon}
        </span>
      </div>
      <div className={`font-display text-headline-md mt-2.5 ${tone === "error" ? "text-error" : "text-on-surface"}`}>
        {value}
      </div>
      <div className="text-label-md text-outline mt-0.5">{sub}</div>
    </div>
  );
}
