"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { HotelOutlined, MonitorHeartOutlined, DescriptionOutlined } from "@mui/icons-material";
import { getPatientSejours, type Sejour } from "@/app/lib/sejours-api";

const DISCHARGE_BADGE: Record<string, { label: string; cls: string }> = {
  DOMICILE: { label: "Domicile", cls: "bg-secondary/12 text-secondary" },
  TRANSFERT_EXTERNE: { label: "Transfert externe", cls: "bg-tertiary/12 text-tertiary" },
  DECES: { label: "Décès", cls: "bg-error-container text-error" },
  CONTRE_AVIS_MEDICAL: { label: "Contre avis médical", cls: "bg-error-container/60 text-error" },
  AUTRE: { label: "Autre", cls: "bg-surface-container text-on-surface-variant" },
};

function fr(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function duree(sej: Sejour): number {
  if (!sej.admitted_at) return 1;
  const fin = sej.discharged_at ? new Date(sej.discharged_at) : new Date();
  const days = Math.floor((fin.getTime() - new Date(sej.admitted_at).getTime()) / 86_400_000) + 1;
  return Math.max(days, 1);
}

export function SejoursPanel({ patientId }: { patientId: number | string }) {
  const { can } = usePermissions();
  const canView = can("hosto.admissions.view");
  const canWriteCR = can("hosto.discharge.write");
  const [sejours, setSejours] = useState<Sejour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    getPatientSejours(patientId)
      .then((rows) => setSejours([...rows].sort((a, b) =>
        new Date(b.admitted_at ?? 0).getTime() - new Date(a.admitted_at ?? 0).getTime())))
      .catch(() => setError("Impossible de charger les hospitalisations."))
      .finally(() => setLoading(false));
  }, [patientId, canView]);

  if (!canView) return <p className="text-body-sm text-on-surface-variant">Accès non autorisé.</p>;
  if (loading) return <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-surface-container animate-pulse" />)}</div>;
  if (error) return <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>;
  if (sejours.length === 0) return (
    <div className="rounded-2xl border border-dashed border-outline-variant px-6 py-12 text-center text-body-sm text-on-surface-variant">
      Aucune hospitalisation pour ce patient.
    </div>
  );

  return (
    <div className="space-y-3">
      {sejours.map((sej) => {
        const encours = sej.status === "EN_COURS";
        const annule = sej.status === "ANNULE";
        const badge = sej.discharge_type ? DISCHARGE_BADGE[sej.discharge_type] : null;
        return (
          <div key={sej.id} className={`rounded-2xl border px-5 py-4 ${
            encours ? "border-primary/40 bg-primary/5" : annule ? "border-outline-variant/60 bg-surface-container/40 opacity-70" : "border-outline-variant bg-surface-container-lowest"
          }`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5">
                <HotelOutlined className={encours ? "text-primary" : "text-on-surface-variant"} style={{ fontSize: 20 }} />
                <div>
                  <p className="text-body-md font-semibold text-on-surface">
                    {sej.service_nom ?? "Hospitalisation"}
                    {encours && <span className="ml-2 text-label-sm text-primary bg-primary/10 px-2 py-0.5 rounded-full">en cours</span>}
                    {annule && <span className="ml-2 text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">annulé</span>}
                  </p>
                  <p className="text-body-sm text-on-surface-variant">
                    {fr(sej.admitted_at)} → {sej.discharged_at ? fr(sej.discharged_at) : "…"} · {duree(sej)} j
                    {sej.chambre_numero ? ` · Ch. ${sej.chambre_numero}` : ""}
                    {sej.lit_numero ? ` · Lit ${sej.lit_numero}` : ""}
                  </p>
                  {sej.motif_admission && <p className="text-body-sm text-on-surface-variant mt-0.5">Motif : {sej.motif_admission}</p>}
                </div>
              </div>
              {badge && <span className={`shrink-0 text-label-md font-medium px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>}
            </div>
            {!annule && (
              <div className="flex gap-4 mt-3 text-label-md">
                {encours && (
                  <Link href={`/surveillance/${sej.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                    <MonitorHeartOutlined style={{ fontSize: 15 }} /> Feuille de surveillance
                  </Link>
                )}
                <Link href={`/sejours/${sej.id}/compte-rendu`} className="inline-flex items-center gap-1 text-on-surface-variant hover:text-primary hover:underline">
                  <DescriptionOutlined style={{ fontSize: 15 }} />
                  {sej.status === "SORTI" ? "Lettre de sortie" : canWriteCR ? "Compte rendu" : "Compte rendu"}
                </Link>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
