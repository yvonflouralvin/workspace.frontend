"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import {
  ArrowBackOutlined,
  LockOutlined,
  PrintOutlined,
  CheckCircleOutlined,
  DescriptionOutlined,
  AddOutlined,
} from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getCompteRendu,
  creerCompteRendu,
  updateCompteRendu,
  signerCompteRendu,
  amenderCompteRendu,
  downloadCompteRenduPdf,
  type CompteRendu,
  type CompteRenduUpdate,
} from "@/app/lib/compte-rendu-api";
import { ApiError } from "@/app/lib/api";

const FIELDS: { key: keyof CompteRenduUpdate; label: string; rows: number; textarea: boolean }[] = [
  { key: "motif_hospitalisation", label: "Motif d'hospitalisation", rows: 2, textarea: true },
  { key: "antecedents_pertinents", label: "Antécédents pertinents", rows: 2, textarea: true },
  { key: "evolution_sejour", label: "Évolution durant le séjour", rows: 4, textarea: true },
  { key: "examens_realises", label: "Examens réalisés", rows: 3, textarea: true },
  { key: "conclusion", label: "Conclusion / diagnostic de sortie", rows: 3, textarea: true },
  { key: "traitement_sortie", label: "Traitement de sortie", rows: 3, textarea: true },
  { key: "conduite_a_tenir", label: "Conduite à tenir", rows: 3, textarea: true },
];

function frDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";

export default function CompteRenduPage() {
  const params = useParams<{ id: string }>();
  const sejourId = params.id;
  const router = useRouter();
  const { can } = usePermissions();
  const canView = can("hosto.admissions.view");
  const canWrite = can("hosto.discharge.write");
  const canSign = can("hosto.discharge.sign");

  const [cr, setCr] = useState<CompteRendu | null>(null);
  const [form, setForm] = useState<CompteRenduUpdate>({});
  const [loading, setLoading] = useState(true);
  const [absent, setAbsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [addendum, setAddendum] = useState("");
  const savedRef = useRef(false);

  const applyCr = useCallback((data: CompteRendu) => {
    setCr(data);
    setForm({
      motif_hospitalisation: data.motif_hospitalisation ?? "",
      antecedents_pertinents: data.antecedents_pertinents ?? "",
      evolution_sejour: data.evolution_sejour ?? "",
      examens_realises: data.examens_realises ?? "",
      conclusion: data.conclusion ?? "",
      traitement_sortie: data.traitement_sortie ?? "",
      conduite_a_tenir: data.conduite_a_tenir ?? "",
      destinataire: data.destinataire ?? "",
    });
  }, []);

  const load = useCallback(() => {
    if (!canView) return;
    setLoading(true);
    getCompteRendu(sejourId)
      .then((data) => { applyCr(data); setAbsent(false); })
      .catch((e) => { if (e instanceof ApiError && e.status === 404) setAbsent(true); else setError("Impossible de charger le compte rendu."); })
      .finally(() => setLoading(false));
  }, [canView, sejourId, applyCr]);

  useEffect(() => { load(); }, [load]);

  async function creer() {
    setSaving(true); setError(null);
    try { applyCr(await creerCompteRendu(sejourId)); setAbsent(false); }
    catch (e) { setError(e instanceof Error ? e.message : "Création impossible."); }
    finally { setSaving(false); }
  }

  async function save() {
    if (!cr) return;
    setSaving(true); setError(null);
    try { applyCr(await updateCompteRendu(cr.id, form)); savedRef.current = true; setTimeout(() => (savedRef.current = false), 2000); }
    catch (e) { setError(e instanceof Error ? e.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  }

  async function doSign() {
    if (!cr) return;
    setSigning(true); setError(null);
    try {
      await updateCompteRendu(cr.id, form); // sauver avant de figer
      applyCr(await signerCompteRendu(cr.id));
      setSignOpen(false);
    } catch (e) { setError(e instanceof Error ? e.message : "Signature impossible."); }
    finally { setSigning(false); }
  }

  async function pdf() {
    if (!cr) return;
    setPdfLoading(true); setError(null);
    try { await downloadCompteRenduPdf(cr.id); }
    catch { setError("Impossible de générer la lettre de sortie."); }
    finally { setPdfLoading(false); }
  }

  async function ajouterAddendum() {
    if (!cr || !addendum.trim()) return;
    setSaving(true);
    try { applyCr(await amenderCompteRendu(cr.id, addendum.trim())); setAddendum(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Addendum impossible."); }
    finally { setSaving(false); }
  }

  function insert(field: keyof CompteRenduUpdate, text: string) {
    setForm((f) => ({ ...f, [field]: [(f[field] ?? "") as string, text].filter(Boolean).join("\n") }));
  }

  if (!canView) {
    return (
      <DashboardShell>
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <LockOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Accès non autorisé.</p>
        </div>
      </DashboardShell>
    );
  }

  const signed = cr?.signed ?? false;
  const d = cr?.donnees_sejour;

  return (
    <DashboardShell>
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-5">
        <button type="button" onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors">
          <ArrowBackOutlined style={{ fontSize: 16 }} /> Retour
        </button>

        <div className="flex items-center gap-3">
          <DescriptionOutlined className="text-primary" style={{ fontSize: 26 }} />
          <div className="flex-1">
            <h1 className="text-headline-md font-display text-on-surface">Lettre de sortie</h1>
            <p className="text-body-sm text-on-surface-variant">Compte rendu d&apos;hospitalisation</p>
          </div>
          {signed && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/12 px-3 py-1.5 text-label-md font-semibold text-secondary">
              <CheckCircleOutlined style={{ fontSize: 16 }} /> Signé <LockOutlined style={{ fontSize: 14 }} />
            </span>
          )}
        </div>

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3" role="alert">{error}</p>}

        {loading ? (
          <div className="space-y-3" aria-busy>{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-surface-container animate-pulse" />)}</div>
        ) : absent ? (
          <div className="rounded-2xl border border-dashed border-outline-variant px-6 py-16 text-center space-y-3">
            <p className="text-body-md text-on-surface-variant">Aucun compte rendu pour ce séjour.</p>
            {canWrite && (
              <button type="button" onClick={creer} disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50">
                <AddOutlined style={{ fontSize: 18 }} /> Rédiger la lettre de sortie
              </button>
            )}
          </div>
        ) : cr ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Formulaire rédigé */}
            <div className="space-y-4 order-2 lg:order-1">
              <div className="flex flex-col gap-1">
                <label className="text-label-md font-medium text-on-surface-variant">Destinataire (médecin traitant)</label>
                <input className={inputCls} value={(form.destinataire ?? "") as string} disabled={signed}
                  onChange={(e) => setForm((f) => ({ ...f, destinataire: e.target.value }))}
                  placeholder="Dr…" />
              </div>
              {FIELDS.map((fld) => (
                <div key={fld.key} className="flex flex-col gap-1">
                  <label className="text-label-md font-medium text-on-surface-variant">{fld.label}</label>
                  <textarea className={`${inputCls} resize-y`} rows={fld.rows} disabled={signed}
                    value={(form[fld.key] ?? "") as string}
                    onChange={(e) => setForm((f) => ({ ...f, [fld.key]: e.target.value }))} />
                </div>
              ))}

              {/* Addendums */}
              {signed && (
                <div className="space-y-2 pt-2">
                  <p className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Addendums</p>
                  {(cr.addendums ?? []).map((a) => (
                    <div key={a.id} className="rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5">
                      <p className="text-body-sm text-on-surface whitespace-pre-wrap">{a.texte}</p>
                      <p className="text-label-sm text-on-surface-variant mt-1">{frDate(a.created_at)}</p>
                    </div>
                  ))}
                  {canWrite && (
                    <div className="flex gap-2">
                      <input className={inputCls} value={addendum} onChange={(e) => setAddendum(e.target.value)}
                        placeholder="Ajouter un addendum (correction, complément)…" />
                      <button type="button" onClick={ajouterAddendum} disabled={!addendum.trim() || saving}
                        className="px-4 rounded-xl border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40">
                        Ajouter
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              {!signed && canWrite && (
                <div className="flex gap-3 pt-2 sticky bottom-4">
                  <button type="button" onClick={save} disabled={saving}
                    className="px-5 py-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50">
                    {saving ? "Enregistrement…" : savedRef.current ? "Enregistré ✓" : "Enregistrer le brouillon"}
                  </button>
                  {canSign && (
                    <button type="button" onClick={() => setSignOpen(true)}
                      className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-body-md font-semibold hover:bg-primary-container transition-colors">
                      Signer la lettre de sortie
                    </button>
                  )}
                </div>
              )}
              {signed && (
                <button type="button" onClick={pdf} disabled={pdfLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-secondary text-on-secondary text-body-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                  <PrintOutlined style={{ fontSize: 18 }} />
                  {pdfLoading ? "Génération…" : "Imprimer / Télécharger la lettre de sortie"}
                </button>
              )}
            </div>

            {/* Panneau contexte (données objectives du séjour) */}
            <aside className="order-1 lg:order-2 space-y-4 lg:sticky lg:top-6 self-start">
              <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 space-y-2">
                <p className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">Séjour</p>
                <div className="text-body-sm text-on-surface-variant space-y-0.5">
                  <p>Admission : {frDate(d?.admitted_at ?? null)}</p>
                  <p>Sortie : {frDate(d?.discharged_at ?? null)} ({d?.duree_jours ?? "—"} j)</p>
                  <p>Service : {d?.services?.join(" · ") || "—"}</p>
                  <p>Type de sortie : {d?.discharge_type_label || "—"}</p>
                </div>
              </div>

              <ContextBlock title="Diagnostics" empty={!d?.diagnostics?.length}
                onInsert={!signed && canWrite && d?.diagnostics?.length ? () => insert("conclusion", d.diagnostics.map((x) => `${x.code ? x.code + " — " : ""}${x.label}`).join("\n")) : undefined}>
                {d?.diagnostics?.map((x, i) => <li key={i}>{x.code ? <span className="font-mono">{x.code}</span> : null} {x.label}</li>)}
              </ContextBlock>

              <ContextBlock title="Actes réalisés" empty={!d?.actes_realises?.length}
                onInsert={!signed && canWrite && d?.actes_realises?.length ? () => insert("examens_realises", d.actes_realises.map((x) => `${x.date} — ${x.libelle}`).join("\n")) : undefined}>
                {d?.actes_realises?.map((x, i) => <li key={i}>{x.date} — {x.libelle}</li>)}
              </ContextBlock>

              <ContextBlock title="Traitement (prescriptions du séjour)" empty={!d?.traitement_sortie?.length}
                onInsert={!signed && canWrite && d?.traitement_sortie?.length ? () => insert("traitement_sortie", d.traitement_sortie.map((x) => `${x.name} — ${x.dosage}, ${x.frequency}${x.duration ? ", " + x.duration : ""}`).join("\n")) : undefined}>
                {d?.traitement_sortie?.map((x, i) => <li key={i}>{x.name} — {x.dosage}, {x.frequency}</li>)}
              </ContextBlock>

              <ContextBlock title="Résultats de labo anormaux" empty={!d?.labo_marquants?.length}>
                {d?.labo_marquants?.map((x, i) => <li key={i} className="text-error">{x.parametre} : {x.valeur} ({x.interpretation})</li>)}
              </ContextBlock>
            </aside>
          </div>
        ) : null}
      </div>

      {signOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
          <div className="w-full max-w-[28rem] rounded-3xl bg-surface-container-lowest p-6 shadow-xl space-y-4">
            <h2 className="text-headline-sm font-display text-on-surface">Signer la lettre de sortie</h2>
            <p className="text-body-sm text-on-surface-variant">
              Une fois signé, le compte rendu ne pourra plus être modifié — les données du séjour
              seront figées. Une correction nécessitera un addendum.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={doSign} disabled={signing}
                className="flex-1 py-3 rounded-xl bg-primary text-on-primary text-body-md font-semibold hover:bg-primary-container transition-colors disabled:opacity-50">
                {signing ? "Signature…" : "Confirmer la signature"}
              </button>
              <button type="button" onClick={() => setSignOpen(false)} disabled={signing}
                className="px-5 py-3 rounded-xl border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

function ContextBlock({ title, empty, onInsert, children }: {
  title: string; empty: boolean; onInsert?: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-label-md font-semibold uppercase tracking-wide text-on-surface-variant">{title}</p>
        {onInsert && (
          <button type="button" onClick={onInsert} className="text-label-sm text-primary hover:underline">Insérer</button>
        )}
      </div>
      {empty ? (
        <p className="text-body-sm text-on-surface-variant/70">—</p>
      ) : (
        <ul className="text-body-sm text-on-surface space-y-1 list-none">{children}</ul>
      )}
    </div>
  );
}
