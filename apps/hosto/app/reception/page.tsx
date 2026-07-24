"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { SearchSelect } from "@repo/ui/SearchSelect";
import {
  type Visite,
  type VisiteStatus,
  type VisitePriority,
  VISITE_STATUS_LABELS,
  VISITE_PRIORITY_LABELS,
  type VisitePage,
  createVisite,
  listVisites,
  leaveVisite,
  orientVisite,
} from "@/app/lib/visites-api";
import {
  type OverviewEntry,
  type QueueEntry,
  getQueuesOverview,
  triageVisite,
} from "@/app/lib/reception-api";
import { listPatients, listServices, getMyReceptionServices, type PatientSummary, type Service } from "@/app/lib/api";
import { ApiError } from "@/app/lib/api";
import { takeVisite } from "@/app/lib/consultation-api";
import { useRouter } from "next/navigation";
import {
  createObservationsBatch,
  getLatestObservations,
  type ObservationCode,
  type ObservationRead,
} from "@/app/lib/emr-api";
import { isAbnormal, validateField, computeIMC, UNITS } from "@/components/emr/vitals-utils";
import {
  AddOutlined,
  FavoriteBorderOutlined,
  MedicalServicesOutlined,
  RefreshOutlined,
  SearchOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";

// ─── Config ───────────────────────────────────────────────────────────────────

// Priorités sur les tokens du design (aucun token orange → arbitraire pour
// « très urgent »). `leftBorder` = accent de bordure gauche de ligne.
const PRIORITY_CONFIG: Record<VisitePriority, { badge: string; dot: string; border: string; leftBorder: string }> = {
  CRITIQUE:    { badge: "bg-error-container text-error",                 dot: "bg-error",             border: "border-error/50",             leftBorder: "border-l-error" },
  TRES_URGENT: { badge: "bg-[#ffe6d0] text-[#8a3d12]",                   dot: "bg-[#c2410c]",         border: "border-[#c2410c]/50",         leftBorder: "border-l-[#c2410c]" },
  URGENT:      { badge: "bg-tertiary/10 text-tertiary",                  dot: "bg-tertiary",          border: "border-tertiary/50",          leftBorder: "border-l-tertiary" },
  NORMAL:      { badge: "bg-surface-container text-on-surface-variant",  dot: "bg-outline-variant",   border: "border-outline-variant",      leftBorder: "border-l-outline-variant" },
};

const STATUS_CONFIG: Record<VisiteStatus, { badge: string }> = {
  ARRIVE:          { badge: "bg-tertiary/10 text-tertiary" },
  EN_ATTENTE:      { badge: "bg-surface-container text-on-surface-variant" },
  EN_CONSULTATION: { badge: "bg-secondary/15 text-secondary" },
  TERMINE:         { badge: "bg-surface-container text-on-surface-variant" },
  PARTI:           { badge: "bg-surface-container text-on-surface-variant" },
};

const PAIEMENT_CONFIG: Record<string, { label: string; badge: string }> = {
  EN_ATTENTE_PAIEMENT: { label: "En attente de paiement", badge: "bg-locked-container text-locked" },
  PARTIEL:             { label: "Paiement partiel",       badge: "bg-locked-container text-locked" },
  PAYE:                { label: "Payé",                   badge: "bg-secondary/15 text-secondary" },
};

const PRIORITIES: VisitePriority[] = ["NORMAL", "URGENT", "TRES_URGENT", "CRITIQUE"];
const ALL_STATUSES: VisiteStatus[] = ["ARRIVE", "EN_ATTENTE", "EN_CONSULTATION", "TERMINE", "PARTI"];
const ACTIVE_STATUSES: VisiteStatus[] = ["ARRIVE", "EN_ATTENTE", "EN_CONSULTATION"];

const POLL_INTERVAL_MS = 30_000;
const PER_PAGE = 20;

type ActiveTab = "visites" | "services";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function WaitBadge({ minutes }: { minutes: number }) {
  const long = minutes >= 30;
  const cls  = long
    ? "text-error font-semibold"
    : minutes >= 15
      ? "text-locked"
      : "text-on-surface-variant";
  const label = minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
  return <span className={`text-body-sm tabular-nums ${cls}`}>{label}{long ? " ⚠" : ""}</span>;
}

function waitMinutes(arrivedAt: string): number {
  return Math.floor((Date.now() - new Date(arrivedAt).getTime()) / 60_000);
}

// ─── ConstantesDrawer ────────────────────────────────────────────────────────

const VITAL_LABELS: Record<ObservationCode, string> = {
  TEMPERATURE:    "Température",
  TA_SYSTOLIQUE:  "TA systolique",
  TA_DIASTOLIQUE: "TA diastolique",
  FC:             "Fréq. cardiaque",
  FR:             "Fréq. respiratoire",
  SPO2:           "SpO₂",
  POIDS:          "Poids",
  TAILLE:         "Taille",
  DOULEUR_EVA:    "Douleur (EVA)",
  IMC:            "IMC",
};

const FORM_CODES: ObservationCode[] = [
  "TEMPERATURE", "TA_SYSTOLIQUE", "TA_DIASTOLIQUE", "FC", "FR", "SPO2", "POIDS", "TAILLE", "DOULEUR_EVA",
];

function nowLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function ConstantesDrawer({
  patientId,
  patientName,
  canWrite,
  encounterId,
  onClose,
}: {
  patientId: number;
  patientName: string;
  canWrite: boolean;
  encounterId?: number;
  onClose: () => void;
}) {
  const [latest, setLatest] = useState<ObservationRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState<Partial<Record<ObservationCode, string>>>({});
  const [measuredAt, setMeasuredAt] = useState(nowLocal());
  const [errors, setErrors] = useState<Partial<Record<ObservationCode, string>>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getLatestObservations(patientId)
      .then(setLatest)
      .finally(() => setLoading(false));
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const fieldErrors: Partial<Record<ObservationCode, string>> = {};
    const items: { patient_id: number; code: ObservationCode; value: number; unit: string; measured_at: string; encounter_id?: number }[] = [];

    for (const code of FORM_CODES) {
      const raw = values[code]?.trim();
      if (!raw) continue;
      const err = validateField(code, raw);
      if (err) { fieldErrors[code] = err; continue; }
      items.push({
        patient_id: patientId,
        code,
        value: parseFloat(raw),
        unit: UNITS[code],
        measured_at: new Date(measuredAt).toISOString(),
        ...(encounterId !== undefined ? { encounter_id: encounterId } : {}),
      });
    }

    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); return; }
    if (items.length === 0) { setGlobalError("Renseignez au moins une constante."); return; }

    setSaving(true);
    setGlobalError(null);
    setErrors({});
    try {
      await createObservationsBatch(items);
      setValues({});
      setShowForm(false);
      setSaved(true);
      load();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  const byCode = Object.fromEntries(latest.map((o) => [o.code, o])) as Partial<Record<ObservationCode, ObservationRead>>;
  const imc = computeIMC(latest);

  return (
    <RightDrawer
      title={`Constantes — ${patientName}`}
      onClose={onClose}
      width="w-[480px] max-w-full"
      contentClassName="px-6 py-5 overflow-y-auto"
    >
      {/* ── Dernières constantes ── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-body-sm font-semibold text-on-surface-variant uppercase tracking-wide">
            Dernières valeurs
          </h3>
          {saved && (
            <span className="text-label-sm text-secondary">✓ Enregistré</span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : latest.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center rounded-xl border border-outline-variant bg-surface-container-lowest">
            <FavoriteBorderOutlined style={{ fontSize: 28 }} className="text-on-surface-variant/30" />
            <p className="text-body-sm text-on-surface-variant">Aucune constante enregistrée.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {FORM_CODES.filter((c) => byCode[c]).map((code) => {
              const obs = byCode[code]!;
              const abnormal = isAbnormal(code, obs.value);
              return (
                <div
                  key={code}
                  className={`rounded-xl border p-2.5 flex flex-col gap-0.5 ${
                    abnormal ? "border-error/40 bg-error-container/20" : "border-outline-variant bg-surface-container-lowest"
                  }`}>
                  <span className="text-label-xs text-on-surface-variant truncate">{VITAL_LABELS[code]}</span>
                  <span className={`text-body-md font-semibold tabular-nums ${abnormal ? "text-error" : "text-on-surface"}`}>
                    {obs.value}
                    <span className="text-label-xs font-normal text-on-surface-variant ml-0.5">{UNITS[code]}</span>
                  </span>
                </div>
              );
            })}
            {imc !== null && (
              <div className={`rounded-xl border p-2.5 flex flex-col gap-0.5 ${
                imc < 18.5 || imc > 25 ? "border-error/40 bg-error-container/20" : "border-outline-variant bg-surface-container-lowest"
              }`}>
                <span className="text-label-xs text-on-surface-variant">IMC</span>
                <span className={`text-body-md font-semibold tabular-nums ${imc < 18.5 || imc > 25 ? "text-error" : "text-on-surface"}`}>
                  {imc}
                  <span className="text-label-xs font-normal text-on-surface-variant ml-0.5">kg/m²</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bouton Nouvelle prise / Formulaire inline ── */}
      {canWrite && !showForm && (
        <button
          onClick={() => { setShowForm(true); setMeasuredAt(nowLocal()); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-tertiary/40 text-tertiary text-body-sm font-medium hover:bg-tertiary/5 transition-colors">
          <AddOutlined style={{ fontSize: 18 }} />
          Nouvelle prise de constantes
        </button>
      )}

      {canWrite && showForm && (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-body-sm font-semibold text-on-surface">Nouvelle prise</h3>
            <button
              type="button"
              onClick={() => { setShowForm(false); setValues({}); setErrors({}); setGlobalError(null); }}
              className="text-label-sm text-on-surface-variant hover:text-on-surface transition-colors">
              Annuler
            </button>
          </div>

          <div>
            <label className="text-label-md font-medium text-on-surface-variant block mb-1">Date et heure</label>
            <input
              type="datetime-local"
              value={measuredAt}
              onChange={(e) => setMeasuredAt(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-tertiary" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {FORM_CODES.map((code) => (
              <div key={code}>
                <label className="text-label-md font-medium text-on-surface-variant block mb-1">
                  {VITAL_LABELS[code]}
                  <span className="font-normal text-on-surface-variant/60 ml-1">({UNITS[code]})</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={values[code] ?? ""}
                  onChange={(e) => {
                    setValues((v) => ({ ...v, [code]: e.target.value }));
                    setErrors((er) => { const n = { ...er }; delete n[code]; return n; });
                  }}
                  placeholder="—"
                  className={`w-full rounded-xl border px-3 py-2 text-body-md text-on-surface focus:outline-none transition-colors ${
                    errors[code] ? "border-error focus:border-error" : "border-outline-variant focus:border-tertiary"
                  } bg-surface`} />
                {errors[code] && <p className="text-label-sm text-error mt-0.5">{errors[code]}</p>}
              </div>
            ))}
          </div>

          {globalError && (
            <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">{globalError}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-tertiary text-on-primary text-body-sm font-medium hover:bg-tertiary-container disabled:opacity-50 transition-colors">
            {saving ? "Enregistrement…" : "Enregistrer les constantes"}
          </button>
        </form>
      )}
    </RightDrawer>
  );
}

// ─── VisiteActionsMenu ────────────────────────────────────────────────────────

interface VisiteForMenu {
  id: number;
  status: string;
  priority: VisitePriority;
  triage_note: string | null;
  service_id: number | null;
  encounter_id?: number | null;
  patient: { id: number; prenom: string; nom: string };
}

type VisiteActionsMenuProps = {
  visite: VisiteForMenu;
  isActive: boolean;
  canConsult: boolean;
  canTriage: boolean;
  canManage: boolean;
  canWriteVitals: boolean;
  isLeaving: boolean;
  onTake: () => void;
  onTriage: () => void;
  onOrient: () => void;
  onLeave: () => void;
  onConstantes: () => void;
};

function VisiteActionsMenu({
  visite,
  isActive,
  canConsult,
  canTriage,
  canManage,
  canWriteVitals,
  isLeaving,
  onTake,
  onTriage,
  onOrient,
  onLeave,
  onConstantes,
}: VisiteActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<
    | { top: number; right: number; bottom?: undefined }
    | { bottom: number; right: number; top?: undefined }
    | null
  >(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      const t = e.target as Node;
      if (
        btnRef.current && !btnRef.current.contains(t) &&
        menuRef.current && !menuRef.current.contains(t)
      ) setOpen(false);
    }
    function onScroll() { setOpen(false); }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function toggle() {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const MENU_HEIGHT = 280;
    const right = window.innerWidth - rect.right;
    if (window.innerHeight - rect.bottom < MENU_HEIGHT) {
      setPos({ bottom: window.innerHeight - rect.top + 4, right });
    } else {
      setPos({ top: rect.bottom + 4, right });
    }
    setOpen((v) => !v);
  }

  function act(fn: () => void) {
    setOpen(false);
    fn();
  }

  const patientId = visite.patient.id;
  const dossierBase = `/patients/${patientId}/emr`;

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors text-base leading-none">
        ···
      </button>

      {open && pos && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, bottom: pos.bottom, right: pos.right, zIndex: 9999 }}
          className="min-w-[210px] max-h-[280px] overflow-y-auto rounded-xl border border-outline-variant bg-surface shadow-xl py-1">

          {/* ── Dossier ───────────────────────────────────── */}
          <p className="px-3 pt-2 pb-1 text-label-xs text-on-surface-variant uppercase tracking-wide">Dossier</p>

          <button
            onClick={() => act(onConstantes)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container transition-colors">
            <span className="text-base">📊</span>
            Constantes
          </button>

          <a
            href={dossierBase}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container transition-colors">
            <span className="text-base">📁</span>
            Dossier complet
          </a>

          {/* ── Consultation ──────────────────────────────── */}
          {(canConsult || canTriage || canManage) && isActive && (
            <>
              <div className="my-1 border-t border-outline-variant/50" />
              <p className="px-3 pt-2 pb-1 text-label-xs text-on-surface-variant uppercase tracking-wide">Consultation</p>
            </>
          )}

          {canConsult && isActive && visite.status === "EN_ATTENTE" && (
            <button
              onClick={() => act(onTake)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-body-sm text-tertiary font-medium hover:bg-tertiary/5 transition-colors">
              <span className="text-base">▶</span>
              Prendre en charge
            </button>
          )}

          {canTriage && isActive && (
            <button
              onClick={() => act(onTriage)}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container transition-colors">
              <span className="text-base">🩺</span>
              Triage
            </button>
          )}

          {canManage && isActive && (
            <>
              <button
                onClick={() => act(onOrient)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container transition-colors">
                <span className="text-base">↗</span>
                Réorienter
              </button>
              <button
                onClick={() => act(onLeave)}
                disabled={isLeaving}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-body-sm text-error hover:bg-error/5 transition-colors disabled:opacity-40">
                <span className="text-base">✕</span>
                {isLeaving ? "…" : "Marquer parti"}
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

// ─── StatusFilterDropdown ────────────────────────────────────────────────────

function StatusFilterDropdown({
  statuses,
  selected,
  onToggle,
}: {
  statuses: VisiteStatus[];
  selected: VisiteStatus[];
  onToggle: (s: VisiteStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const label =
    selected.length === 0
      ? "Aucun statut"
      : selected.length === statuses.length
        ? "Tous les statuts"
        : selected.length === 1
          ? VISITE_STATUS_LABELS[selected[0]]
          : `${selected.length} statuts`;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-outline-variant bg-surface text-body-sm text-on-surface hover:bg-surface-container transition-colors whitespace-nowrap">
        <span>{label}</span>
        <span className={`text-on-surface-variant text-xs transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-30 min-w-[180px] rounded-xl border border-outline-variant bg-surface shadow-lg py-1">
          {statuses.map((s) => {
            const checked = selected.includes(s);
            return (
              <button
                key={s}
                onClick={() => onToggle(s)}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container transition-colors text-left">
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  checked ? "bg-tertiary border-tertiary" : "border-outline-variant"
                }`}>
                  {checked && <span className="text-on-primary text-[10px] leading-none">✓</span>}
                </span>
                <span className={`px-1.5 py-0.5 rounded-full text-label-xs font-medium ${STATUS_CONFIG[s].badge}`}>
                  {VISITE_STATUS_LABELS[s]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ReceptionPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const canView    = can("hosto.reception.view");
  // Sans view.all, le sélecteur de service est restreint aux services du staff courant
  // (la sécurité réelle est côté serveur ; ceci n'est qu'un confort UX).
  const canViewAll = can("hosto.menu.reception.view.all");
  const canManage  = can("hosto.reception.manage");
  const canTriage  = can("hosto.appointments.triage");
  const canConsult = can("hosto.consultations.manage");

  const [activeTab, setActiveTab] = useState<ActiveTab>("visites");

  // ── Visites tab state ──────────────────────────────────────────────────────
  const [visitePage, setVisitePage]   = useState<VisitePage | null>(null);
  const [visiteSearch, setVisiteSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VisiteStatus[]>(ACTIVE_STATUSES);
  const [serviceFilter, setServiceFilter] = useState<number | null>(null);
  const [currentPage, setCurrentPage]   = useState(1);
  const [loadingVisites, setLoadingVisites] = useState(true);

  // ── Services tab state ─────────────────────────────────────────────────────
  const [overview, setOverview]       = useState<OverviewEntry[]>([]);
  const [svcSearch, setSvcSearch]     = useState("");
  const [svcPage, setSvcPage]         = useState(1);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const SVC_PER_PAGE = 10;

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [services, setServices]       = useState<Service[]>([]);
  const [error, setError]             = useState<string | null>(null);

  // ── Registration drawer ────────────────────────────────────────────────────
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [patientId, setPatientId]     = useState<number | null>(null);
  const [serviceId, setServiceId]     = useState<number | null>(null);
  const [priority, setPriority]       = useState<VisitePriority>("NORMAL");
  const [reason, setReason]           = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);

  // ── Triage modal ───────────────────────────────────────────────────────────
  const [triageTarget, setTriageTarget]     = useState<{ id: number; priority: VisitePriority; triage_note: string | null; patient: { prenom: string; nom: string } } | null>(null);
  const [triagePriority, setTriagePriority] = useState<VisitePriority>("NORMAL");
  const [triageNote, setTriageNote]         = useState("");
  const [triageSubmitting, setTriageSubmitting] = useState(false);

  // ── Orient modal ───────────────────────────────────────────────────────────
  const [orientTarget, setOrientTarget]   = useState<{ id: number; service_id: number | null; patient: { prenom: string; nom: string } } | null>(null);
  const [orientSvcId, setOrientSvcId]     = useState<number | null>(null);
  const [orientSubmitting, setOrientSubmitting] = useState(false);

  // ── Leave ──────────────────────────────────────────────────────────────────
  const [leavingId, setLeavingId]     = useState<number | null>(null);

  // ── Constantes drawer ──────────────────────────────────────────────────────
  const [constantesTarget, setConstantesTarget] = useState<{
    patientId: number;
    patientName: string;
    encounterId?: number;
  } | null>(null);

  const pollTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ── Chargement visites ─────────────────────────────────────────────────────
  const loadVisites = useCallback(async (pg: number, silent = false) => {
    if (!canView) { setLoadingVisites(false); return; }
    if (!silent) setLoadingVisites(true);
    try {
      const data = await listVisites({
        status: statusFilter.length > 0 ? statusFilter : ALL_STATUSES,
        service_id: serviceFilter ?? undefined,
        q: debouncedSearch || undefined,
        page: pg,
        per_page: PER_PAGE,
      });
      setVisitePage(data);
    } catch {
      if (!silent) setError("Impossible de charger les visites.");
    } finally {
      setLoadingVisites(false);
    }
  }, [canView, statusFilter, serviceFilter, debouncedSearch]);

  // ── Chargement overview ────────────────────────────────────────────────────
  const loadOverview = useCallback(async (silent = false) => {
    if (!canView) { setLoadingOverview(false); return; }
    if (!silent) setLoadingOverview(true);
    try {
      const data = await getQueuesOverview();
      setOverview(data);
    } catch {
      if (!silent) setError("Impossible de charger la vue d'ensemble.");
    } finally {
      setLoadingOverview(false);
    }
  }, [canView]);

  // ── Polling ────────────────────────────────────────────────────────────────
  const schedulePoll = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(() => {
      loadVisites(currentPage, true);
      loadOverview(true);
      schedulePoll();
    }, POLL_INTERVAL_MS);
  }, [loadVisites, loadOverview, currentPage]);

  useEffect(() => {
    (canViewAll ? listServices() : getMyReceptionServices()).then(setServices).catch(() => {});
    loadOverview();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setCurrentPage(1);
    loadVisites(1);
  }, [statusFilter, serviceFilter, debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadVisites(currentPage);
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    schedulePoll();
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, [schedulePoll]);

  // Debounce search input
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(visiteSearch);
    }, 350);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [visiteSearch]);

  function handleRefresh() {
    loadVisites(currentPage);
    loadOverview();
  }

  // ── Status filter toggle ───────────────────────────────────────────────────
  function toggleStatus(s: VisiteStatus) {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  // ── Registration drawer ────────────────────────────────────────────────────
  function openDrawer() {
    setPatientId(null); setServiceId(null);
    setPriority("NORMAL"); setReason(""); setFormError(null);
    setDrawerOpen(true);
  }

  async function handleSubmitArrivee(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId) { setFormError("Veuillez sélectionner un patient."); return; }
    setSubmitting(true); setFormError(null);
    try {
      await createVisite({ patient_id: patientId, service_id: serviceId ?? undefined, priority, reason: reason.trim() || undefined });
      setDrawerOpen(false);
      loadVisites(currentPage);
      loadOverview(true);
    } catch (err) {
      setFormError(err instanceof ApiError && err.status === 409 ? err.message : "Impossible d'enregistrer l'arrivée.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Triage ─────────────────────────────────────────────────────────────────
  function openTriage(v: Visite | QueueEntry) {
    setTriageTarget({ id: v.id, priority: v.priority, triage_note: v.triage_note, patient: v.patient });
    setTriagePriority(v.priority);
    setTriageNote(v.triage_note ?? "");
  }

  async function handleTriage(e: React.FormEvent) {
    e.preventDefault();
    if (!triageTarget) return;
    setTriageSubmitting(true);
    try {
      await triageVisite(triageTarget.id, triagePriority, triageNote.trim() || undefined);
      setTriageTarget(null);
      loadVisites(currentPage, true);
      loadOverview(true);
    } catch { /* keep modal open for retry */ }
    finally { setTriageSubmitting(false); }
  }

  // ── Orient ─────────────────────────────────────────────────────────────────
  function openOrient(v: Visite | QueueEntry) {
    setOrientTarget({ id: v.id, service_id: v.service_id, patient: v.patient });
    setOrientSvcId(null);
  }

  async function handleOrient(e: React.FormEvent) {
    e.preventDefault();
    if (!orientTarget || !orientSvcId) return;
    setOrientSubmitting(true);
    try {
      await orientVisite(orientTarget.id, orientSvcId);
      setOrientTarget(null);
      loadVisites(currentPage, true);
      loadOverview(true);
    } catch { /* keep modal open for retry */ }
    finally { setOrientSubmitting(false); }
  }

  // ── Leave ──────────────────────────────────────────────────────────────────
  async function handleLeave(id: number) {
    setLeavingId(id);
    try {
      await leaveVisite(id);
      loadVisites(currentPage, true);
      loadOverview(true);
    } catch { /* no-op */ }
    finally { setLeavingId(null); }
  }

  async function handleTakeVisite(id: number) {
    try {
      const result = await takeVisite(id);
      router.push(`/consultations/${result.encounter_id}`);
    } catch { /* no-op — visite peut déjà être prise */ }
  }

  async function searchPatients(q: string): Promise<PatientSummary[]> {
    const page = await listPatients({ q, pageSize: 10 });
    return page.items;
  }

  if (!canView) {
    return (
      <DashboardShell>
        <div className="p-8 text-center text-on-surface-variant">Accès non autorisé.</div>
      </DashboardShell>
    );
  }

  const totalWaiting = overview.reduce((n, e) => n + e.waiting_count, 0);
  const filteredOverview = overview.filter((e) =>
    svcSearch
      ? e.service.nom.toLowerCase().includes(svcSearch.toLowerCase()) ||
        e.service.code.toLowerCase().includes(svcSearch.toLowerCase())
      : true,
  );
  const svcTotalPages  = Math.max(1, Math.ceil(filteredOverview.length / SVC_PER_PAGE));
  const pagedOverview  = filteredOverview.slice((svcPage - 1) * SVC_PER_PAGE, svcPage * SVC_PER_PAGE);

  return (
    <DashboardShell>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Réception</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              File d&apos;attente temps réel · {totalWaiting} patient{totalWaiting !== 1 ? "s" : ""} en attente
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              title="Rafraîchir"
              className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container transition-colors">
              <RefreshOutlined style={{ fontSize: 20 }} />
            </button>
            {canManage && (
              <button
                onClick={openDrawer}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tertiary text-on-primary text-body-sm font-semibold shadow-button hover:bg-tertiary-container transition-colors">
                <AddOutlined style={{ fontSize: 18 }} />
                Enregistrer une arrivée
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Tabs — segmented pill (design) */}
        <div className="inline-flex p-[3px] rounded-full bg-surface-container-low border border-outline-soft">
          {(["visites", "services"] as ActiveTab[]).map((tab) => {
            const count = tab === "visites" ? visitePage?.total : overview.length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-body-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? "bg-tertiary text-on-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}>
                {tab === "visites" ? "Liste des visites" : "Services"}
                {count != null && (
                  <span
                    className={`px-1.5 rounded-full text-label-xs tabular-nums ${
                      activeTab === tab ? "bg-white/20" : "bg-surface-container text-on-surface-variant"
                    }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Liste des visites ───────────────────────────────────────── */}
        {activeTab === "visites" && (
          <div className="space-y-4">

            {/* Toolbar */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* Search — prend tout l'espace disponible */}
              <div className="relative flex-1 min-w-[180px]">
                <SearchOutlined
                  style={{ fontSize: 18 }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
                <input
                  type="text"
                  value={visiteSearch}
                  onChange={(e) => setVisiteSearch(e.target.value)}
                  placeholder="Nom, dossier…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface text-body-md text-on-surface focus:outline-none focus:border-tertiary" />
              </div>

              {/* Statut — dropdown multi-select custom */}
              <StatusFilterDropdown
                statuses={ALL_STATUSES}
                selected={statusFilter}
                onToggle={toggleStatus}
              />

              {/* Service dropdown */}
              <select
                value={serviceFilter ?? ""}
                onChange={(e) => setServiceFilter(e.target.value ? Number(e.target.value) : null)}
                className="rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-tertiary shrink-0">
                <option value="">Tous les services</option>
                {services.filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            {loadingVisites ? (
              <p className="text-body-sm text-on-surface-variant py-4">Chargement…</p>
            ) : !visitePage || visitePage.items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <MedicalServicesOutlined style={{ fontSize: 40 }} className="text-outline" />
                <p className="text-body-md text-on-surface-variant">Aucune visite trouvée.</p>
              </div>
            ) : (
              <div className="overflow-auto rounded-2xl border border-outline-variant min-h-[calc(100vh-320px)]">
                <table className="w-full text-body-sm text-on-surface">
                  <thead>
                    <tr className="border-b border-outline-variant bg-surface-container/50">
                      <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Patient</th>
                      <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Statut</th>
                      <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Priorité</th>
                      <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Service</th>
                      <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Arrivée</th>
                      <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Attente</th>
                      <th className="text-right px-4 py-3 text-label-sm text-on-surface-variant font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/50">
                    {visitePage.items.map((v) => {
                      const pcfg = PRIORITY_CONFIG[v.priority];
                      const isActive = ACTIVE_STATUSES.includes(v.status);
                      const mins = isActive ? waitMinutes(v.arrived_at) : null;
                      return (
                        <tr key={v.id} className="bg-surface hover:bg-surface-container/30 transition-colors">
                          <td className={`px-4 py-3 border-l-4 ${pcfg.leftBorder}`}>
                            <div className="font-medium text-on-surface">
                              {v.patient.prenom} {v.patient.nom}
                            </div>
                            <div className="text-label-sm text-on-surface-variant">{v.patient.dossier_number}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`text-label-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[v.status].badge}`}>
                                {VISITE_STATUS_LABELS[v.status]}
                              </span>
                              {v.paiement_status && PAIEMENT_CONFIG[v.paiement_status] && (
                                <span className={`text-label-xs px-2 py-0.5 rounded-full font-medium ${PAIEMENT_CONFIG[v.paiement_status].badge}`}>
                                  {PAIEMENT_CONFIG[v.paiement_status].label}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-label-xs px-2 py-0.5 rounded-full font-semibold ${pcfg.badge}`}>
                              {VISITE_PRIORITY_LABELS[v.priority]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant">
                            {v.service?.nom ?? <span className="italic text-on-surface-variant/60">—</span>}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-on-surface-variant">
                            {formatTime(v.arrived_at)}
                          </td>
                          <td className="px-4 py-3">
                            {mins !== null ? <WaitBadge minutes={mins} /> : <span className="text-on-surface-variant/50">—</span>}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <VisiteActionsMenu
                              visite={v}
                              isActive={isActive}
                              canConsult={canConsult}
                              canTriage={canTriage}
                              canManage={canManage}
                              canWriteVitals={canManage || canTriage || canConsult}
                              isLeaving={leavingId === v.id}
                              onTake={() => handleTakeVisite(v.id)}
                              onTriage={() => openTriage(v)}
                              onOrient={() => openOrient(v)}
                              onLeave={() => handleLeave(v.id)}
                              onConstantes={() => setConstantesTarget({
                                patientId: v.patient.id,
                                patientName: `${v.patient.prenom} ${v.patient.nom}`,
                                encounterId: v.encounter_id ?? undefined,
                              })}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {visitePage && visitePage.pages > 1 && (
              <div className="flex items-center justify-between gap-4 pt-1">
                <p className="text-body-sm text-on-surface-variant">
                  Page {visitePage.page} / {visitePage.pages} · {visitePage.total} visite{visitePage.total !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors">
                    ←
                  </button>
                  {Array.from({ length: visitePage.pages }, (_, i) => i + 1)
                    .filter((p) => Math.abs(p - currentPage) <= 2 || p === 1 || p === visitePage.pages)
                    .reduce<(number | "…")[]>((acc, p, i, arr) => {
                      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span key={`ellipsis-${i}`} className="px-2 text-on-surface-variant text-body-sm">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setCurrentPage(p as number)}
                          className={`px-3 py-1.5 rounded-xl text-body-sm transition-colors ${
                            currentPage === p
                              ? "bg-tertiary text-on-primary"
                              : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"
                          }`}>
                          {p}
                        </button>
                      ),
                    )}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(visitePage.pages, p + 1))}
                    disabled={currentPage === visitePage.pages}
                    className="px-3 py-1.5 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors">
                    →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Services ────────────────────────────────────────────────── */}
        {activeTab === "services" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <SearchOutlined
                style={{ fontSize: 18 }}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" />
              <input
                type="text"
                value={svcSearch}
                onChange={(e) => { setSvcSearch(e.target.value); setSvcPage(1); }}
                placeholder="Nom ou code…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface text-body-md text-on-surface focus:outline-none focus:border-tertiary" />
            </div>

            {loadingOverview ? (
              <p className="text-body-sm text-on-surface-variant py-4">Chargement…</p>
            ) : filteredOverview.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <MedicalServicesOutlined style={{ fontSize: 40 }} className="text-outline" />
                <p className="text-body-md text-on-surface-variant">
                  {svcSearch ? "Aucun service correspondant." : "Aucun service actif."}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-auto rounded-2xl border border-outline-variant min-h-[calc(100vh-320px)]">
                  <table className="w-full text-body-sm text-on-surface">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container/50">
                        <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Service</th>
                        <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Code</th>
                        <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">File</th>
                        <th className="text-right px-4 py-3 text-label-sm text-on-surface-variant font-medium">En attente</th>
                        <th className="text-left px-4 py-3 text-label-sm text-on-surface-variant font-medium">Prochain patient</th>
                        <th className="text-right px-4 py-3 text-label-sm text-on-surface-variant font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/50">
                      {pagedOverview.map((entry) => {
                        const { service, waiting_count, next_patient } = entry;
                        return (
                          <tr key={service.id} className="bg-surface hover:bg-surface-container/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-on-surface">{service.nom}</td>
                            <td className="px-4 py-3">
                              <span className="text-label-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                                {service.code}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {service.queue_mode === "TRIAGE" ? (
                                <span className="text-label-xs px-2 py-0.5 rounded-full bg-error/10 text-error font-medium">Triage</span>
                              ) : (
                                <span className="text-label-xs px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">FIFO</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`text-body-md font-bold tabular-nums ${waiting_count > 0 ? "text-tertiary" : "text-on-surface-variant"}`}>
                                {waiting_count}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {next_patient ? (
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_CONFIG[next_patient.priority].dot}`} />
                                  <span className="text-on-surface font-medium">
                                    {next_patient.patient.prenom} {next_patient.patient.nom}
                                  </span>
                                  <span className="text-on-surface-variant tabular-nums">
                                    · {next_patient.wait_minutes} min
                                  </span>
                                </div>
                              ) : (
                                <span className="italic text-on-surface-variant/60">File vide</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {next_patient ? (
                                <VisiteActionsMenu
                                  visite={{ ...next_patient, service_id: next_patient.service_id }}
                                  isActive={true}
                                  canConsult={canConsult}
                                  canTriage={canTriage}
                                  canManage={canManage}
                                  canWriteVitals={canManage || canTriage || canConsult}
                                  isLeaving={leavingId === next_patient.id}
                                  onTake={() => handleTakeVisite(next_patient.id)}
                                  onTriage={() => openTriage(next_patient)}
                                  onOrient={() => openOrient(next_patient)}
                                  onLeave={() => handleLeave(next_patient.id)}
                                  onConstantes={() => setConstantesTarget({
                                    patientId: next_patient.patient.id,
                                    patientName: `${next_patient.patient.prenom} ${next_patient.patient.nom}`,
                                  })}
                                />
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination services */}
                {svcTotalPages > 1 && (
                  <div className="flex items-center justify-between gap-4 pt-1">
                    <p className="text-body-sm text-on-surface-variant">
                      Page {svcPage} / {svcTotalPages} · {filteredOverview.length} service{filteredOverview.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSvcPage((p) => Math.max(1, p - 1))}
                        disabled={svcPage === 1}
                        className="px-3 py-1.5 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors">
                        ←
                      </button>
                      {Array.from({ length: svcTotalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setSvcPage(p)}
                          className={`px-3 py-1.5 rounded-xl text-body-sm transition-colors ${
                            svcPage === p
                              ? "bg-tertiary text-on-primary"
                              : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"
                          }`}>
                          {p}
                        </button>
                      ))}
                      <button
                        onClick={() => setSvcPage((p) => Math.min(svcTotalPages, p + 1))}
                        disabled={svcPage === svcTotalPages}
                        className="px-3 py-1.5 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-40 transition-colors">
                        →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Drawer enregistrement arrivée ───────────────────────────────────── */}
      {drawerOpen && (
        <RightDrawer title="Enregistrer une arrivée" onClose={() => setDrawerOpen(false)} width="w-[480px] max-w-full">
          <form onSubmit={handleSubmitArrivee} className="space-y-5">
            {formError && (
              <div className="flex items-start gap-2 rounded-xl bg-error-container/40 px-4 py-3 text-body-sm text-error">
                <WarningAmberOutlined style={{ fontSize: 16 }} className="mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">
                Patient <span className="text-error">*</span>
              </label>
              <SearchSelect<PatientSummary>
                fetchOptions={searchPatients}
                value={patientId}
                onChange={(val) => setPatientId(val as number | null)}
                getOptionLabel={(p) => `${p.prenom} ${p.nom} — ${p.dossier_number}`}
                placeholder="Rechercher un patient…"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">Service d&apos;orientation</label>
              <select
                value={serviceId ?? ""}
                onChange={(e) => setServiceId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-tertiary">
                <option value="">Non orienté pour l&apos;instant</option>
                {services.filter((s) => s.active).map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">Priorité</label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  return (
                    <button key={p} type="button" onClick={() => setPriority(p)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-body-sm font-medium transition-colors ${
                        priority === p
                          ? `${cfg.badge} ${cfg.border} ring-2 ring-offset-1 ring-current`
                          : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                      }`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      {VISITE_PRIORITY_LABELS[p]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">Motif de venue</label>
              <input type="text" value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Ex : douleur abdominale, fièvre…" maxLength={255}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-tertiary" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setDrawerOpen(false)}
                className="flex-1 px-4 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={submitting || !patientId}
                className="flex-1 px-4 py-2 rounded-xl bg-tertiary text-on-primary text-body-sm font-medium hover:bg-tertiary-container transition-colors disabled:opacity-40">
                {submitting ? "Enregistrement…" : "Enregistrer l'arrivée"}
              </button>
            </div>
          </form>
        </RightDrawer>
      )}

      {/* ── Drawer Constantes ───────────────────────────────────────────────── */}
      {constantesTarget && (
        <ConstantesDrawer
          patientId={constantesTarget.patientId}
          patientName={constantesTarget.patientName}
          canWrite={canManage || canTriage || canConsult}
          encounterId={constantesTarget.encounterId}
          onClose={() => setConstantesTarget(null)}
        />
      )}

      {/* ── Modal triage ────────────────────────────────────────────────────── */}
      {triageTarget && (
        <RightDrawer
          title={`Triage — ${triageTarget.patient.prenom} ${triageTarget.patient.nom}`}
          onClose={() => setTriageTarget(null)}
          width="w-[440px] max-w-full">
          <form onSubmit={handleTriage} className="space-y-5">
            <p className="text-body-sm text-on-surface-variant">
              Priorité actuelle : <span className="font-medium">{VISITE_PRIORITY_LABELS[triageTarget.priority]}</span>
            </p>
            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">Priorité</label>
              <div className="grid grid-cols-2 gap-2">
                {PRIORITIES.map((p) => {
                  const cfg = PRIORITY_CONFIG[p];
                  return (
                    <button key={p} type="button" onClick={() => setTriagePriority(p)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-body-sm font-medium transition-colors ${
                        triagePriority === p
                          ? `${cfg.badge} ${cfg.border} ring-2 ring-offset-1 ring-current`
                          : "border-outline-variant text-on-surface-variant hover:bg-surface-container"
                      }`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      {VISITE_PRIORITY_LABELS[p]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">Note de triage</label>
              <textarea value={triageNote} onChange={(e) => setTriageNote(e.target.value)}
                rows={3} placeholder="Observations du triage…"
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-tertiary resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setTriageTarget(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={triageSubmitting}
                className="flex-1 px-4 py-2 rounded-xl bg-tertiary text-on-primary text-body-sm font-medium hover:bg-tertiary-container transition-colors disabled:opacity-40">
                {triageSubmitting ? "Enregistrement…" : "Confirmer le triage"}
              </button>
            </div>
          </form>
        </RightDrawer>
      )}

      {/* ── Modal orientation ────────────────────────────────────────────────── */}
      {orientTarget && (
        <RightDrawer
          title={`Orienter — ${orientTarget.patient.prenom} ${orientTarget.patient.nom}`}
          onClose={() => setOrientTarget(null)}
          width="w-[380px] max-w-full">
          <form onSubmit={handleOrient} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-label-md text-on-surface-variant font-medium">
                Service de destination <span className="text-error">*</span>
              </label>
              <select value={orientSvcId ?? ""}
                onChange={(e) => setOrientSvcId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-tertiary">
                <option value="">— choisir un service —</option>
                {services.filter((s) => s.active && s.id !== orientTarget.service_id).map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOrientTarget(null)}
                className="flex-1 px-4 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={orientSubmitting || !orientSvcId}
                className="flex-1 px-4 py-2 rounded-xl bg-tertiary text-on-primary text-body-sm font-medium hover:bg-tertiary-container transition-colors disabled:opacity-40">
                {orientSubmitting ? "Réorientation…" : "Confirmer"}
              </button>
            </div>
          </form>
        </RightDrawer>
      )}
    </DashboardShell>
  );
}

