"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { AccessDenied } from "@repo/ui/AccessDenied";
import { DashboardShell } from "@/components/DashboardShell";
import { getPatient, type Patient } from "@/app/lib/api";
import { getPatientSummary, type EMRSummary } from "@/app/lib/emr-api";
import { AllergyBanner } from "@/components/emr/AllergyBanner";
import { SummaryTab } from "@/components/emr/SummaryTab";
import { AllergiesTab } from "@/components/emr/AllergiesTab";
import { ConditionsTab } from "@/components/emr/ConditionsTab";
import { HistoryTab } from "@/components/emr/HistoryTab";
import { MedicationsTab } from "@/components/emr/MedicationsTab";
import { VitalsTab } from "@/components/emr/VitalsTab";
import { NotesTab } from "@/components/emr/NotesTab";
import { TimelineTab } from "@/components/emr/TimelineTab";
import { PrescriptionsPanel } from "@/components/prescriptions/PrescriptionsPanel";
import {
  ArrowBackOutlined,
  BadgeOutlined,
  CakeOutlined,
  PersonOutlined,
  FolderOpenOutlined,
} from "@mui/icons-material";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEXE_LABEL: Record<string, string> = { M: "M", F: "F", A: "Autre" };

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

// ─── Tab definitions ─────────────────────────────────────────────────────────

const EMR_TABS = [
  { key: "summary",      label: "Résumé" },
  { key: "history",      label: "Antécédents" },
  { key: "allergies",    label: "Allergies" },
  { key: "conditions",   label: "Problèmes" },
  { key: "observations", label: "Constantes" },
  { key: "notes",        label: "Notes" },
  { key: "medications",      label: "Traitements" },
  { key: "prescriptions",    label: "Prescriptions" },
  { key: "timeline",         label: "Timeline" },
] as const;

type TabKey = (typeof EMR_TABS)[number]["key"];

const VALID_KEYS = new Set<string>(EMR_TABS.map((t) => t.key));

// ─── Controlled tab bar (same visual as @repo/ui Tabs, URL-driven) ───────────

function EMRTabBar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div className="flex items-center gap-1 border-b border-outline-variant overflow-x-auto">
      {EMR_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            tab.key === active
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Placeholder for future tabs ─────────────────────────────────────────────

function TabPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
      <div className="px-5 py-3 border-b border-outline-variant bg-surface-container-low">
        <div className="h-4 w-32 rounded bg-surface-container animate-pulse" />
      </div>
      <div className="p-10 flex flex-col items-center gap-3 text-center">
        <FolderOpenOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
        <p className="text-body-md text-on-surface-variant">{label}</p>
        <p className="text-body-sm text-on-surface-variant/60">Disponible dans une prochaine mise à jour.</p>
      </div>
    </div>
  );
}

// ─── Patient header compact ───────────────────────────────────────────────────

function PatientHeaderCompact({ patient }: { patient: Patient }) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-4">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-headline-sm font-display text-on-surface">
          {patient.nom} {patient.postnom} {patient.prenom}
        </h1>
        <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-mono bg-surface-container text-on-surface-variant border border-outline-variant">
          <BadgeOutlined style={{ fontSize: 12 }} />
          {patient.dossier_number}
        </span>
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-body-sm text-on-surface-variant flex-wrap">
        <span className="flex items-center gap-1.5">
          <PersonOutlined style={{ fontSize: 14 }} />
          {SEXE_LABEL[patient.sexe] ?? patient.sexe}
        </span>
        <span className="text-on-surface-variant/30">·</span>
        <span className="flex items-center gap-1.5">
          <CakeOutlined style={{ fontSize: 14 }} />
          {calcAge(patient.date_naissance)} ans
        </span>
      </div>
    </div>
  );
}

function PatientHeaderSkeleton() {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-4 space-y-2">
      <div className="h-6 w-64 rounded bg-surface-container animate-pulse" />
      <div className="h-4 w-40 rounded bg-surface-container animate-pulse" />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EMRPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = usePermissions();

  const rawTab = searchParams.get("tab") ?? "summary";
  const activeTab: TabKey = VALID_KEYS.has(rawTab) ? (rawTab as TabKey) : "summary";

  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<EMRSummary | null>(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [patientError, setPatientError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const canView = can("hosto.emr.view");
  const canWrite = can("hosto.emr.write");
  const canSign = can("hosto.emr.sign");

  function setTab(key: TabKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", key);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  const loadSummary = useCallback(() => {
    const patientId = Number(id);
    getPatientSummary(patientId)
      .then(setSummary)
      .catch(() => setSummaryError("Impossible de charger le dossier médical."))
      .finally(() => setSummaryLoading(false));
  }, [id]);

  useEffect(() => {
    if (!canView) {
      setPatientLoading(false);
      setSummaryLoading(false);
      return;
    }
    const patientId = Number(id);

    getPatient(patientId)
      .then(setPatient)
      .catch(() => setPatientError("Patient introuvable ou inaccessible."))
      .finally(() => setPatientLoading(false));

    loadSummary();
  }, [id, canView, loadSummary]);

  if (!canView) {
    return (
      <DashboardShell>
        <div className="flex flex-1 items-center justify-center p-6">
          <AccessDenied appName="Dossier médical" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-6 max-w-5xl mx-auto space-y-4">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 text-body-sm text-on-surface-variant" aria-label="Fil d'Ariane">
          <Link href="/" className="hover:text-on-surface transition-colors flex items-center gap-1">
            <ArrowBackOutlined style={{ fontSize: 16 }} />
            Patients
          </Link>
          {patient && (
            <>
              <span className="text-on-surface-variant/40">/</span>
              <Link
                href={`/patients/${id}`}
                className="hover:text-on-surface transition-colors truncate max-w-[200px]"
              >
                {patient.nom} {patient.postnom}
              </Link>
            </>
          )}
          <span className="text-on-surface-variant/40">/</span>
          <span className="text-on-surface">Dossier médical</span>
        </nav>

        {/* ── Patient header ── */}
        {patientError && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">
            {patientError}
          </p>
        )}
        {patientLoading ? <PatientHeaderSkeleton /> : patient && <PatientHeaderCompact patient={patient} />}

        {/* ── Allergy banner — always visible ── */}
        <AllergyBanner allergies={summary?.active_allergies ?? []} />

        {/* ── Tab bar ── */}
        <EMRTabBar active={activeTab} onChange={setTab} />

        {/* ── Tab content ── */}
        <div className="pt-1">
          {activeTab === "summary" && (
            <SummaryTab
              summary={summary}
              loading={summaryLoading}
              error={summaryError}
            />
          )}
          {activeTab === "history" && (
            <HistoryTab patientId={Number(id)} canWrite={canWrite} onMutation={loadSummary} />
          )}
          {activeTab === "allergies" && (
            <AllergiesTab patientId={Number(id)} canWrite={canWrite} onMutation={loadSummary} />
          )}
          {activeTab === "conditions" && (
            <ConditionsTab patientId={Number(id)} canWrite={canWrite} onMutation={loadSummary} />
          )}
          {activeTab === "observations" && (
            <VitalsTab patientId={Number(id)} canWrite={canWrite} onMutation={loadSummary} />
          )}
          {activeTab === "notes" && (
            <NotesTab
              patientId={Number(id)}
              canWrite={canWrite}
              canSign={canSign}
              onMutation={loadSummary}
            />
          )}
          {activeTab === "medications" && (
            <MedicationsTab patientId={Number(id)} canWrite={canWrite} onMutation={loadSummary} />
          )}
          {activeTab === "prescriptions" && (
            <PrescriptionsPanel patientId={Number(id)} />
          )}
          {activeTab === "timeline" && (
            <TimelineTab patientId={Number(id)} />
          )}
        </div>

      </div>
    </DashboardShell>
  );
}
