"use client";

import {
  AssignmentOutlined,
  EventNoteOutlined,
  MonitorHeartOutlined,
  MedicationOutlined,
} from "@mui/icons-material";
import type { EMRSummary, ObservationRead, ObservationCode } from "@/app/lib/emr-api";

// ─── Observation grouping helpers ────────────────────────────────────────────

const OBS_LABEL: Partial<Record<ObservationCode, string>> = {
  TEMPERATURE: "Température",
  FC: "Fréq. cardiaque",
  FR: "Fréq. respiratoire",
  SPO2: "SpO₂",
  POIDS: "Poids",
  TAILLE: "Taille",
  IMC: "IMC",
  DOULEUR_EVA: "Douleur EVA",
};

const OBS_ORDER: ObservationCode[] = [
  "TEMPERATURE", "FC", "FR", "SPO2", "POIDS", "TAILLE", "IMC", "DOULEUR_EVA",
];

interface ObsVignette {
  label: string;
  value: string;
  unit: string;
  measured_at: string;
}

function buildVignettes(obs: ObservationRead[]): ObsVignette[] {
  const byCode = Object.fromEntries(obs.map((o) => [o.code, o])) as Record<string, ObservationRead>;
  const result: ObsVignette[] = [];

  if (byCode.TA_SYSTOLIQUE && byCode.TA_DIASTOLIQUE) {
    result.push({
      label: "Tension artérielle",
      value: `${byCode.TA_SYSTOLIQUE.value}/${byCode.TA_DIASTOLIQUE.value}`,
      unit: "mmHg",
      measured_at: byCode.TA_SYSTOLIQUE.measured_at,
    });
  } else if (byCode.TA_SYSTOLIQUE) {
    result.push({
      label: "TA systolique",
      value: String(byCode.TA_SYSTOLIQUE.value),
      unit: "mmHg",
      measured_at: byCode.TA_SYSTOLIQUE.measured_at,
    });
  } else if (byCode.TA_DIASTOLIQUE) {
    result.push({
      label: "TA diastolique",
      value: String(byCode.TA_DIASTOLIQUE.value),
      unit: "mmHg",
      measured_at: byCode.TA_DIASTOLIQUE.measured_at,
    });
  }

  for (const code of OBS_ORDER) {
    if (byCode[code]) {
      const o = byCode[code];
      result.push({
        label: OBS_LABEL[code as ObservationCode] ?? code,
        value: String(o.value),
        unit: o.unit,
        measured_at: o.measured_at,
      });
    }
  }

  return result;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummarySection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-outline-variant bg-surface-container-low">
        <span className="text-on-surface-variant">{icon}</span>
        <h3 className="text-body-md font-semibold text-on-surface">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-body-sm text-on-surface-variant italic">{text}</p>;
}

function Skeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Chargement du résumé…">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-2xl border border-outline-variant overflow-hidden">
          <div className="h-10 bg-surface-container animate-pulse" />
          <div className="p-5 space-y-3">
            <div className="h-4 w-2/3 rounded bg-surface-container animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-surface-container animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function SummaryTab({
  summary,
  loading,
  error,
}: {
  summary: EMRSummary | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) return <Skeleton />;

  if (error) {
    return (
      <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
    );
  }

  if (!summary) return null;

  const vignettes = buildVignettes(summary.latest_observations);

  return (
    <div className="space-y-4">

      {/* ── Problèmes actifs ── */}
      <SummarySection
        title="Problèmes actifs"
        icon={<AssignmentOutlined style={{ fontSize: 18 }} />}
      >
        {summary.active_conditions.length === 0 ? (
          <Empty text="Aucun problème actif enregistré." />
        ) : (
          <ul className="space-y-2.5">
            {summary.active_conditions.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-body-md text-on-surface font-medium">{c.label}</p>
                  {c.icd10_code && (
                    <p className="text-label-sm text-on-surface-variant font-mono mt-0.5">
                      ICD-10 : {c.icd10_code}
                    </p>
                  )}
                  {c.onset_date && (
                    <p className="text-label-sm text-on-surface-variant mt-0.5">
                      Depuis le {fmtDateTime(c.onset_date)}
                    </p>
                  )}
                </div>
                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-label-sm bg-secondary/10 text-secondary">
                  Actif
                </span>
              </li>
            ))}
          </ul>
        )}
      </SummarySection>

      {/* ── Traitements en cours ── */}
      <SummarySection
        title="Traitements en cours"
        icon={<MedicationOutlined style={{ fontSize: 18 }} />}
      >
        {summary.current_medications.length === 0 ? (
          <Empty text="Aucun traitement en cours." />
        ) : (
          <ul className="space-y-2.5">
            {summary.current_medications.map((m) => (
              <li key={m.id} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-body-md text-on-surface font-medium">{m.medication}</p>
                  {(m.dosage || m.frequency || m.route) && (
                    <p className="text-body-sm text-on-surface-variant mt-0.5">
                      {[m.dosage, m.frequency, m.route].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {m.started_at && (
                    <p className="text-label-sm text-on-surface-variant mt-0.5">
                      Depuis le {fmtDateTime(m.started_at)}
                    </p>
                  )}
                </div>
                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-label-sm bg-secondary/10 text-secondary">
                  En cours
                </span>
              </li>
            ))}
          </ul>
        )}
      </SummarySection>

      {/* ── Dernières constantes ── */}
      <SummarySection
        title="Dernières constantes"
        icon={<MonitorHeartOutlined style={{ fontSize: 18 }} />}
      >
        {vignettes.length === 0 ? (
          <Empty text="Aucune constante enregistrée." />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {vignettes.map((v) => (
              <div
                key={v.label}
                className="rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-3"
              >
                <p className="text-label-sm text-on-surface-variant">{v.label}</p>
                <p className="text-body-md font-semibold text-on-surface mt-0.5">
                  {v.value}
                  <span className="text-label-sm font-normal text-on-surface-variant ml-1">
                    {v.unit}
                  </span>
                </p>
                <p className="text-label-sm text-on-surface-variant/60 mt-1">
                  {fmtDateTime(v.measured_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </SummarySection>

      {/* ── Dernier contact ── */}
      <SummarySection
        title="Dernier contact"
        icon={<EventNoteOutlined style={{ fontSize: 18 }} />}
      >
        {!summary.last_encounter ? (
          <Empty text="Aucune consultation enregistrée." />
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-body-md font-medium text-on-surface">
                {summary.last_encounter.type}
                {summary.last_encounter.motif && (
                  <span className="font-normal text-on-surface-variant">
                    {" "}— {summary.last_encounter.motif}
                  </span>
                )}
              </p>
              <p className="text-body-sm text-on-surface-variant mt-0.5">
                {fmtDateTime(summary.last_encounter.started_at ?? summary.last_encounter.created_at)}
              </p>
            </div>
            <EncounterStatusBadge status={summary.last_encounter.status} />
          </div>
        )}
      </SummarySection>

    </div>
  );
}

function EncounterStatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    EN_COURS: "bg-secondary/10 text-secondary",
    CLOS: "bg-surface-container text-on-surface-variant",
    PLANIFIE: "bg-tertiary/10 text-tertiary",
  };
  const label: Record<string, string> = {
    EN_COURS: "En cours",
    CLOS: "Terminé",
    PLANIFIE: "Planifié",
  };
  return (
    <span
      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-label-sm ${cls[status] ?? "bg-surface-container text-on-surface-variant"}`}
    >
      {label[status] ?? status}
    </span>
  );
}
