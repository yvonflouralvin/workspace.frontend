"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getParametre,
  updateParametre,
  getAccessCoverage,
  setEnforcementMode,
  type CoverageReport,
  type EnforcementMode,
} from "@/app/lib/api";
import {
  ArrowBackOutlined,
  ShieldOutlined,
  RefreshOutlined,
  WarningAmberOutlined,
  CheckCircleOutlined,
  GroupOutlined,
} from "@mui/icons-material";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";
const cardCls = "rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-4";

export default function AccessControlSettingsPage() {
  const { can } = usePermissions();
  const canManage = can("hosto.settings.manage");

  const [mode, setMode] = useState<EnforcementMode>("SHADOW");
  const [minCoverage, setMinCoverage] = useState(95);
  const [minCoverageInput, setMinCoverageInput] = useState("95");
  const [coverage, setCoverage] = useState<CoverageReport | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  const [savingThreshold, setSavingThreshold] = useState(false);
  const [thresholdSaved, setThresholdSaved] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const loadCoverage = useCallback(async () => {
    const cov = await getAccessCoverage();
    setCoverage(cov);
  }, []);

  useEffect(() => {
    if (!canManage) {
      setLoading(false);
      return;
    }
    Promise.all([
      getParametre<{ mode?: EnforcementMode }>("patient_access_enforcement"),
      getParametre<{ min_coverage?: number }>("patient_access_enforcement_min_coverage"),
      loadCoverage(),
    ])
      .then(([enf, cov]) => {
        setMode(enf.valeur?.mode === "ENFORCE" ? "ENFORCE" : "SHADOW");
        const mc = cov.valeur?.min_coverage ?? 95;
        setMinCoverage(mc);
        setMinCoverageInput(String(mc));
      })
      .catch(() => setError("Impossible de charger la configuration du contrôle d'accès."))
      .finally(() => setLoading(false));
  }, [canManage, loadCoverage]);

  async function refresh() {
    setRefreshing(true);
    try {
      await loadCoverage();
    } catch {
      /* best-effort — l'affichage courant reste */
    } finally {
      setRefreshing(false);
    }
  }

  async function changeMode(next: EnforcementMode) {
    if (next === mode || switching) return;
    setSwitching(true);
    setSwitchError(null);
    try {
      await setEnforcementMode(next);
      setMode(next);
    } catch (err) {
      // Refus dur du garde-fou (422 avec les noms) ou toute autre erreur.
      setSwitchError(err instanceof Error ? err.message : "Erreur lors de la bascule.");
    } finally {
      setSwitching(false);
    }
  }

  async function saveThreshold(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(minCoverageInput);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      setError("Le seuil doit être un nombre entre 0 et 100.");
      return;
    }
    setSavingThreshold(true);
    setThresholdSaved(false);
    setError(null);
    try {
      await updateParametre("patient_access_enforcement_min_coverage", {
        min_coverage: Math.round(parsed),
      });
      setMinCoverage(Math.round(parsed));
      setThresholdSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement du seuil.");
    } finally {
      setSavingThreshold(false);
    }
  }

  const meetsThreshold = coverage ? coverage.rate >= minCoverage : false;

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <Link
          href="/parametres"
          className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} /> Retour aux paramètres
        </Link>

        <div>
          <h1 className="text-headline-md font-display text-on-surface">
            Contrôle d&apos;accès aux dossiers
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-1">
            Restreint l&apos;accès aux dossiers patients à la relation de soin. En observation, tout
            est tracé sans rien bloquer&nbsp;; en blocage, un accès sans relation de soin est refusé.
          </p>
        </div>

        {!canManage && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de gérer les paramètres.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}
        {canManage && loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {canManage && !loading && !error && (
          <>
            {/* Diagnostic de couverture staff↔service */}
            <section className={cardCls}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-body-lg font-medium text-on-surface flex items-center gap-2">
                    <GroupOutlined style={{ fontSize: 20 }} className="text-on-surface-variant" />
                    Couverture staff↔service
                  </h2>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    Le blocage repose sur le rattachement des soignants à un service. Sous le seuil,
                    la bascule en blocage est refusée.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50 shrink-0"
                >
                  <RefreshOutlined style={{ fontSize: 18 }} /> {refreshing ? "…" : "Rafraîchir"}
                </button>
              </div>

              {coverage && (
                <>
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`text-headline-lg font-display ${meetsThreshold ? "text-secondary" : "text-error"}`}
                    >
                      {coverage.rate}%
                    </span>
                    <span className="text-body-sm text-on-surface-variant">
                      {coverage.assigned} / {coverage.total} soignant(s) actif(s) rattaché(s)
                      {" · seuil "}
                      {minCoverage}%
                    </span>
                  </div>

                  {coverage.unassigned > 0 ? (
                    <div className="rounded-xl bg-surface-container px-4 py-3 space-y-2">
                      <p className="text-body-sm text-on-surface flex items-center gap-1.5">
                        <WarningAmberOutlined style={{ fontSize: 18 }} className="text-error" />
                        {coverage.unassigned} soignant(s) actif(s) sans service&nbsp;:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {coverage.unassigned_staff.map((s) => (
                          <span
                            key={s.id}
                            className="text-label-md text-on-surface bg-surface-container-lowest border border-outline-variant rounded-full px-2.5 py-1"
                          >
                            {s.nom}
                          </span>
                        ))}
                      </div>
                      <Link
                        href="/staff"
                        className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
                      >
                        Affecter dans Personnel →
                      </Link>
                    </div>
                  ) : (
                    <p className="text-body-sm text-secondary flex items-center gap-1.5">
                      <CheckCircleOutlined style={{ fontSize: 18 }} />
                      Tous les soignants actifs concernés sont rattachés à un service.
                    </p>
                  )}
                </>
              )}
            </section>

            {/* Mode d'application */}
            <section className={cardCls}>
              <div>
                <h2 className="text-body-lg font-medium text-on-surface flex items-center gap-2">
                  <ShieldOutlined style={{ fontSize: 20 }} className="text-on-surface-variant" />
                  Mode d&apos;application
                </h2>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  <span className="font-medium">Observation</span> trace les accès sans rien bloquer
                  (recommandé). <span className="font-medium">Blocage</span> refuse tout accès sans
                  relation de soin établie.
                </p>
              </div>

              <div className="inline-flex rounded-xl border border-outline-variant overflow-hidden">
                <button
                  type="button"
                  onClick={() => changeMode("SHADOW")}
                  disabled={switching}
                  className={`px-4 py-2 text-body-md transition-colors disabled:opacity-50 ${
                    mode === "SHADOW"
                      ? "bg-primary text-on-primary font-medium"
                      : "bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                  }`}
                >
                  Observation
                </button>
                <button
                  type="button"
                  onClick={() => changeMode("ENFORCE")}
                  disabled={switching}
                  className={`px-4 py-2 text-body-md transition-colors disabled:opacity-50 border-l border-outline-variant ${
                    mode === "ENFORCE"
                      ? "bg-error text-on-primary font-medium"
                      : "bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                  }`}
                >
                  Blocage
                </button>
              </div>

              {switchError && (
                <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3 whitespace-pre-line">
                  {switchError}
                </p>
              )}

              {mode === "ENFORCE" && !switchError && (
                <p className="text-body-sm text-on-surface bg-error-container/30 rounded-xl px-4 py-3 flex items-start gap-2">
                  <WarningAmberOutlined style={{ fontSize: 18 }} className="text-error mt-0.5 shrink-0" />
                  <span>
                    Le blocage est actif&nbsp;: un accès sans relation de soin renvoie une erreur.
                    Tant que le break-glass (accès d&apos;urgence tracé) n&apos;est pas en place, un
                    refus n&apos;a pas d&apos;issue — à réserver à un environnement de test.
                  </span>
                </p>
              )}
            </section>

            {/* Seuil de couverture */}
            <section className={cardCls}>
              <div>
                <h2 className="text-body-lg font-medium text-on-surface">Seuil de couverture</h2>
                <p className="text-body-sm text-on-surface-variant mt-1">
                  Taux minimal de soignants rattachés à un service requis pour autoriser le passage en
                  blocage. Défaut 95&nbsp;%.
                </p>
              </div>
              <form onSubmit={saveThreshold} className="flex items-end gap-3">
                <div className="w-32">
                  <label className={labelCls}>Seuil (%)</label>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={100}
                    value={minCoverageInput}
                    onChange={(e) => {
                      setMinCoverageInput(e.target.value);
                      setThresholdSaved(false);
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingThreshold}
                  className="inline-flex items-center bg-primary text-on-primary text-body-md font-medium px-5 py-2 rounded-xl hover:bg-primary-container transition-colors disabled:opacity-50"
                >
                  {savingThreshold ? "Enregistrement…" : "Enregistrer"}
                </button>
                {thresholdSaved && <span className="text-body-sm text-secondary pb-2">Seuil enregistré.</span>}
              </form>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
