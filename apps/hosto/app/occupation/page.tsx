"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { DashboardShell } from "@/components/DashboardShell";
import {
  ArrowBackOutlined,
  BedOutlined,
  HotelOutlined,
  LockOutlined,
  PersonSearchOutlined,
  RefreshOutlined,
  SearchOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import {
  getOccupationOverview,
  getServiceOccupation,
  getLitsLibres,
  admettrePatient,
  type ServiceOccupationOverview,
  type ServiceOccupationDetail,
  type LitOccupation,
  type LitLibre,
} from "@/app/lib/occupation-api";
import { LIT_STATUS_LABEL, changeLitStatus, type LitStatus } from "@/app/lib/beds-api";
import { listPatients, type PatientSummary } from "@/app/lib/api";
import { SejourActions } from "@/components/hospitalisation/SejourActions";

const POLL_MS = 30_000;

const TILE_CLS: Record<LitStatus, string> = {
  LIBRE: "border-secondary/40 bg-secondary/5",
  OCCUPE: "border-primary/40 bg-primary/8",
  NETTOYAGE: "border-error/30 bg-error-container/40",
  MAINTENANCE: "border-outline-variant bg-error-container/25",
  HORS_SERVICE: "border-outline-variant bg-surface-container opacity-60",
};

const CHAMBRE_TYPES = ["INDIVIDUELLE", "DOUBLE", "COMMUNE", "ISOLEMENT"];

function tauxTone(taux: number): { bar: string; text: string } {
  if (taux >= 90) return { bar: "bg-error", text: "text-error" };
  if (taux >= 75) return { bar: "bg-tertiary", text: "text-tertiary" };
  return { bar: "bg-secondary", text: "text-secondary" };
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ─── Overview card ─────────────────────────────────────────────────────────────
function OverviewCard({ ov, onOpen }: { ov: ServiceOccupationOverview; onOpen: () => void }) {
  const tone = tauxTone(ov.taux_occupation);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="text-left rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-md font-semibold text-on-surface truncate">{ov.service_nom}</p>
          <p className="text-label-sm text-on-surface-variant">{ov.patients_hospitalises} patient(s) hospitalisé(s)</p>
        </div>
        <span className={`text-headline-sm font-semibold ${tone.text}`}>{ov.taux_occupation}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-surface-container overflow-hidden">
        <div className={`h-full ${tone.bar} transition-all`} style={{ width: `${Math.min(100, ov.taux_occupation)}%` }} />
      </div>
      <div className="mt-3 flex items-center gap-3 flex-wrap text-label-sm text-on-surface-variant">
        <span className="text-secondary font-medium">{ov.libres} libre(s)</span>
        <span>·</span>
        <span className="text-primary font-medium">{ov.occupes} occupé(s)</span>
        {ov.nettoyage > 0 && <><span>·</span><span>{ov.nettoyage} nettoyage</span></>}
        {ov.maintenance + ov.hors_service > 0 && (
          <><span>·</span><span>{ov.maintenance + ov.hors_service} indispo.</span></>
        )}
      </div>
    </button>
  );
}

// ─── Lit tile ──────────────────────────────────────────────────────────────────
function LitTile({ lit, onOpen, canOperate, onLitPret }: {
  lit: LitOccupation; onOpen: () => void; canOperate: boolean; onLitPret: (litId: number) => void;
}) {
  const occupClickable = lit.status === "OCCUPE" && !!lit.occupant;
  const alerte = lit.status === "NETTOYAGE" && lit.nettoyage_alerte;
  const inner = (
    <>
      <div className="flex items-center gap-1.5">
        <BedOutlined style={{ fontSize: 15 }} className="text-on-surface-variant" />
        <span className="text-body-sm font-semibold text-on-surface">Lit {lit.numero}</span>
        {(lit.anomalie || alerte) && <WarningAmberOutlined style={{ fontSize: 14 }} className="text-error" />}
      </div>
      {lit.occupant ? (
        <div className="mt-1">
          <p className="text-body-sm text-on-surface truncate">{lit.occupant.patient_nom}</p>
          <p className="text-label-sm text-on-surface-variant">
            {lit.occupant.duree_jours} j · {lit.occupant.patient_dossier}
          </p>
        </div>
      ) : (
        <p className={`text-label-sm mt-1 ${alerte ? "text-error font-medium" : "text-on-surface-variant"}`}>
          {LIT_STATUS_LABEL[lit.status]}
          {lit.status === "NETTOYAGE" && lit.nettoyage_depuis && ` · depuis ${fmtDateTime(lit.nettoyage_depuis).split(" à ")[0]}`}
          {alerte && " · à libérer"}
          {lit.anomalie && " · anomalie"}
        </p>
      )}
    </>
  );
  return (
    <div className={`rounded-xl border p-3 min-w-[150px] ${alerte ? "border-error bg-error-container/70" : TILE_CLS[lit.status]}`}>
      {occupClickable ? (
        <button type="button" onClick={onOpen} className="text-left w-full hover:opacity-80 transition-opacity">{inner}</button>
      ) : (
        <div>{inner}</div>
      )}
      {lit.status === "NETTOYAGE" && canOperate && (
        <button type="button" onClick={() => onLitPret(lit.lit_id)}
          className="mt-2 w-full py-1.5 rounded-lg bg-secondary text-on-secondary text-label-md font-medium hover:opacity-90 transition-opacity">
          Lit prêt
        </button>
      )}
    </div>
  );
}

type LitFilter = "all" | "LIBRE" | "OCCUPE";

// ─── Service detail ────────────────────────────────────────────────────────────
function ServiceDetail({ serviceId, onBack, refreshKey }: {
  serviceId: number; onBack: () => void; refreshKey: number;
}) {
  const { can } = usePermissions();
  const canOperate = can("hosto.beds.operate") || can("hosto.beds.manage");
  const [detail, setDetail] = useState<ServiceOccupationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<LitFilter>("all");
  const [occupant, setOccupant] = useState<LitOccupation | null>(null);
  const [bump, setBump] = useState(0);
  const reload = () => setBump((x) => x + 1);

  useEffect(() => {
    getServiceOccupation(serviceId)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [serviceId, refreshKey, bump]);

  async function handleLitPret(litId: number) {
    try { await changeLitStatus(litId, "LIBRE"); reload(); }
    catch { /* laissé silencieux : le poll rafraîchira l'état réel */ }
  }

  if (loading && !detail) {
    return <div className="h-40 rounded-2xl bg-surface-container animate-pulse" />;
  }
  if (!detail) return null;

  const show = (lit: LitOccupation) =>
    filter === "all" || (filter === "LIBRE" ? lit.status === "LIBRE" : lit.status === "OCCUPE");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button type="button" onClick={onBack}
          className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors">
          <ArrowBackOutlined style={{ fontSize: 16 }} /> Tous les services
        </button>
        <div className="flex rounded-xl border border-outline-variant overflow-hidden">
          {(["all", "LIBRE", "OCCUPE"] as const).map((f) => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-body-sm transition-colors ${filter === f ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}>
              {f === "all" ? "Tous" : f === "LIBRE" ? "Libres" : "Occupés"}
            </button>
          ))}
        </div>
      </div>

      <h2 className="text-headline-sm font-display text-on-surface">{detail.service_nom}</h2>

      {detail.chambres.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucune chambre configurée dans ce service.</p>
      ) : (
        detail.chambres.map((ch) => {
          const lits = ch.lits.filter(show);
          if (lits.length === 0) return null;
          return (
            <div key={ch.chambre_id} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
              <p className="text-body-md font-semibold text-on-surface mb-3">
                Chambre {ch.numero}
                {ch.nom && <span className="text-body-sm text-on-surface-variant font-normal"> — {ch.nom}</span>}
                {ch.type && <span className="text-label-sm text-on-surface-variant/70 ml-2">{ch.type}</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {lits.map((lit) => (
                  <LitTile key={lit.lit_id} lit={lit} onOpen={() => setOccupant(lit)}
                    canOperate={canOperate} onLitPret={handleLitPret} />
                ))}
              </div>
            </div>
          );
        })
      )}

      {occupant?.occupant && (
        <RightDrawer title={`Lit ${occupant.numero} — ${occupant.occupant.patient_nom}`}
          onClose={() => setOccupant(null)} width="w-[480px] max-w-full">
          <div className="space-y-4 text-body-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-label-sm text-on-surface-variant">Dossier</p><p className="text-on-surface">{occupant.occupant.patient_dossier}</p></div>
              <div><p className="text-label-sm text-on-surface-variant">Âge / sexe</p><p className="text-on-surface">{occupant.occupant.patient_age ?? "—"} ans · {occupant.occupant.patient_sexe ?? "—"}</p></div>
              <div><p className="text-label-sm text-on-surface-variant">Admis le</p><p className="text-on-surface">{fmtDateTime(occupant.occupant.admitted_at)}</p></div>
              <div><p className="text-label-sm text-on-surface-variant">Durée</p><p className="text-on-surface">{occupant.occupant.duree_jours} jour(s)</p></div>
            </div>
            <Link href={`/patients/${occupant.occupant.patient_id}/emr`}
              className="inline-flex items-center gap-1.5 text-body-sm text-primary hover:opacity-70 transition-opacity">
              Ouvrir le dossier médical →
            </Link>
            <SejourActions sejourId={occupant.occupant.sejour_id} serviceId={serviceId}
              onDone={() => { setOccupant(null); reload(); }} />
          </div>
        </RightDrawer>
      )}
    </div>
  );
}

// ─── Recherche de lit + admission ────────────────────────────────────────────
function SearchView({ overview, canAdmit, onAdmitted }: {
  overview: ServiceOccupationOverview[]; canAdmit: boolean; onAdmitted: () => void;
}) {
  const [serviceId, setServiceId] = useState<number | "">("");
  const [type, setType] = useState("");
  const [lits, setLits] = useState<LitLibre[]>([]);
  const [loading, setLoading] = useState(true);
  const [admitLit, setAdmitLit] = useState<LitLibre | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getLitsLibres({
      service_id: serviceId === "" ? undefined : Number(serviceId),
      type_chambre: type || undefined,
    })
      .then(setLits)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [serviceId, type]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={serviceId} onChange={(e) => setServiceId(e.target.value === "" ? "" : Number(e.target.value))}
          className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary">
          <option value="">Tous les services</option>
          {overview.map((o) => <option key={o.service_id} value={o.service_id}>{o.service_nom}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}
          className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary">
          <option value="">Tous types de chambre</option>
          {CHAMBRE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-surface-container animate-pulse" />)}</div>
      ) : lits.length === 0 ? (
        <p className="text-body-md text-on-surface-variant text-center py-10">Aucun lit libre pour ces critères.</p>
      ) : (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant overflow-hidden">
          {lits.map((lit) => (
            <div key={lit.lit_id} className="flex items-center gap-4 px-5 py-3.5">
              <BedOutlined style={{ fontSize: 18 }} className="text-secondary" />
              <div className="flex-1 min-w-0">
                <p className="text-body-md text-on-surface">
                  {lit.service_nom} · Chambre {lit.chambre_numero} · Lit {lit.numero}
                </p>
                {lit.chambre_type && <p className="text-label-sm text-on-surface-variant">{lit.chambre_type}</p>}
              </div>
              {canAdmit && (
                <button type="button" onClick={() => setAdmitLit(lit)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-body-sm font-medium hover:bg-primary-container transition-colors">
                  <PersonSearchOutlined style={{ fontSize: 16 }} /> Admettre ici
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {admitLit && (
        <AdmitDrawer lit={admitLit} onClose={() => setAdmitLit(null)}
          onDone={() => { setAdmitLit(null); load(); onAdmitted(); }} />
      )}
    </div>
  );
}

function AdmitDrawer({ lit, onClose, onDone }: { lit: LitLibre; onClose: () => void; onDone: () => void }) {
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!patient) { setError("Sélectionnez un patient."); return; }
    setSaving(true); setError(null);
    try {
      await admettrePatient({ patient_id: patient.id, service_id: lit.service_id, lit_id: lit.lit_id, motif: motif.trim() || null });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Admission impossible.");
    } finally { setSaving(false); }
  }

  return (
    <RightDrawer title="Admettre un patient" onClose={onClose} width="w-[480px] max-w-full">
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="rounded-xl bg-surface-container px-4 py-3 text-body-sm text-on-surface">
            {lit.service_nom} · Chambre {lit.chambre_numero} · Lit {lit.numero}
          </div>
          <div>
            <p className="text-label-md font-medium text-on-surface-variant mb-1.5">Patient</p>
            <SearchSelect<PatientSummary>
              fetchOptions={(q) => listPatients({ q }).then((r) => r.items)}
              value={patient?.id ?? null}
              onChange={(_, rec) => setPatient(rec)}
              getOptionLabel={(p) => `${p.nom} ${p.postnom} ${p.prenom} — ${p.dossier_number}`}
              placeholder="Rechercher un patient…"
            />
          </div>
          <div>
            <p className="text-label-md font-medium text-on-surface-variant mb-1.5">Motif d&apos;admission</p>
            <textarea value={motif} onChange={(e) => setMotif(e.target.value)} rows={2}
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary resize-none"
              placeholder="Ex : surveillance post-opératoire" />
          </div>
          {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}
        </div>
        <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
          <button type="button" onClick={submit} disabled={saving}
            className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50">
            {saving ? "Admission…" : "Admettre"}
          </button>
          <button type="button" onClick={onClose} disabled={saving}
            className="px-5 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50">
            Annuler
          </button>
        </div>
      </div>
    </RightDrawer>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function OccupationPage() {
  const { can } = usePermissions();
  const canView = can("hosto.beds.view");
  const canAdmit = can("hosto.admissions.manage");

  const [mode, setMode] = useState<"board" | "search">("board");
  const [overview, setOverview] = useState<ServiceOccupationOverview[]>([]);
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((silent = false) => {
    if (!canView) return;
    if (!silent) setLoading(true);
    getOccupationOverview()
      .then(setOverview)
      .catch(() => setError("Impossible de charger l'occupation."))
      .finally(() => setLoading(false));
  }, [canView]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function schedule() {
      pollRef.current = setTimeout(() => { load(true); setRefreshKey((k) => k + 1); schedule(); }, POLL_MS);
    }
    schedule();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [load]);

  function refreshNow() { load(); setRefreshKey((k) => k + 1); }

  if (!canView) {
    return (
      <DashboardShell>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
          <LockOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Vous n&apos;avez pas accès au tableau d&apos;occupation.</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-md font-display text-on-surface flex items-center gap-2">
              <HotelOutlined style={{ fontSize: 26 }} /> Occupation
            </h1>
            <p className="text-body-sm text-on-surface-variant mt-1">Vue temps réel des lits et des patients hospitalisés.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-xl border border-outline-variant overflow-hidden">
              {(["board", "search"] as const).map((m) => (
                <button key={m} type="button" onClick={() => { setMode(m); setSelectedService(null); }}
                  className={`px-3 py-2 text-body-sm transition-colors ${mode === m ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container"}`}>
                  {m === "board" ? "Tableau de bord" : "Trouver un lit"}
                </button>
              ))}
            </div>
            <button type="button" onClick={refreshNow}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              <RefreshOutlined style={{ fontSize: 16 }} /> Actualiser
            </button>
          </div>
        </div>

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}

        {mode === "search" ? (
          <SearchView overview={overview} canAdmit={canAdmit} onAdmitted={refreshNow} />
        ) : selectedService != null ? (
          <ServiceDetail serviceId={selectedService} onBack={() => setSelectedService(null)} refreshKey={refreshKey} />
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 rounded-2xl bg-surface-container animate-pulse" />)}
          </div>
        ) : overview.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
            <SearchOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
            <p className="text-body-md text-on-surface-variant">Aucun service actif. Configurez la cartographie dans « Lits ».</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {overview.map((ov) => (
              <OverviewCard key={ov.service_id} ov={ov} onOpen={() => setSelectedService(ov.service_id)} />
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
