"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { RightDrawer } from "@repo/ui/RightDrawer";
import {
  getExamen,
  updateExamen,
  addParametre,
  deleteParametre,
  addValeur,
  deleteValeur,
  type ExamenDetail,
  type ParametreExamen,
  type ValeurReference,
} from "@/app/lib/examens-api";
import {
  ArrowBackOutlined,
  LockOutlined,
  EditOutlined,
  AddOutlined,
  DeleteOutlineOutlined,
} from "@mui/icons-material";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";

function sexLabel(s: string): string {
  return s === "MASCULIN" ? "Homme" : s === "FEMININ" ? "Femme" : "";
}
function ageLabel(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min}–${max} ans`;
  if (min != null) return `≥ ${min} ans`;
  if (max != null) return `≤ ${max} ans`;
  return "";
}
function valueLabel(r: ValeurReference, unit: string | null): string {
  if (r.text_normal) return r.text_normal;
  const u = unit ? ` ${unit}` : "";
  if (r.low != null && r.high != null) return `${r.low} – ${r.high}${u}`;
  if (r.low != null) return `≥ ${r.low}${u}`;
  if (r.high != null) return `≤ ${r.high}${u}`;
  return "—";
}

function RangeLine({ r, unit, onDelete }: { r: ValeurReference; unit: string | null; onDelete?: () => void }) {
  const cond = [sexLabel(r.sex), ageLabel(r.age_min_years, r.age_max_years)].filter(Boolean).join(" · ");
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="text-body-sm text-on-surface font-medium tabular-nums">{valueLabel(r, unit)}</span>
      {cond && <span className="text-body-sm text-on-surface-variant">{cond}</span>}
      {r.note && <span className="text-label-sm text-on-surface-variant/70 italic">{r.note}</span>}
      {onDelete && (
        <button
          onClick={onDelete}
          title="Supprimer"
          className="ml-auto p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
        >
          <DeleteOutlineOutlined style={{ fontSize: 16 }} />
        </button>
      )}
    </div>
  );
}

export default function ExamenDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { can } = usePermissions();
  const canManage = can("hosto.settings.manage");

  const [examen, setExamen] = useState<ExamenDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [addingParam, setAddingParam] = useState(false);
  const [addValueFor, setAddValueFor] = useState<ParametreExamen | null>(null);

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    getExamen(Number(id))
      .then(setExamen)
      .catch(() => setError("Examen introuvable."))
      .finally(() => setLoading(false));
  }, [id, canManage]);

  function reload() {
    getExamen(Number(id)).then(setExamen).catch(() => {});
  }

  async function onDeleteValue(rangeId: number) {
    if (!confirm("Supprimer cette valeur de référence ?")) return;
    try { await deleteValeur(rangeId); reload(); } catch { setError("Suppression impossible."); }
  }

  async function onDeleteParam(paramId: number) {
    if (!confirm("Supprimer ce paramètre ?")) return;
    try { setExamen(await deleteParametre(paramId)); } catch { setError("Suppression impossible."); }
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-3xl mx-auto space-y-6">
        <Link
          href="/parametres/prestations/examens-medicaux"
          className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} /> Retour aux examens
        </Link>

        {!canManage && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint.
          </p>
        )}
        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}
        {canManage && loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {canManage && !loading && examen && (
          <>
            {/* Entête */}
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-headline-md font-display text-on-surface">{examen.name}</h1>
                    {examen.is_loinc ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm font-medium bg-surface-container-high text-on-surface-variant">
                        <LockOutlined style={{ fontSize: 12 }} /> LOINC
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium bg-tertiary/10 text-tertiary">
                        Personnalisé
                      </span>
                    )}
                  </div>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    {[examen.loinc_code && `LOINC ${examen.loinc_code}`, examen.category, examen.specimen]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
                {examen.editable && (
                  <button
                    onClick={() => setEditing(true)}
                    title="Modifier"
                    className="inline-flex items-center p-2 rounded-xl border border-outline-variant text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors shrink-0"
                  >
                    <EditOutlined style={{ fontSize: 18 }} />
                  </button>
                )}
              </div>
              {examen.is_loinc && (
                <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-2 inline-flex items-center gap-1.5">
                  <LockOutlined style={{ fontSize: 16 }} />
                  Examen LOINC — non modifiable. Vous pouvez définir vos propres valeurs de référence ci-dessous.
                </p>
              )}
            </div>

            {/* Paramètres */}
            <div className="flex items-center justify-between">
              <h2 className="text-headline-sm font-display text-on-surface">Paramètres &amp; valeurs de référence</h2>
              {examen.editable && (
                <button
                  onClick={() => setAddingParam(true)}
                  className="inline-flex items-center gap-1.5 text-body-sm text-primary hover:underline"
                >
                  <AddOutlined style={{ fontSize: 18 }} /> Ajouter un paramètre
                </button>
              )}
            </div>

            {examen.parametres.length === 0 && (
              <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-6 text-center">
                Aucun paramètre.
              </p>
            )}

            <div className="space-y-4">
              {examen.parametres.map((p) => (
                <div key={p.id} className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-body-md font-medium text-on-surface">{p.name}</p>
                      <p className="text-label-sm text-on-surface-variant">
                        {[p.unit, p.value_type !== "NUMERIC" ? p.value_type : null, p.loinc_code && `LOINC ${p.loinc_code}`]
                          .filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    {examen.editable && (
                      <button
                        onClick={() => onDeleteParam(p.id)}
                        title="Supprimer le paramètre"
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
                      >
                        <DeleteOutlineOutlined style={{ fontSize: 18 }} />
                      </button>
                    )}
                  </div>

                  {/* Références LOINC */}
                  {p.ranges_loinc.length > 0 && (
                    <div className="rounded-xl bg-surface-container px-4 py-2">
                      <p className="text-label-md font-medium text-on-surface-variant mb-1 flex items-center gap-1">
                        <LockOutlined style={{ fontSize: 13 }} /> Références LOINC
                      </p>
                      <div className="divide-y divide-outline-variant/50">
                        {p.ranges_loinc.map((r) => <RangeLine key={r.id} r={r} unit={p.unit} />)}
                      </div>
                    </div>
                  )}

                  {/* Valeurs du workspace */}
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-label-md font-medium text-on-surface-variant">Vos valeurs de référence</p>
                      <button
                        onClick={() => setAddValueFor(p)}
                        className="inline-flex items-center gap-1 text-label-md text-primary hover:underline"
                      >
                        <AddOutlined style={{ fontSize: 16 }} /> Ajouter
                      </button>
                    </div>
                    {p.ranges_workspace.length === 0 ? (
                      <p className="text-body-sm text-on-surface-variant/70 mt-1">
                        Aucune valeur propre — les références LOINC s&apos;appliquent.
                      </p>
                    ) : (
                      <div className="divide-y divide-outline-variant/50 mt-1">
                        {p.ranges_workspace.map((r) => (
                          <RangeLine key={r.id} r={r} unit={p.unit} onDelete={() => onDeleteValue(r.id)} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {editing && examen && (
        <EditExamenDrawer examen={examen} onClose={() => setEditing(false)} onSaved={setExamen} />
      )}
      {addingParam && examen && (
        <AddParamDrawer examenId={examen.id} onClose={() => setAddingParam(false)} onAdded={setExamen} />
      )}
      {addValueFor && (
        <AddValeurDrawer
          param={addValueFor}
          onClose={() => setAddValueFor(null)}
          onAdded={() => { setAddValueFor(null); reload(); }}
        />
      )}
    </DashboardShell>
  );
}

function EditExamenDrawer({ examen, onClose, onSaved }: { examen: ExamenDetail; onClose: () => void; onSaved: (e: ExamenDetail) => void }) {
  const [name, setName] = useState(examen.name);
  const [category, setCategory] = useState(examen.category ?? "");
  const [specimen, setSpecimen] = useState(examen.specimen ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true); setError(null);
    try {
      onSaved(await updateExamen(examen.id, { name: name.trim(), category: category.trim() || null, specimen: specimen.trim() || null }));
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur."); setSubmitting(false); }
  }

  return (
    <RightDrawer title="Modifier l'examen" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}
        <div><label className={labelCls}>Nom *</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus required /></div>
        <div><label className={labelCls}>Catégorie</label><input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} /></div>
        <div><label className={labelCls}>Prélèvement</label><input className={inputCls} value={specimen} onChange={(e) => setSpecimen(e.target.value)} /></div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-body-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors">Annuler</button>
          <button type="submit" disabled={submitting || !name.trim()} className="px-4 py-2 rounded-xl text-body-md font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50">{submitting ? "…" : "Enregistrer"}</button>
        </div>
      </form>
    </RightDrawer>
  );
}

function AddParamDrawer({ examenId, onClose, onAdded }: { examenId: number; onClose: () => void; onAdded: (e: ExamenDetail) => void }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [valueType, setValueType] = useState("NUMERIC");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true); setError(null);
    try {
      onAdded(await addParametre(examenId, { name: name.trim(), unit: unit.trim() || null, value_type: valueType }));
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur."); setSubmitting(false); }
  }

  return (
    <RightDrawer title="Ajouter un paramètre" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}
        <div><label className={labelCls}>Nom du paramètre *</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus required /></div>
        <div><label className={labelCls}>Unité</label><input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="g/dL, mg/L…" /></div>
        <div>
          <label className={labelCls}>Type de valeur</label>
          <select className={inputCls} value={valueType} onChange={(e) => setValueType(e.target.value)}>
            <option value="NUMERIC">Numérique</option>
            <option value="TEXT">Texte</option>
            <option value="QUALITATIVE">Qualitatif</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-body-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors">Annuler</button>
          <button type="submit" disabled={submitting || !name.trim()} className="px-4 py-2 rounded-xl text-body-md font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50">{submitting ? "…" : "Ajouter"}</button>
        </div>
      </form>
    </RightDrawer>
  );
}

function AddValeurDrawer({ param, onClose, onAdded }: { param: ParametreExamen; onClose: () => void; onAdded: () => void }) {
  const [sex, setSex] = useState("TOUS");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [low, setLow] = useState("");
  const [high, setHigh] = useState("");
  const [textNormal, setTextNormal] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const numeric = param.value_type === "NUMERIC";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      await addValeur(param.id, {
        sex,
        age_min_years: ageMin.trim() ? Number(ageMin) : null,
        age_max_years: ageMax.trim() ? Number(ageMax) : null,
        low: numeric && low.trim() ? Number(low) : null,
        high: numeric && high.trim() ? Number(high) : null,
        text_normal: textNormal.trim() || null,
        note: note.trim() || null,
      });
      onAdded();
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur."); setSubmitting(false); }
  }

  return (
    <RightDrawer title={`Valeur de référence — ${param.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className={labelCls}>Sexe</label>
          <select className={inputCls} value={sex} onChange={(e) => setSex(e.target.value)}>
            <option value="TOUS">Tous</option>
            <option value="MASCULIN">Homme</option>
            <option value="FEMININ">Femme</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Âge min (ans)</label><input className={inputCls} type="number" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} /></div>
          <div><label className={labelCls}>Âge max (ans)</label><input className={inputCls} type="number" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} /></div>
        </div>
        {numeric ? (
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Valeur basse{param.unit ? ` (${param.unit})` : ""}</label><input className={inputCls} type="number" step="any" value={low} onChange={(e) => setLow(e.target.value)} /></div>
            <div><label className={labelCls}>Valeur haute{param.unit ? ` (${param.unit})` : ""}</label><input className={inputCls} type="number" step="any" value={high} onChange={(e) => setHigh(e.target.value)} /></div>
          </div>
        ) : (
          <div><label className={labelCls}>Valeur normale (texte)</label><input className={inputCls} value={textNormal} onChange={(e) => setTextNormal(e.target.value)} placeholder="Négatif, Absent…" /></div>
        )}
        <div><label className={labelCls}>Note</label><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-body-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors">Annuler</button>
          <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl text-body-md font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50">{submitting ? "…" : "Ajouter"}</button>
        </div>
      </form>
    </RightDrawer>
  );
}
