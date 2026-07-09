"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import {
  MonitorHeartOutlined,
  WarningAmberOutlined,
  MedicationOutlined,
  HealingOutlined,
  BloodtypeOutlined,
  ChevronRightOutlined,
  RefreshOutlined,
  LockOutlined,
} from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { getOccupationOverview, type ServiceOccupationOverview } from "@/app/lib/occupation-api";
import {
  getServiceSurveillance,
  type PatientCharge,
  type ServiceSurveillance,
} from "@/app/lib/surveillance-api";

const POLL_MS = 45_000;

function Badge({ icon, label, tone = "neutral" }: {
  icon: React.ReactNode; label: string; tone?: "neutral" | "warn" | "danger";
}) {
  const cls =
    tone === "danger"
      ? "bg-error-container text-error"
      : tone === "warn"
        ? "bg-tertiary/12 text-tertiary"
        : "bg-surface-container text-on-surface-variant";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-label-md font-medium ${cls}`}>
      {icon}
      {label}
    </span>
  );
}

function PatientRow({ charge, onOpen }: { charge: PatientCharge; onOpen: () => void }) {
  const enRetard = charge.doses_en_retard > 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full flex items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-colors ${
        enRetard
          ? "border-error/40 bg-error-container/25 hover:bg-error-container/40"
          : "border-outline-variant bg-surface-container-lowest hover:bg-surface-container"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-body-lg font-semibold text-on-surface truncate">
            {charge.patient.nom} {charge.patient.prenom}
          </p>
          {charge.allergie_critique && (
            <WarningAmberOutlined className="text-error shrink-0" style={{ fontSize: 18 }} titleAccess="Allergie critique" />
          )}
        </div>
        <p className="text-body-sm text-on-surface-variant">
          {charge.chambre_numero ? `Ch. ${charge.chambre_numero} · ` : ""}
          {charge.lit_numero ? `Lit ${charge.lit_numero}` : "Lit —"}
          {charge.patient.age != null ? ` · ${charge.patient.age} ans` : ""}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {charge.doses_en_retard > 0 && (
            <Badge tone="danger" icon={<WarningAmberOutlined style={{ fontSize: 15 }} />} label={`${charge.doses_en_retard} en retard`} />
          )}
          {charge.doses_a_donner > 0 && (
            <Badge icon={<MedicationOutlined style={{ fontSize: 15 }} />} label={`${charge.doses_a_donner} dose${charge.doses_a_donner > 1 ? "s" : ""}`} />
          )}
          {charge.actes_realisables > 0 && (
            <Badge icon={<HealingOutlined style={{ fontSize: 15 }} />} label={`${charge.actes_realisables} soin${charge.actes_realisables > 1 ? "s" : ""}`} />
          )}
          {charge.constante_anormale && (
            <Badge tone="warn" icon={<BloodtypeOutlined style={{ fontSize: 15 }} />} label="Constante à surveiller" />
          )}
        </div>
      </div>
      <ChevronRightOutlined className="text-on-surface-variant shrink-0" />
    </button>
  );
}

export default function SurveillancePage() {
  const { can } = usePermissions();
  const canView = can("hosto.mar.view");
  const router = useRouter();

  const [services, setServices] = useState<ServiceOccupationOverview[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [data, setData] = useState<ServiceSurveillance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Liste des services (pour le sélecteur) — une fois.
  useEffect(() => {
    if (!canView) return;
    getOccupationOverview()
      .then((rows) => {
        setServices(rows);
        setServiceId((cur) => cur ?? rows.find((r) => r.patients_hospitalises > 0)?.service_id ?? rows[0]?.service_id ?? null);
      })
      .catch(() => setError("Impossible de charger les services."));
  }, [canView]);

  const load = useCallback((silent = false) => {
    if (!canView || serviceId == null) return;
    if (!silent) setLoading(true);
    setError(null);
    getServiceSurveillance(serviceId)
      .then(setData)
      .catch(() => setError("Impossible de charger la surveillance du service."))
      .finally(() => setLoading(false));
  }, [canView, serviceId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (serviceId == null) return;
    function schedule() {
      pollRef.current = setTimeout(() => { load(true); schedule(); }, POLL_MS);
    }
    schedule();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [load, serviceId]);

  const totalRetard = useMemo(
    () => (data?.patients ?? []).reduce((n, p) => n + p.doses_en_retard, 0),
    [data],
  );

  if (!canView) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <LockOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">
            Vous n&apos;avez pas accès à la surveillance.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <MonitorHeartOutlined className="text-primary" style={{ fontSize: 28 }} />
            <div>
              <h1 className="text-headline-md font-display text-on-surface">Surveillance</h1>
              <p className="text-body-sm text-on-surface-variant">Mon tour de soins — patients hospitalisés</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant px-3 py-2 text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <RefreshOutlined style={{ fontSize: 18 }} /> Actualiser
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-label-md font-medium text-on-surface-variant">Service</label>
          <select
            className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary"
            value={serviceId ?? ""}
            onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : null)}
          >
            {services.map((s) => (
              <option key={s.service_id} value={s.service_id}>
                {s.service_nom} ({s.patients_hospitalises})
              </option>
            ))}
          </select>
          {totalRetard > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-error-container px-3 py-1 text-label-md font-semibold text-error">
              <WarningAmberOutlined style={{ fontSize: 16 }} /> {totalRetard} dose{totalRetard > 1 ? "s" : ""} en retard
            </span>
          )}
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3" role="alert">{error}</p>
        )}

        {loading ? (
          <div className="space-y-2" aria-busy>
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-surface-container animate-pulse" />)}
          </div>
        ) : (data?.patients.length ?? 0) === 0 ? (
          <div className="rounded-2xl border border-dashed border-outline-variant px-6 py-16 text-center text-body-sm text-on-surface-variant">
            Aucun patient hospitalisé dans ce service.
          </div>
        ) : (
          <div className="space-y-2.5">
            {data!.patients.map((c) => (
              <PatientRow key={c.sejour_id} charge={c} onOpen={() => router.push(`/surveillance/${c.sejour_id}`)} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
