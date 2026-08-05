"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { LogoutOutlined, SwapHorizOutlined, CancelOutlined, WarningAmberOutlined } from "@mui/icons-material";
import {
  sortirSejour,
  transfererSejour,
  annulerSejour,
  type DischargeType,
} from "@/app/lib/sejours-api";
import { getLitsLibres, type LitLibre } from "@/app/lib/occupation-api";

const DISCHARGE_OPTIONS: { value: DischargeType; label: string; grave?: boolean }[] = [
  { value: "DOMICILE", label: "Retour à domicile" },
  { value: "TRANSFERT_EXTERNE", label: "Transfert externe" },
  { value: "CONTRE_AVIS_MEDICAL", label: "Sortie contre avis médical", grave: true },
  { value: "DECES", label: "Décès", grave: true },
  { value: "AUTRE", label: "Autre" },
];

const btn = "w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-body-md font-medium transition-colors";
const field = "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-body-md text-on-surface focus:outline-none focus:border-primary";

// Porté dans document.body : le RightDrawer parent applique un `transform` (animation
// de slide), qui capturerait un enfant `position: fixed` et confinerait la modale à la
// largeur du drawer (~480px) au lieu du viewport. Le portal ré-ancre au viewport réel.
function Modal({ title, children }: { title: string; children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal>
      <div className="w-full max-w-[36rem] rounded-3xl bg-surface-container-lowest p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-headline-sm font-display text-on-surface">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function SejourActions({ sejourId, serviceId, onDone }: {
  sejourId: number;
  serviceId?: number;
  onDone: () => void;
}) {
  const { can } = usePermissions();
  const canManage = can("hosto.admissions.manage");
  const canWriteCR = can("hosto.discharge.write");
  const [mode, setMode] = useState<null | "sortir" | "transferer" | "annuler" | "sorti">(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sortir
  const [dischargeType, setDischargeType] = useState<DischargeType | "">("");
  const [notes, setNotes] = useState("");
  const [confirmGrave, setConfirmGrave] = useState(false);
  // Transferer
  const [litsLibres, setLitsLibres] = useState<LitLibre[]>([]);
  const [litCible, setLitCible] = useState<number | "">("");
  const [motifT, setMotifT] = useState("");
  // Annuler
  const [motifA, setMotifA] = useState("");

  useEffect(() => {
    if (mode === "transferer") getLitsLibres().then(setLitsLibres).catch(() => {});
  }, [mode]);

  if (!canManage) return null;

  const graveSelected = DISCHARGE_OPTIONS.find((o) => o.value === dischargeType)?.grave;

  function reset() {
    setError(null); setBusy(false); setConfirmGrave(false);
    setDischargeType(""); setNotes(""); setLitCible(""); setMotifT(""); setMotifA("");
  }

  async function doSortir() {
    if (!dischargeType) return;
    setBusy(true); setError(null);
    try {
      await sortirSejour(sejourId, dischargeType, notes.trim() || undefined);
      setMode("sorti"); onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Sortie impossible."); setBusy(false); }
  }
  async function doTransferer() {
    if (!litCible) return;
    setBusy(true); setError(null);
    try {
      await transfererSejour(sejourId, Number(litCible), motifT.trim() || undefined);
      setMode(null); reset(); onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Transfert impossible."); setBusy(false); }
  }
  async function doAnnuler() {
    if (!motifA.trim()) return;
    setBusy(true); setError(null);
    try {
      await annulerSejour(sejourId, motifA.trim());
      setMode(null); reset(); onDone();
    } catch (e) { setError(e instanceof Error ? e.message : "Annulation impossible."); setBusy(false); }
  }

  const litCibleObj = litsLibres.find((l) => l.lit_id === Number(litCible));
  const interService = litCibleObj && serviceId != null && litCibleObj.service_id !== serviceId;

  return (
    <div className="space-y-2 pt-2 border-t border-outline-variant">
      <button type="button" onClick={() => { reset(); setMode("sortir"); }}
        className={`${btn} bg-primary text-on-primary hover:bg-primary-container`}>
        <LogoutOutlined style={{ fontSize: 18 }} /> Faire sortir le patient
      </button>
      <button type="button" onClick={() => { reset(); setMode("transferer"); }}
        className={`${btn} border border-outline-variant text-on-surface hover:bg-surface-container`}>
        <SwapHorizOutlined style={{ fontSize: 18 }} /> Transférer
      </button>
      <button type="button" onClick={() => { reset(); setMode("annuler"); }}
        className="w-full text-center text-label-md text-on-surface-variant hover:text-error transition-colors py-1">
        <CancelOutlined style={{ fontSize: 14 }} className="inline mr-1" /> Annuler l&apos;admission (erreur de saisie)
      </button>

      {mode === "sortir" && (
        <Modal title="Faire sortir le patient">
          <p className="text-body-sm text-on-surface-variant">
            À la confirmation : le lit passe en <strong>nettoyage</strong> et les administrations
            en cours <strong>s&apos;arrêtent</strong>. La prescription reste valide.
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Type de sortie <span className="text-error">*</span></label>
            <select className={field} value={dischargeType} onChange={(e) => { setDischargeType(e.target.value as DischargeType); setConfirmGrave(false); }}>
              <option value="">— Choisir —</option>
              {DISCHARGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Notes de sortie</label>
            <textarea className={`${field} resize-none`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {graveSelected && (
            <label className="flex items-start gap-2 rounded-xl border border-error/50 bg-error-container/20 px-3 py-2.5 cursor-pointer">
              <input type="checkbox" className="mt-0.5 accent-error" checked={confirmGrave} onChange={(e) => setConfirmGrave(e.target.checked)} />
              <span className="text-body-sm text-error font-medium">
                Je confirme cette sortie ({DISCHARGE_OPTIONS.find((o) => o.value === dischargeType)?.label}) — acte à implication médico-légale.
              </span>
            </label>
          )}
          {error && <p className="text-body-sm text-error">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={doSortir} disabled={busy || !dischargeType || (graveSelected && !confirmGrave)}
              className={`${btn} bg-primary text-on-primary disabled:opacity-40`}>{busy ? "…" : "Confirmer la sortie"}</button>
            <button type="button" onClick={() => setMode(null)} disabled={busy}
              className="px-5 rounded-xl border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container">Annuler</button>
          </div>
        </Modal>
      )}

      {mode === "sorti" && (
        <Modal title="Patient sorti">
          <p className="text-body-sm text-on-surface-variant">Le séjour est clôturé. Le lit est en nettoyage.</p>
          <div className="flex flex-col gap-2">
            {canWriteCR && (
              <Link href={`/sejours/${sejourId}/compte-rendu`} className={`${btn} bg-secondary text-on-secondary`}>
                Rédiger la lettre de sortie
              </Link>
            )}
            <button type="button" onClick={() => { setMode(null); reset(); }} className={`${btn} border border-outline-variant text-on-surface-variant`}>Fermer</button>
          </div>
        </Modal>
      )}

      {mode === "transferer" && (
        <Modal title="Transférer le patient">
          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Lit de destination <span className="text-error">*</span></label>
            <select className={field} value={litCible} onChange={(e) => setLitCible(e.target.value ? Number(e.target.value) : "")}>
              <option value="">— Choisir un lit libre —</option>
              {litsLibres.map((l) => (
                <option key={l.lit_id} value={l.lit_id}>{l.service_nom} · Ch. {l.chambre_numero} · Lit {l.numero}</option>
              ))}
            </select>
          </div>
          {interService && (
            <p className="text-body-sm text-tertiary flex items-center gap-1.5">
              <WarningAmberOutlined style={{ fontSize: 16 }} /> Transfert inter-service — le service du séjour changera.
            </p>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Motif</label>
            <input className={field} value={motifT} onChange={(e) => setMotifT(e.target.value)} placeholder="Ex : isolement, soins intensifs…" />
          </div>
          {error && <p className="text-body-sm text-error">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={doTransferer} disabled={busy || !litCible} className={`${btn} bg-primary text-on-primary disabled:opacity-40`}>{busy ? "…" : "Transférer"}</button>
            <button type="button" onClick={() => setMode(null)} disabled={busy} className="px-5 rounded-xl border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container">Annuler</button>
          </div>
        </Modal>
      )}

      {mode === "annuler" && (
        <Modal title="Annuler l'admission">
          <p className="text-body-sm text-on-surface-variant">
            <strong>Annuler</strong> corrige une erreur de saisie : le lit repasse <strong>libre</strong>
            (personne n&apos;y a dormi). Pour un patient qui part réellement, utilisez « Faire sortir ».
          </p>
          <div className="flex flex-col gap-1">
            <label className="text-label-md font-medium text-on-surface-variant">Motif <span className="text-error">*</span></label>
            <textarea className={`${field} resize-none`} rows={2} value={motifA} onChange={(e) => setMotifA(e.target.value)} autoFocus placeholder="Ex : mauvais patient / mauvais lit" />
          </div>
          {error && <p className="text-body-sm text-error">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={doAnnuler} disabled={busy || !motifA.trim()} className={`${btn} bg-error text-on-error disabled:opacity-40`}>{busy ? "…" : "Confirmer l'annulation"}</button>
            <button type="button" onClick={() => setMode(null)} disabled={busy} className="px-5 rounded-xl border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container">Retour</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
