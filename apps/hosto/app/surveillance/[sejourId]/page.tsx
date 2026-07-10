"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import {
  ArrowBackOutlined,
  WarningAmberOutlined,
  BlockOutlined,
  ScheduleOutlined,
  DescriptionOutlined,
  LockOutlined,
} from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { AllergyBanner } from "@/components/emr/AllergyBanner";
import { ActesPanel } from "@/components/actes/ActesPanel";
import { VitalsTab } from "@/components/emr/VitalsTab";
import {
  getFeuilleSurveillance,
  administrerDose,
  omettreDose,
  refuserDose,
  suspendrePlan,
  reprendrePlan,
  arreterPlan,
  type FeuilleSurveillance,
  type DoseSurveillance,
} from "@/app/lib/surveillance-api";

const POLL_MS = 45_000;

const STATUT_LABEL: Record<string, string> = {
  A_DONNER: "À donner", DONNEE: "Donnée", OMISE: "Omise",
  REFUSEE: "Refusée", SUSPENDUE: "Suspendue", ANNULEE: "Annulée",
};

const MOTIFS_OMISSION = [
  "Patient absent", "Vomissement", "À jeun", "Voie non disponible", "Patient endormi",
];

function heureFr(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Modale d'action sur une dose ───────────────────────────────────────────────
function DoseActionModal({ dose, mode, onClose, onDone }: {
  dose: DoseSurveillance;
  mode: "administrer" | "omettre" | "refuser";
  onClose: () => void;
  onDone: () => void;
}) {
  const [motif, setMotif] = useState("");
  const [doseReelle, setDoseReelle] = useState("");
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titre = mode === "administrer" ? "Administrer la dose"
    : mode === "omettre" ? "Omettre la dose" : "Refus du patient";
  const motifRequis = mode !== "administrer";
  const motifVide = motifRequis && !motif.trim();

  async function submit() {
    if (motifVide) return;
    setSaving(true); setError(null);
    try {
      if (mode === "administrer") {
        const body: { dose_reelle?: number; observations?: string } = {};
        if (doseReelle.trim()) body.dose_reelle = Number(doseReelle);
        if (observations.trim()) body.observations = observations.trim();
        await administrerDose(dose.id, body);
      } else if (mode === "omettre") {
        await omettreDose(dose.id, motif.trim(), observations.trim() || undefined);
      } else {
        await refuserDose(dose.id, motif.trim());
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-3xl bg-surface-container-lowest p-6 shadow-xl space-y-4">
        <div>
          <h2 className="text-headline-sm font-display text-on-surface">{titre}</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">
            {dose.medication_name} · {dose.dose_quantite ?? ""} {dose.dose_unite ?? ""} · prévue {dose.heure}
          </p>
        </div>

        {mode === "administrer" && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-label-md font-medium text-on-surface-variant">Dose réelle (si différente)</label>
              <input type="number" step="any" min={0} value={doseReelle}
                onChange={(e) => setDoseReelle(e.target.value)}
                placeholder={`${dose.dose_quantite ?? ""} ${dose.dose_unite ?? ""}`}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md focus:outline-none focus:border-primary" />
              <span className="text-label-sm text-on-surface-variant">L&apos;heure réelle enregistrée est maintenant.</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-md font-medium text-on-surface-variant">Observations</label>
              <textarea rows={2} value={observations} onChange={(e) => setObservations(e.target.value)}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md resize-none focus:outline-none focus:border-primary" />
            </div>
          </>
        )}

        {motifRequis && (
          <div className="flex flex-col gap-1.5">
            <label className="text-label-md font-medium text-on-surface-variant">
              Motif <span className="text-error">*</span>
            </label>
            {mode === "omettre" && (
              <div className="flex flex-wrap gap-2">
                {MOTIFS_OMISSION.map((m) => (
                  <button key={m} type="button" onClick={() => setMotif(m)}
                    className={`rounded-full px-3 py-1.5 text-label-md transition-colors ${
                      motif === m ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                    }`}>
                    {m}
                  </button>
                ))}
              </div>
            )}
            <textarea rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} autoFocus
              placeholder={mode === "refuser" ? "Raison du refus…" : "Précisez le motif…"}
              className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md resize-none focus:outline-none focus:border-primary" />
          </div>
        )}

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={submit} disabled={saving || motifVide}
            className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-body-md font-semibold hover:bg-primary-container transition-colors disabled:opacity-40">
            {saving ? "Enregistrement…" : "Confirmer"}
          </button>
          <button type="button" onClick={onClose} disabled={saving}
            className="px-5 py-3 rounded-xl border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container transition-colors">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Carte d'une dose ───────────────────────────────────────────────────────────
function DoseCard({ dose, canAdminister, canManagePlan, onAction, onPlan }: {
  dose: DoseSurveillance;
  canAdminister: boolean;
  canManagePlan: boolean;
  onAction: (mode: "administrer" | "omettre" | "refuser") => void;
  onPlan: (planId: number, mode: "suspendre" | "reprendre" | "arreter") => void;
}) {
  const traitee = ["DONNEE", "OMISE", "REFUSEE"].includes(dose.status);
  const inactive = ["SUSPENDUE", "ANNULEE"].includes(dose.status);
  const statutTone =
    dose.status === "DONNEE" ? "text-secondary"
    : dose.status === "OMISE" || dose.status === "REFUSEE" ? "text-error"
    : dose.en_retard ? "text-error" : "text-on-surface-variant";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${
      dose.en_retard ? "border-error/50 bg-error-container/25"
      : inactive ? "border-outline-variant/60 bg-surface-container/40 opacity-70"
      : "border-outline-variant bg-surface-container-lowest"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body-lg font-semibold text-on-surface">
            {dose.medication_name}
          </p>
          <p className="text-body-sm text-on-surface-variant">
            {dose.dose_quantite != null ? `${dose.dose_quantite} ${dose.dose_unite ?? ""}` : ""}
            {dose.voie ? ` · ${dose.voie}` : ""}
          </p>
        </div>
        <span className={`shrink-0 text-label-md font-semibold ${statutTone}`}>
          {dose.en_retard && dose.status === "A_DONNER" ? "En retard" : STATUT_LABEL[dose.status]}
        </span>
      </div>

      {traitee && (
        <p className="text-label-md text-on-surface-variant mt-1.5">
          {dose.status === "DONNEE"
            ? `Donnée à ${heureFr(dose.administered_at)}${dose.dose_reelle != null ? ` · ${dose.dose_reelle} ${dose.dose_unite ?? ""}` : ""}`
            : `${STATUT_LABEL[dose.status]}${dose.motif ? ` — ${dose.motif}` : ""}`}
        </p>
      )}
      {inactive && dose.motif && (
        <p className="text-label-md text-on-surface-variant mt-1.5 italic">{dose.motif}</p>
      )}

      {canAdminister && dose.status === "A_DONNER" && (
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={() => onAction("administrer")}
            className="flex-1 py-2.5 rounded-xl bg-secondary text-on-secondary text-body-md font-semibold hover:opacity-90 transition-opacity">
            Administrer
          </button>
          <button type="button" onClick={() => onAction("omettre")}
            className="px-4 py-2.5 rounded-xl border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container transition-colors">
            Omettre
          </button>
          <button type="button" onClick={() => onAction("refuser")}
            className="px-4 py-2.5 rounded-xl border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container transition-colors">
            Refus
          </button>
        </div>
      )}

      {/* Gestion du traitement (acte médical) */}
      {canManagePlan && (dose.status === "A_DONNER" || dose.status === "SUSPENDUE") && (
        <div className="flex gap-3 mt-2 text-label-md">
          {dose.status === "SUSPENDUE" ? (
            <button type="button" onClick={() => onPlan(dose.plan_id, "reprendre")}
              className="text-tertiary hover:underline">Reprendre le traitement</button>
          ) : (
            <>
              <button type="button" onClick={() => onPlan(dose.plan_id, "suspendre")}
                className="text-on-surface-variant hover:text-tertiary hover:underline">Suspendre le traitement</button>
              <button type="button" onClick={() => onPlan(dose.plan_id, "arreter")}
                className="text-on-surface-variant hover:text-error hover:underline">Arrêter</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Modale d'action sur un plan (acte médical) ─────────────────────────────────
function PlanActionModal({ planId, mode, onClose, onDone }: {
  planId: number;
  mode: "suspendre" | "reprendre" | "arreter";
  onClose: () => void;
  onDone: () => void;
}) {
  const [motif, setMotif] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const motifRequis = mode !== "reprendre";
  const titre = mode === "suspendre" ? "Suspendre le traitement"
    : mode === "arreter" ? "Arrêter le traitement" : "Reprendre le traitement";

  async function submit() {
    if (motifRequis && !motif.trim()) return;
    setBusy(true); setError(null);
    try {
      if (mode === "suspendre") await suspendrePlan(planId, motif.trim());
      else if (mode === "arreter") await arreterPlan(planId, motif.trim());
      else await reprendrePlan(planId);
      onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Action impossible."); setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md rounded-3xl bg-surface-container-lowest p-6 shadow-xl space-y-4">
        <h2 className="text-headline-sm font-display text-on-surface">{titre}</h2>
        <p className="text-body-sm text-on-surface-variant">
          {mode === "reprendre"
            ? "Les doses futures suspendues repasseront « à donner »."
            : "Les doses à venir de ce traitement seront " + (mode === "arreter" ? "annulées." : "suspendues.")}
        </p>
        {motifRequis && (
          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Motif <span className="text-error">*</span></label>
            <textarea className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md resize-none focus:outline-none focus:border-primary"
              rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} autoFocus
              placeholder={mode === "suspendre" ? "Ex : à jeun avant chirurgie" : "Ex : traitement stoppé par le médecin"} />
          </div>
        )}
        {error && <p className="text-body-sm text-error">{error}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={submit} disabled={busy || (motifRequis && !motif.trim())}
            className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-body-md font-semibold hover:bg-primary-container transition-colors disabled:opacity-40">
            {busy ? "…" : "Confirmer"}
          </button>
          <button type="button" onClick={onClose} disabled={busy}
            className="px-5 py-3 rounded-xl border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container transition-colors">Annuler</button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">{children}</h2>;
}

export default function FeuilleSurveillancePage() {
  const params = useParams<{ sejourId: string }>();
  const sejourId = params.sejourId;
  const router = useRouter();
  const { can } = usePermissions();
  const canView = can("hosto.mar.view");
  const canAdminister = can("hosto.mar.administer");
  const canManagePlan = can("hosto.prescriptions.create");
  const canWriteObs = can("hosto.emr.write");

  const [feuille, setFeuille] = useState<FeuilleSurveillance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<{ dose: DoseSurveillance; mode: "administrer" | "omettre" | "refuser" } | null>(null);
  const [planAction, setPlanAction] = useState<{ planId: number; mode: "suspendre" | "reprendre" | "arreter" } | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((silent = false) => {
    if (!canView) return;
    if (!silent) setLoading(true);
    setError(null);
    getFeuilleSurveillance(sejourId)
      .then(setFeuille)
      .catch(() => setError("Impossible de charger la feuille de surveillance."))
      .finally(() => setLoading(false));
  }, [canView, sejourId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    function schedule() {
      pollRef.current = setTimeout(() => { load(true); schedule(); }, POLL_MS);
    }
    schedule();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, [load]);

  // Doses groupées par heure prévue, triées chronologiquement.
  const dosesParHeure = useMemo(() => {
    const groups = new Map<string, DoseSurveillance[]>();
    for (const d of feuille?.doses ?? []) {
      if (!groups.has(d.heure)) groups.set(d.heure, []);
      groups.get(d.heure)!.push(d);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [feuille]);

  if (!canView) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <LockOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Vous n&apos;avez pas accès à la surveillance.</p>
        </div>
      </DashboardShell>
    );
  }

  const h = feuille?.header;
  const al = feuille?.alertes;

  return (
    <DashboardShell>
      <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => router.push("/surveillance")}
            className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors">
            <ArrowBackOutlined style={{ fontSize: 16 }} /> Retour au service
          </button>
          {can("hosto.discharge.write") && (
            <button type="button" onClick={() => router.push(`/sejours/${sejourId}/compte-rendu`)}
              className="inline-flex items-center gap-1.5 text-body-sm text-primary hover:underline">
              <DescriptionOutlined style={{ fontSize: 16 }} /> Lettre de sortie
            </button>
          )}
        </div>

        {loading && !feuille ? (
          <div className="space-y-3" aria-busy>
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl bg-surface-container animate-pulse" />)}
          </div>
        ) : error ? (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        ) : feuille && h ? (
          <>
            {/* En-tête */}
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-4">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <h1 className="text-headline-md font-display text-on-surface">
                  {h.patient.nom} {h.patient.prenom}
                </h1>
                <span className="text-body-sm text-on-surface-variant">
                  {h.patient.sexe ?? ""}{h.patient.age != null ? ` · ${h.patient.age} ans` : ""} · {h.patient.dossier_number}
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant mt-1">
                {h.service_nom ?? ""}
                {h.chambre_numero ? ` · Ch. ${h.chambre_numero}` : ""}
                {h.lit_numero ? ` · Lit ${h.lit_numero}` : ""}
                {" · "}J+{h.jour_sejour}
              </p>
              {h.motif_admission && (
                <p className="text-body-sm text-on-surface-variant mt-0.5">Motif : {h.motif_admission}</p>
              )}
            </div>

            {/* Sécurité */}
            <AllergyBanner allergies={feuille.allergies_actives} />

            {/* Synthèse / alertes */}
            {al && (al.doses_en_retard > 0 || al.constantes_anormales.length > 0 || al.actes_en_attente_paiement > 0) && (
              <div className="rounded-2xl border border-tertiary/30 bg-tertiary/8 px-5 py-3 space-y-1">
                <SectionTitle>À surveiller</SectionTitle>
                <ul className="text-body-sm text-on-surface space-y-0.5 mt-1">
                  {al.doses_en_retard > 0 && (
                    <li className="flex items-center gap-2 text-error">
                      <WarningAmberOutlined style={{ fontSize: 16 }} /> {al.doses_en_retard} dose{al.doses_en_retard > 1 ? "s" : ""} en retard
                    </li>
                  )}
                  {al.constantes_anormales.length > 0 && (
                    <li className="flex items-center gap-2">
                      <ScheduleOutlined style={{ fontSize: 16 }} /> Constantes hors plage : {al.constantes_anormales.join(", ")}
                    </li>
                  )}
                  {al.actes_en_attente_paiement > 0 && (
                    <li className="flex items-center gap-2">
                      <BlockOutlined style={{ fontSize: 16 }} /> {al.actes_en_attente_paiement} acte{al.actes_en_attente_paiement > 1 ? "s" : ""} en attente de paiement
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* a) Doses à administrer */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <SectionTitle>Doses à administrer</SectionTitle>
                {!canAdminister && (
                  <span className="text-label-sm text-on-surface-variant">(consultation seule)</span>
                )}
              </div>
              {dosesParHeure.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">Aucune dose planifiée aujourd&apos;hui.</p>
              ) : (
                dosesParHeure.map(([heure, doses]) => (
                  <div key={heure} className="space-y-2">
                    <div className="flex items-center gap-2 text-body-md font-semibold text-on-surface">
                      <ScheduleOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" /> {heure}
                    </div>
                    <div className="space-y-2 pl-1">
                      {doses.map((d) => (
                        <DoseCard key={d.id} dose={d} canAdminister={canAdminister}
                          canManagePlan={canManagePlan}
                          onAction={(mode) => setAction({ dose: d, mode })}
                          onPlan={(planId, mode) => setPlanAction({ planId, mode })} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </section>

            {/* b) Soins et actes */}
            <section className="space-y-3">
              <SectionTitle>Soins et actes</SectionTitle>
              <ActesPanel patientId={h.patient.id} sejourId={h.sejour_id} onMutation={() => load(true)} />
            </section>

            {/* c) Constantes */}
            <section className="space-y-3">
              <SectionTitle>Constantes</SectionTitle>
              <VitalsTab patientId={h.patient.id} canWrite={canWriteObs} onMutation={() => load(true)} />
            </section>
          </>
        ) : null}
      </div>

      {planAction && (
        <PlanActionModal
          planId={planAction.planId}
          mode={planAction.mode}
          onClose={() => setPlanAction(null)}
          onDone={() => { setPlanAction(null); load(true); }}
        />
      )}
      {action && (
        <DoseActionModal
          dose={action.dose}
          mode={action.mode}
          onClose={() => setAction(null)}
          onDone={() => { setAction(null); load(true); }}
        />
      )}
    </DashboardShell>
  );
}
