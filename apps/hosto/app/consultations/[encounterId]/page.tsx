"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { AllergyBanner } from "@/components/emr/AllergyBanner";
import { VitalsTab } from "@/components/emr/VitalsTab";
import { NotesTab } from "@/components/emr/NotesTab";
import { ConditionsTab } from "@/components/emr/ConditionsTab";
import { PrescriptionsPanel } from "@/components/prescriptions/PrescriptionsPanel";
import { LabRequestsPanel } from "@/components/lab/LabRequestsPanel";
import { ActesPanel } from "@/components/actes/ActesPanel";
import { getPatient, listServices, type Patient, type Service } from "@/app/lib/api";
import { getPatientAllergies, type AllergyRead } from "@/app/lib/emr-api";
import {
  getConsultation,
  closeConsultation,
  redirectConsultation,
  cancelConsultation,
  type ConsultationAggregate,
} from "@/app/lib/consultation-api";
import { EMRDrawer } from "@/components/emr/EMRDrawer";
import { EMRPanel } from "@/components/emr/EMRPanel";
import { SummaryTab } from "@/components/consultation/SummaryTab";
import { SplitWorkspace } from "@repo/ui/SplitWorkspace";
import {
  ArrowBackOutlined,
  PersonOutlineOutlined,
  MedicalServicesOutlined,
  CheckCircleOutlined,
  CallSplitOutlined,
  CancelOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  )
    age--;
  return age;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-CD", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type ConsultTab = "constantes" | "notes" | "diagnostics" | "prescriptions" | "examens" | "actes" | "resume";

const TABS: { id: ConsultTab; label: string; closedOnly?: boolean }[] = [
  { id: "constantes",   label: "Constantes" },
  { id: "notes",        label: "Notes cliniques" },
  { id: "diagnostics",  label: "Diagnostics" },
  { id: "prescriptions", label: "Ordonnances" },
  { id: "examens",      label: "Examens" },
  { id: "actes",        label: "Actes" },
  { id: "resume",       label: "Résumé", closedOnly: true },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConsultationPage() {
  const params = useParams<{ encounterId: string }>();
  const router = useRouter();
  const { can } = usePermissions();

  const encounterId = Number(params.encounterId);

  const canWrite = can("hosto.consultations.manage");
  const canSign  = can("hosto.emr.sign");

  const [aggregate, setAggregate] = useState<ConsultationAggregate | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [allergies, setAllergies] = useState<AllergyRead[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [activeTab, setActiveTab] = useState<ConsultTab>("constantes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emrOpen, setEmrOpen] = useState(false);
  const [splitState, setSplitState] = useState<{ title: string; content: React.ReactNode; tab: string } | null>(null);

  // ── Modal state ──
  const [showCloseModal, setShowCloseModal]       = useState(false);
  const [closeAddendum, setCloseAddendum]         = useState("");
  const [closeWarnings, setCloseWarnings]         = useState<string[]>([]);
  const [closePending, setClosePending]           = useState(false);

  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [redirectServiceId, setRedirectServiceId] = useState<number | "">("");
  const [redirectPending, setRedirectPending]     = useState(false);

  const [showCancelModal, setShowCancelModal]     = useState(false);
  const [cancelReason, setCancelReason]           = useState("");
  const [cancelPending, setCancelPending]         = useState(false);

  // Onglets de la consultation → onglets du dossier complet (volet gauche).
  const CONSULT_TO_EMR_TAB: Record<ConsultTab, string> = {
    constantes: "observations",
    notes: "notes",
    diagnostics: "conditions",
    prescriptions: "prescriptions",
    examens: "examens",
    actes: "actes",
    resume: "summary",
  };

  function openSplit(title: string, content: React.ReactNode) {
    setSplitState((prev) => ({ title, content, tab: prev?.tab ?? CONSULT_TO_EMR_TAB[activeTab] }));
  }

  const load = useCallback(async () => {
    try {
      const agg = await getConsultation(encounterId);
      setAggregate(agg);

      const [p, alg, svcs] = await Promise.all([
        getPatient(agg.encounter.patient_id),
        getPatientAllergies(agg.encounter.patient_id),
        listServices(),
      ]);
      setPatient(p);
      setAllergies(alg);
      setServices(svcs);
    } catch {
      setError("Impossible de charger la consultation.");
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => { load(); }, [load]);

  // ── Action handlers ───────────────────────────────────────────────────────

  async function handleCloseConfirm() {
    if (closePending) return;
    setClosePending(true);
    try {
      const res = await closeConsultation(encounterId, { addendum: closeAddendum || undefined });
      if (res.warnings.length > 0) {
        setCloseWarnings(res.warnings);
        setClosePending(false);
        return;
      }
      router.push("/reception");
    } catch {
      setClosePending(false);
    }
  }

  function handleCloseForce() {
    // La clôture a déjà eu lieu (warnings non-bloquants) — on redirige simplement.
    router.push("/reception");
  }

  async function handleRedirectConfirm() {
    if (redirectPending || !redirectServiceId) return;
    setRedirectPending(true);
    try {
      await redirectConsultation(encounterId, { service_id: Number(redirectServiceId) });
      router.push("/reception");
    } catch {
      setRedirectPending(false);
    }
  }

  async function handleCancelConfirm() {
    if (cancelPending) return;
    setCancelPending(true);
    try {
      await cancelConsultation(encounterId, { reason: cancelReason || undefined });
      router.push("/reception");
    } catch {
      setCancelPending(false);
    }
  }

  // ── Render guards ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center h-64 text-on-surface-variant">
          Chargement…
        </div>
      </DashboardShell>
    );
  }

  if (error || !aggregate || !patient) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-error">{error ?? "Consultation introuvable."}</p>
          <button
            onClick={() => router.push("/reception")}
            className="text-primary text-body-sm hover:underline">
            Retour à la réception
          </button>
        </div>
      </DashboardShell>
    );
  }

  const { encounter, visite } = aggregate;
  const fullName = `${patient.nom} ${patient.postnom} ${patient.prenom}`.trim();
  const age = calcAge(patient.date_naissance);
  const isClosed = encounter.status === "CLOS";

  return (
    <>
    <DashboardShell>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* ── Back + Actions ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => router.push("/consultations")}
            className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface text-body-sm transition-colors">
            <ArrowBackOutlined style={{ fontSize: 16 }} />
            Réception
          </button>

          {!isClosed && canWrite && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant text-on-surface-variant text-body-sm hover:text-error hover:border-error transition-colors">
                <CancelOutlined style={{ fontSize: 15 }} />
                Interrompre
              </button>
              <button
                onClick={() => { setShowRedirectModal(true); setRedirectServiceId(""); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant text-on-surface-variant text-body-sm hover:text-primary hover:border-primary transition-colors">
                <CallSplitOutlined style={{ fontSize: 15 }} />
                Réorienter
              </button>
              <button
                onClick={() => { setShowCloseModal(true); setCloseAddendum(""); setCloseWarnings([]); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-on-primary text-body-sm font-medium hover:bg-secondary/90 transition-colors">
                <CheckCircleOutlined style={{ fontSize: 16 }} />
                Terminer
              </button>
            </div>
          )}
          {isClosed && (
            <span className="text-label-sm text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
              Consultation clôturée
            </span>
          )}
        </div>

        {/* ── En-tête patient ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <PersonOutlineOutlined style={{ fontSize: 20 }} className="text-primary" />
              </div>
              <div>
                <h1 className="text-headline-sm font-semibold text-on-surface">{fullName}</h1>
                <p className="text-body-sm text-on-surface-variant">
                  {age} ans · {patient.sexe === "M" ? "Masculin" : "Féminin"} · Dossier {patient.dossier_number}
                </p>
              </div>
            </div>
            <button
              onClick={() => setEmrOpen(true)}
              className="flex items-center gap-1.5 text-primary text-body-sm hover:underline shrink-0">
              <MedicalServicesOutlined style={{ fontSize: 15 }} />
              Dossier médical
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-body-sm">
            <div>
              <p className="text-label-sm text-on-surface-variant mb-0.5">Motif</p>
              <p className="text-on-surface">{visite?.reason ?? encounter.motif ?? "—"}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant mb-0.5">Service</p>
              <p className="text-on-surface">{encounter.service_id ? `Service #${encounter.service_id}` : "—"}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant mb-0.5">Prise en charge</p>
              <p className="text-on-surface">{encounter.started_at ? formatDateTime(encounter.started_at) : "—"}</p>
            </div>
          </div>

          <AllergyBanner allergies={allergies} />
        </div>

        {/* ── Onglets ───────────────────────────────────────────────────── */}
        <div className="flex gap-1 border-b border-outline-variant">
          {TABS.filter((tab) => !tab.closedOnly || isClosed).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                "px-4 py-2.5 text-body-sm transition-colors -mb-px border-b-2",
                activeTab === tab.id
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-on-surface-variant hover:text-on-surface",
              ].join(" ")}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Contenu ───────────────────────────────────────────────────── */}
        <div>
          {activeTab === "constantes" && (
            <VitalsTab
              patientId={patient.id}
              canWrite={canWrite && !isClosed}
              encounterId={encounterId}
              onMutation={load}
              onSplit={canWrite && !isClosed ? openSplit : undefined}
              onCloseSplit={() => setSplitState(null)}
            />
          )}
          {activeTab === "notes" && (
            <NotesTab
              patientId={patient.id}
              canWrite={canWrite && !isClosed}
              canSign={canSign}
              encounterId={encounterId}
              onMutation={load}
              onSplit={canWrite && !isClosed ? openSplit : undefined}
              onCloseSplit={() => setSplitState(null)}
            />
          )}
          {activeTab === "diagnostics" && (
            <ConditionsTab
              patientId={patient.id}
              canWrite={canWrite && !isClosed}
              encounterId={encounterId}
              onMutation={load}
              onSplit={canWrite && !isClosed ? openSplit : undefined}
              onCloseSplit={() => setSplitState(null)}
            />
          )}
          {activeTab === "prescriptions" && (
            <PrescriptionsPanel
              patientId={patient.id}
              encounterId={encounterId}
              onSplit={canWrite && !isClosed ? openSplit : undefined}
              onCloseSplit={() => setSplitState(null)}
            />
          )}
          {activeTab === "examens" && (
            <LabRequestsPanel
              patientId={patient.id}
              encounterId={encounterId}
              onSplit={canWrite && !isClosed ? openSplit : undefined}
              onCloseSplit={() => setSplitState(null)}
            />
          )}
          {activeTab === "actes" && (
            <ActesPanel
              patientId={patient.id}
              encounterId={encounterId}
              onMutation={load}
              onSplit={canWrite && !isClosed ? openSplit : undefined}
              onCloseSplit={() => setSplitState(null)}
            />
          )}
          {activeTab === "resume" && encounter.closure_report && (
            <div className="py-4 px-1">
              <SummaryTab report={encounter.closure_report} />
            </div>
          )}
          {activeTab === "resume" && !encounter.closure_report && (
            <div className="py-8 text-center text-body-sm text-on-surface-variant">
              Aucun rapport de clôture disponible.
            </div>
          )}
        </div>
      </div>
    </DashboardShell>

    {/* ── Modal Terminer ──────────────────────────────────────────────────── */}
    {showCloseModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-[448px] p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-headline-sm font-semibold text-on-surface">Terminer la consultation</h2>
            <p className="text-body-sm text-on-surface-variant">
              La consultation sera clôturée et le patient marqué comme sorti.
            </p>
          </div>

          {closeWarnings.length > 0 && (
            <div className="rounded-xl bg-error-container p-4 space-y-2">
              <div className="flex items-center gap-2 text-error text-body-sm font-medium">
                <WarningAmberOutlined style={{ fontSize: 16 }} />
                Points d&apos;attention
              </div>
              <ul className="space-y-1">
                {closeWarnings.map((w, i) => (
                  <li key={i} className="text-body-sm text-error">· {w}</li>
                ))}
              </ul>
              <p className="text-label-sm text-on-surface-variant">
                Vous pouvez quand même clôturer la consultation.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-label-md text-on-surface-variant">
              Notes complémentaires <span className="text-label-sm">(optionnel)</span>
            </label>
            <p className="text-label-sm text-on-surface-variant/70">
              Le rapport sera automatiquement compilé depuis les constantes, notes signées, diagnostics et ordonnances.
            </p>
            <textarea
              value={closeAddendum}
              onChange={(e) => setCloseAddendum(e.target.value)}
              rows={3}
              placeholder="Consignes de suivi, observations particulières…"
              className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => { setShowCloseModal(false); setCloseWarnings([]); setCloseAddendum(""); }}
              className="px-4 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              Annuler
            </button>
            {closeWarnings.length > 0 ? (
              <button
                onClick={handleCloseForce}
                disabled={closePending}
                className="px-4 py-2 rounded-xl bg-error text-on-primary text-body-sm font-medium hover:bg-error/90 disabled:opacity-50 transition-colors">
                {closePending ? "Clôture…" : "Clôturer quand même"}
              </button>
            ) : (
              <button
                onClick={handleCloseConfirm}
                disabled={closePending}
                className="px-4 py-2 rounded-xl bg-secondary text-on-primary text-body-sm font-medium hover:bg-secondary/90 disabled:opacity-50 transition-colors">
                {closePending ? "Clôture…" : "Terminer"}
              </button>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ── Modal Réorienter ────────────────────────────────────────────────── */}
    {showRedirectModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-[448px] p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-headline-sm font-semibold text-on-surface">Réorienter le patient</h2>
            <p className="text-body-sm text-on-surface-variant">
              La consultation sera clôturée et le patient replacé en attente dans le service sélectionné.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-label-md text-on-surface-variant">Service de destination</label>
            <select
              value={redirectServiceId}
              onChange={(e) => setRedirectServiceId(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-body-sm text-on-surface focus:outline-none focus:border-primary">
              <option value="">Sélectionner un service…</option>
              {services.filter(s => s.active).map((s) => (
                <option key={s.id} value={s.id}>{s.nom}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowRedirectModal(false)}
              className="px-4 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              Annuler
            </button>
            <button
              onClick={handleRedirectConfirm}
              disabled={redirectPending || !redirectServiceId}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-medium hover:bg-primary-container disabled:opacity-50 transition-colors">
              {redirectPending ? "Réorientation…" : "Confirmer"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Modal Interrompre ────────────────────────────────────────────────── */}
    {showCancelModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-[448px] p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-headline-sm font-semibold text-on-surface">Interrompre la consultation</h2>
            <p className="text-body-sm text-on-surface-variant">
              La consultation sera clôturée et le patient marqué comme <strong>parti</strong>.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-label-md text-on-surface-variant">
              Motif <span className="text-label-sm">(optionnel)</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Patient a quitté sans attendre, refus de soins…"
              className="w-full rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-body-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowCancelModal(false)}
              className="px-4 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">
              Annuler
            </button>
            <button
              onClick={handleCancelConfirm}
              disabled={cancelPending}
              className="px-4 py-2 rounded-xl bg-error text-on-primary text-body-sm font-medium hover:bg-error/90 disabled:opacity-50 transition-colors">
              {cancelPending ? "Interruption…" : "Interrompre"}
            </button>
          </div>
        </div>
      </div>
    )}

    {emrOpen && patient && (
      <EMRDrawer
        patientId={patient.id}
        patientName={fullName}
        onClose={() => setEmrOpen(false)}
      />
    )}

    {splitState && patient && (
      <SplitWorkspace
        title={splitState.title}
        onClose={() => setSplitState(null)}
        left={
          <EMRPanel
            patientId={patient.id}
            patientName={fullName}
            initialTab={splitState.tab}
            canWrite={canWrite && !isClosed}
            canSign={canSign}
            onSplit={!isClosed ? openSplit : undefined}
            onCloseSplit={() => setSplitState(null)}
          />
        }
        right={splitState.content}
      />
    )}
    </>
  );
}
