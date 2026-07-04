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
import { getPatient, type Patient } from "@/app/lib/api";
import { getPatientAllergies, type AllergyRead } from "@/app/lib/emr-api";
import {
  getConsultation,
  closeConsultation,
  type ConsultationAggregate,
} from "@/app/lib/consultation-api";
import { EMRDrawer } from "@/components/emr/EMRDrawer";
import { EMRPanel } from "@/components/emr/EMRPanel";
import { SplitWorkspace } from "@repo/ui/SplitWorkspace";
import {
  ArrowBackOutlined,
  PersonOutlineOutlined,
  MedicalServicesOutlined,
  CheckCircleOutlined,
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

type ConsultTab = "constantes" | "notes" | "diagnostics" | "prescriptions";

const TABS: { id: ConsultTab; label: string }[] = [
  { id: "constantes", label: "Constantes" },
  { id: "notes", label: "Notes cliniques" },
  { id: "diagnostics", label: "Diagnostics" },
  { id: "prescriptions", label: "Ordonnances" },
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
  const [activeTab, setActiveTab] = useState<ConsultTab>("constantes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [emrOpen, setEmrOpen] = useState(false);
  const [splitState, setSplitState] = useState<{ title: string; content: React.ReactNode } | null>(null);

  function openSplit(title: string, content: React.ReactNode) {
    setSplitState({ title, content });
  }

  const load = useCallback(async () => {
    try {
      const agg = await getConsultation(encounterId);
      setAggregate(agg);

      const [p, alg] = await Promise.all([
        getPatient(agg.encounter.patient_id),
        getPatientAllergies(agg.encounter.patient_id),
      ]);
      setPatient(p);
      setAllergies(alg);
    } catch {
      setError("Impossible de charger la consultation.");
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => { load(); }, [load]);

  async function handleClose() {
    if (!aggregate || closing) return;
    const visiteId = aggregate.visite?.id;
    if (!visiteId) return;
    setClosing(true);
    try {
      await closeConsultation(encounterId, visiteId);
      router.push("/reception");
    } catch {
      setClosing(false);
    }
  }

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

        {/* ── Back + Terminer ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/reception")}
            className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface text-body-sm transition-colors">
            <ArrowBackOutlined style={{ fontSize: 16 }} />
            Réception
          </button>

          {!isClosed && canWrite && visite && (
            <button
              onClick={handleClose}
              disabled={closing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-on-primary text-body-sm font-medium hover:bg-secondary/90 disabled:opacity-50 transition-colors">
              <CheckCircleOutlined style={{ fontSize: 16 }} />
              {closing ? "Clôture…" : "Terminer la consultation"}
            </button>
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

          {/* motif + service + timing */}
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

          {/* allergies */}
          <AllergyBanner allergies={allergies} />
        </div>

        {/* ── Onglets ───────────────────────────────────────────────────── */}
        <div className="flex gap-1 border-b border-outline-variant">
          {TABS.map((tab) => (
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
        </div>
      </div>
    </DashboardShell>

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
        left={<EMRPanel patientId={patient.id} patientName={fullName} />}
        right={splitState.content}
      />
    )}
    </>
  );
}
