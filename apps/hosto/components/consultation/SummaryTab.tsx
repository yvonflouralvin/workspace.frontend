"use client";
import type { ClosureReport } from "../../app/lib/emr-api";
import {
  FavoriteBorderOutlined,
  NoteAltOutlined,
  LocalHospitalOutlined,
  MedicationOutlined,
  InfoOutlined,
} from "@mui/icons-material";

const VITAL_LABELS: Record<string, string> = {
  TEMPERATURE:    "Température",
  TA_SYSTOLIQUE:  "TA systolique",
  TA_DIASTOLIQUE: "TA diastolique",
  FC:             "Fréq. cardiaque",
  FR:             "Fréq. respiratoire",
  SPO2:           "SpO₂",
  POIDS:          "Poids",
  TAILLE:         "Taille",
  IMC:            "IMC",
  DOULEUR_EVA:    "Douleur (EVA)",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <span className="text-primary">{icon}</span>
        <h3 className="text-body-md font-semibold text-on-surface">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-body-sm text-on-surface-variant/60 italic">{label}</p>;
}

export function SummaryTab({ report }: { report: ClosureReport }) {
  return (
    <div className="space-y-8 py-2">

      {/* Addendum médecin */}
      {report.addendum && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 space-y-1">
          <div className="flex items-center gap-1.5 text-label-md text-on-surface-variant font-medium">
            <InfoOutlined style={{ fontSize: 15 }} />
            Notes complémentaires
          </div>
          <p className="text-body-sm text-on-surface whitespace-pre-wrap">{report.addendum}</p>
        </div>
      )}

      {/* Constantes vitales */}
      <Section icon={<FavoriteBorderOutlined style={{ fontSize: 18 }} />} title="Constantes vitales">
        {report.vitals.length === 0 ? (
          <Empty label="Aucune constante enregistrée pendant cette consultation." />
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {report.vitals.map((v, i) => (
              <div key={i} className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5 space-y-0.5">
                <p className="text-label-sm text-on-surface-variant">{VITAL_LABELS[v.code] ?? v.code}</p>
                <p className="text-body-md font-semibold text-on-surface">
                  {v.value} <span className="text-label-sm font-normal text-on-surface-variant">{v.unit}</span>
                </p>
                <p className="text-label-sm text-on-surface-variant/60">{fmtDateTime(v.measured_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Notes cliniques signées */}
      <Section icon={<NoteAltOutlined style={{ fontSize: 18 }} />} title="Notes cliniques signées">
        {report.notes.length === 0 ? (
          <Empty label="Aucune note signée." />
        ) : (
          <div className="space-y-3">
            {report.notes.map((n) => (
              <div key={n.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 space-y-2">
                <p className="text-label-sm text-on-surface-variant">Signé le {fmtDateTime(n.signed_at)}</p>
                {n.subjective && (
                  <div className="space-y-0.5">
                    <p className="text-label-sm text-on-surface-variant font-medium uppercase tracking-wide">Subjectif</p>
                    <p className="text-body-sm text-on-surface whitespace-pre-wrap">{n.subjective}</p>
                  </div>
                )}
                {n.objective && (
                  <div className="space-y-0.5">
                    <p className="text-label-sm text-on-surface-variant font-medium uppercase tracking-wide">Objectif</p>
                    <p className="text-body-sm text-on-surface whitespace-pre-wrap">{n.objective}</p>
                  </div>
                )}
                {n.assessment && (
                  <div className="space-y-0.5">
                    <p className="text-label-sm text-on-surface-variant font-medium uppercase tracking-wide">Évaluation</p>
                    <p className="text-body-sm text-on-surface whitespace-pre-wrap">{n.assessment}</p>
                  </div>
                )}
                {n.plan && (
                  <div className="space-y-0.5">
                    <p className="text-label-sm text-on-surface-variant font-medium uppercase tracking-wide">Plan</p>
                    <p className="text-body-sm text-on-surface whitespace-pre-wrap">{n.plan}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Diagnostics */}
      <Section icon={<LocalHospitalOutlined style={{ fontSize: 18 }} />} title="Diagnostics">
        {report.conditions.length === 0 ? (
          <Empty label="Aucun diagnostic posé pendant cette consultation." />
        ) : (
          <div className="space-y-2">
            {report.conditions.map((c) => (
              <div key={c.id} className="flex items-start gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-body-sm font-medium text-on-surface">{c.label}</p>
                  {c.icd10_code && (
                    <p className="text-label-sm text-on-surface-variant">{c.icd10_code}</p>
                  )}
                  {c.onset_date && (
                    <p className="text-label-sm text-on-surface-variant/60">Début : {fmtDate(c.onset_date)}</p>
                  )}
                </div>
                <span className={`shrink-0 text-label-sm px-2 py-0.5 rounded-full font-medium ${
                  c.clinical_status === "ACTIF"
                    ? "bg-error-container text-error"
                    : c.clinical_status === "RESOLU"
                    ? "bg-surface-container text-on-surface-variant"
                    : "bg-surface-container text-on-surface-variant"
                }`}>
                  {c.clinical_status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Ordonnances signées */}
      <Section icon={<MedicationOutlined style={{ fontSize: 18 }} />} title="Ordonnances signées">
        {report.prescriptions.length === 0 ? (
          <Empty label="Aucune ordonnance signée." />
        ) : (
          <div className="space-y-3">
            {report.prescriptions.map((rx) => (
              <div key={rx.id} className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 space-y-3">
                {rx.signed_at && (
                  <p className="text-label-sm text-on-surface-variant">Signée le {fmtDateTime(rx.signed_at)}</p>
                )}
                <div className="space-y-2">
                  {rx.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <div>
                        <p className="text-body-sm font-medium text-on-surface">{item.medication_name}</p>
                        <p className="text-label-sm text-on-surface-variant">
                          {item.dosage} · {item.frequency}
                          {item.route ? ` · ${item.route}` : ""}
                          {item.duration ? ` · ${item.duration}` : ""}
                        </p>
                        {item.instructions && (
                          <p className="text-label-sm text-on-surface-variant/70 italic">{item.instructions}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {rx.notes && (
                  <p className="text-label-sm text-on-surface-variant border-t border-outline-variant pt-2">{rx.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <p className="text-label-sm text-on-surface-variant/50 text-right pt-2">
        Rapport généré le {fmtDateTime(report.generated_at)}
      </p>
    </div>
  );
}
