"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AddOutlined } from "@mui/icons-material";
import { FormDrawer } from "@repo/ui/FormDrawer";
import { FORM_CONTROL, FormField } from "@repo/ui/FormField";
import {
  listObligations, createObligation, updateObligation,
  listEcheances, createEcheance, updateEcheance,
  listDeclarations, createDeclaration, updateDeclaration,
  listCorrespondances, createCorrespondance, updateCorrespondance,
  listPaiementsFiscaux, createPaiementFiscal, updatePaiementFiscal,
  listPenalites, createPenalite, updatePenalite,
  listControlesFiscaux, createControleFiscal, updateControleFiscal,
  FREQUENCE_LABELS, STATUT_ECHEANCE_LABELS, STATUT_DECLARATION_LABELS, TYPE_ECHEANCE_LABELS,
  TYPE_CORRESPONDANCE_LABELS, STATUT_PENALITE_LABELS, STATUT_CONTROLE_LABELS,
  type Obligation, type Echeance, type Declaration, type Correspondance,
  type PaiementFiscal, type Penalite, type ControleFiscal,
  type FrequenceObligation, type TypeEcheance, type StatutEcheance, type StatutDeclaration,
  type TypeCorrespondance, type StatutPenalite, type StatutControleFiscal,
} from "@/lib/bfm-fiscal-api";
import { jourFr } from "@/lib/format";

// Chaque onglet suit le même geste : un bouton d'ajout, une liste qui se LIT, et un tiroir — le même —
// pour ajouter comme pour modifier. Rien ne se saisit dans la liste : une ligne parcourue au hasard ne doit
// pas pouvoir changer un statut ou un montant par un geste malheureux.

const BOUTON_AJOUT =
  "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors";

function montant(n: number): string {
  return n.toLocaleString("fr-FR");
}

// Date locale en AAAA-MM-JJ : `toISOString` donnerait celle d'UTC, et le soir une date paraîtrait celle de demain.
function aujourdhui(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function Puce({ children }: { children: ReactNode }) {
  return (
    <span className="flex-none rounded-full bg-surface-container px-2 py-0.5 text-label-md font-semibold text-on-surface-variant">
      {children}
    </span>
  );
}

/** L'état d'un onglet : sa liste, le tiroir ouvert (`"nouveau"` pour un ajout, un élément pour sa modification),
 *  et l'enregistrement qui referme le tiroir et recharge. */
function usePanneau<T extends { id: number }>(dossierId: number, lister: (id: number) => Promise<T[]>) {
  const [items, setItems] = useState<T[] | null>(null);
  const [tiroir, setTiroir] = useState<T | "nouveau" | null>(null);
  const reload = useCallback(() => lister(dossierId).then(setItems), [dossierId, lister]);
  useEffect(() => {
    void reload();
  }, [reload]);

  async function enregistrer(creer: () => Promise<unknown>, modifier: (t: T) => Promise<unknown>) {
    if (tiroir === "nouveau") await creer();
    else if (tiroir) await modifier(tiroir);
    setTiroir(null);
    await reload();
  }
  return { items, tiroir, setTiroir, reload, enregistrer };
}

function Liste<T extends { id: number }>({
  items,
  vide,
  ajout,
  onAjouter,
  onOuvrir,
  ligne,
}: {
  items: T[] | null;
  vide: string;
  ajout: string;
  onAjouter: () => void;
  onOuvrir: (t: T) => void;
  ligne: (t: T) => ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button type="button" onClick={onAjouter} className={BOUTON_AJOUT}>
          <AddOutlined style={{ fontSize: 15 }} /> {ajout}
        </button>
      </div>
      {items === null ? (
        <p className="text-body-sm text-on-surface-variant">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">{vide}</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onOuvrir(t)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-container-low transition-colors"
              >
                {ligne(t)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const cleTiroir = (t: { id: number } | "nouveau") => (t === "nouveau" ? "nouveau" : t.id);
const initialDe = <T,>(t: T | "nouveau") => (t === "nouveau" ? undefined : t);

// ───────────────────────── Obligations ─────────────────────────

function ObligationTiroir({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: Obligation;
  onSubmit: (v: { nom: string; frequence: FrequenceObligation; description: string | null }) => Promise<void>;
  onClose: () => void;
}) {
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [frequence, setFrequence] = useState<FrequenceObligation>(initial?.frequence ?? "MENSUELLE");
  const [description, setDescription] = useState(initial?.description ?? "");

  return (
    <FormDrawer
      title={initial ? "Modifier l'obligation" : "Nouvelle obligation"}
      submitLabel={initial ? "Enregistrer" : "Ajouter"}
      onClose={onClose}
      onSubmit={() => onSubmit({ nom: nom.trim(), frequence, description: description.trim() || null })}
    >
      <FormField label="Nom *">
        <input className={FORM_CONTROL} placeholder="Ex. TVA mensuelle" value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
      </FormField>
      <FormField label="Fréquence">
        <select className={FORM_CONTROL} value={frequence} onChange={(e) => setFrequence(e.target.value as FrequenceObligation)}>
          {Object.entries(FREQUENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </FormField>
      <FormField label="Description">
        <textarea className={`${FORM_CONTROL} min-h-[6rem] resize-y`} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
    </FormDrawer>
  );
}

export function ObligationsPanel({ dossierId }: { dossierId: number }) {
  const { items, tiroir, setTiroir, enregistrer } = usePanneau<Obligation>(dossierId, listObligations);
  return (
    <>
      <Liste
        items={items} vide="Aucune obligation." ajout="Nouvelle obligation"
        onAjouter={() => setTiroir("nouveau")} onOuvrir={setTiroir}
        ligne={(o) => (
          <>
            <span className="flex-1 min-w-0 truncate text-body-sm text-on-surface">{o.nom}</span>
            <Puce>{FREQUENCE_LABELS[o.frequence]}</Puce>
          </>
        )}
      />
      {tiroir && (
        <ObligationTiroir
          key={cleTiroir(tiroir)} initial={initialDe(tiroir)} onClose={() => setTiroir(null)}
          onSubmit={(v) => enregistrer(
            () => createObligation(dossierId, { nom: v.nom, frequence: v.frequence, description: v.description ?? undefined }),
            (o) => updateObligation(dossierId, o.id, v),
          )}
        />
      )}
    </>
  );
}

// ───────────────────────── Échéances ─────────────────────────

function EcheanceTiroir({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: Echeance;
  onSubmit: (v: { type: TypeEcheance; nom: string; date_limite: string; statut: StatutEcheance }) => Promise<void>;
  onClose: () => void;
}) {
  const [type, setType] = useState<TypeEcheance>(initial?.type ?? "DECLARATION");
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [dateLimite, setDateLimite] = useState(initial?.date_limite?.slice(0, 10) ?? "");
  const [statut, setStatut] = useState<StatutEcheance>(initial?.statut ?? "A_FAIRE");

  return (
    <FormDrawer
      title={initial ? "Modifier l'échéance" : "Nouvelle échéance"}
      submitLabel={initial ? "Enregistrer" : "Ajouter"}
      onClose={onClose}
      onSubmit={() => onSubmit({ type, nom: nom.trim(), date_limite: dateLimite, statut })}
    >
      <FormField label="Type">
        {/* Le type se fixe à la création : le serveur ne le modifie pas. */}
        <select className={FORM_CONTROL} value={type} disabled={!!initial} onChange={(e) => setType(e.target.value as TypeEcheance)}>
          {Object.entries(TYPE_ECHEANCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </FormField>
      <FormField label="Nom *">
        <input className={FORM_CONTROL} placeholder="Nom de l'échéance" value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
      </FormField>
      <FormField label="Date limite *">
        <input className={FORM_CONTROL} type="date" value={dateLimite} onChange={(e) => setDateLimite(e.target.value)} required />
      </FormField>
      {initial && (
        <FormField label="Statut">
          <select className={FORM_CONTROL} value={statut} onChange={(e) => setStatut(e.target.value as StatutEcheance)}>
            {Object.entries(STATUT_ECHEANCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </FormField>
      )}
    </FormDrawer>
  );
}

export function EcheancesPanel({ dossierId }: { dossierId: number }) {
  const { items, tiroir, setTiroir, enregistrer } = usePanneau<Echeance>(dossierId, listEcheances);
  return (
    <>
      <Liste
        items={items} vide="Aucune échéance." ajout="Nouvelle échéance"
        onAjouter={() => setTiroir("nouveau")} onOuvrir={setTiroir}
        ligne={(e) => (
          <>
            <div className="flex-1 min-w-0">
              <p className="truncate text-body-sm text-on-surface">{e.nom}</p>
              <p className="text-label-md text-outline">{TYPE_ECHEANCE_LABELS[e.type]} · {jourFr(e.date_limite)}</p>
            </div>
            <Puce>{STATUT_ECHEANCE_LABELS[e.statut]}</Puce>
          </>
        )}
      />
      {tiroir && (
        <EcheanceTiroir
          key={cleTiroir(tiroir)} initial={initialDe(tiroir)} onClose={() => setTiroir(null)}
          onSubmit={(v) => enregistrer(
            () => createEcheance(dossierId, { type: v.type, nom: v.nom, date_limite: v.date_limite }),
            (e) => updateEcheance(dossierId, e.id, { nom: v.nom, date_limite: v.date_limite, statut: v.statut }),
          )}
        />
      )}
    </>
  );
}

// ───────────────────────── Déclarations ─────────────────────────

function DeclarationTiroir({
  initial,
  obligations,
  onSubmit,
  onClose,
}: {
  initial?: Declaration;
  obligations: Obligation[];
  onSubmit: (v: { obligationId: number; periode: string; statut: StatutDeclaration; dateDepot: string | null }) => Promise<void>;
  onClose: () => void;
}) {
  const [obligationId, setObligationId] = useState(initial ? String(initial.obligation_id) : "");
  const [periode, setPeriode] = useState(initial?.periode ?? "");
  const [statut, setStatut] = useState<StatutDeclaration>(initial?.statut ?? "A_FAIRE");
  const [dateDepot, setDateDepot] = useState(initial?.date_depot?.slice(0, 10) ?? "");

  return (
    <FormDrawer
      title={initial ? "Modifier la déclaration" : "Nouvelle déclaration"}
      submitLabel={initial ? "Enregistrer" : "Ajouter"}
      onClose={onClose}
      onSubmit={() => onSubmit({ obligationId: Number(obligationId), periode: periode.trim(), statut, dateDepot: dateDepot || null })}
    >
      <FormField label="Obligation *">
        {/* L'obligation et la période identifient la déclaration : elles ne changent plus une fois créée. */}
        <select className={FORM_CONTROL} value={obligationId} disabled={!!initial} onChange={(e) => setObligationId(e.target.value)} required autoFocus={!initial}>
          <option value="">Choisir…</option>
          {obligations.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
        </select>
      </FormField>
      <FormField label="Période *">
        <input className={FORM_CONTROL} placeholder="Ex. 2026-09 ou T3-2026" value={periode} disabled={!!initial} onChange={(e) => setPeriode(e.target.value)} required />
      </FormField>
      {initial && (
        <>
          <FormField label="Statut">
            <select className={FORM_CONTROL} value={statut} onChange={(e) => setStatut(e.target.value as StatutDeclaration)}>
              {Object.entries(STATUT_DECLARATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </FormField>
          <FormField label="Date de dépôt">
            <input className={FORM_CONTROL} type="date" value={dateDepot} onChange={(e) => setDateDepot(e.target.value)} />
          </FormField>
        </>
      )}
    </FormDrawer>
  );
}

export function DeclarationsPanel({ dossierId }: { dossierId: number }) {
  const { items, tiroir, setTiroir, enregistrer } = usePanneau<Declaration>(dossierId, listDeclarations);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  useEffect(() => {
    listObligations(dossierId).then(setObligations);
  }, [dossierId]);
  const nomObligation = (id: number) => obligations.find((o) => o.id === id)?.nom ?? "Obligation";

  return (
    <>
      <Liste
        items={items} vide="Aucune déclaration." ajout="Nouvelle déclaration"
        onAjouter={() => setTiroir("nouveau")} onOuvrir={setTiroir}
        ligne={(d) => (
          <>
            <div className="flex-1 min-w-0">
              <p className="truncate text-body-sm text-on-surface">{d.periode}</p>
              <p className="truncate text-label-md text-outline">
                {nomObligation(d.obligation_id)}{d.date_depot ? ` · déposée le ${jourFr(d.date_depot)}` : ""}
              </p>
            </div>
            <Puce>{STATUT_DECLARATION_LABELS[d.statut]}</Puce>
          </>
        )}
      />
      {tiroir && (
        <DeclarationTiroir
          key={cleTiroir(tiroir)} initial={initialDe(tiroir)} obligations={obligations} onClose={() => setTiroir(null)}
          onSubmit={(v) => enregistrer(
            () => createDeclaration(dossierId, { obligation_id: v.obligationId, periode: v.periode }),
            (d) => updateDeclaration(dossierId, d.id, { statut: v.statut, date_depot: v.dateDepot }),
          )}
        />
      )}
    </>
  );
}

// ───────────────────────── Correspondances ─────────────────────────

function CorrespondanceTiroir({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: Correspondance;
  onSubmit: (v: { avec: TypeCorrespondance; sujet: string; notes: string | null; date: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [avec, setAvec] = useState<TypeCorrespondance>(initial?.avec ?? "ADMINISTRATION");
  const [date, setDate] = useState(initial?.date?.slice(0, 10) ?? aujourdhui());
  const [sujet, setSujet] = useState(initial?.sujet ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <FormDrawer
      title={initial ? "Modifier la correspondance" : "Nouvelle correspondance"}
      submitLabel={initial ? "Enregistrer" : "Ajouter"}
      onClose={onClose}
      onSubmit={() => onSubmit({ avec, sujet: sujet.trim(), notes: notes.trim() || null, date })}
    >
      <FormField label="Avec">
        <select className={FORM_CONTROL} value={avec} onChange={(e) => setAvec(e.target.value as TypeCorrespondance)}>
          {Object.entries(TYPE_CORRESPONDANCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </FormField>
      <FormField label="Date *">
        <input className={FORM_CONTROL} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </FormField>
      <FormField label="Sujet *">
        <input className={FORM_CONTROL} value={sujet} onChange={(e) => setSujet(e.target.value)} required autoFocus />
      </FormField>
      <FormField label="Notes">
        <textarea className={`${FORM_CONTROL} min-h-[7rem] resize-y`} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </FormField>
    </FormDrawer>
  );
}

export function CorrespondancesPanel({ dossierId }: { dossierId: number }) {
  const { items, tiroir, setTiroir, enregistrer } = usePanneau<Correspondance>(dossierId, listCorrespondances);
  return (
    <>
      <Liste
        items={items} vide="Aucune correspondance." ajout="Nouvelle correspondance"
        onAjouter={() => setTiroir("nouveau")} onOuvrir={setTiroir}
        ligne={(c) => (
          <div className="flex-1 min-w-0">
            <p className="truncate text-body-sm text-on-surface">{TYPE_CORRESPONDANCE_LABELS[c.avec]} — {c.sujet}</p>
            <p className="text-label-md text-outline">{jourFr(c.date)}</p>
          </div>
        )}
      />
      {tiroir && (
        <CorrespondanceTiroir
          key={cleTiroir(tiroir)} initial={initialDe(tiroir)} onClose={() => setTiroir(null)}
          onSubmit={(v) => enregistrer(
            () => createCorrespondance(dossierId, { avec: v.avec, sujet: v.sujet, notes: v.notes ?? undefined, date: v.date }),
            (c) => updateCorrespondance(dossierId, c.id, v),
          )}
        />
      )}
    </>
  );
}

// ───────────────────────── Paiements ─────────────────────────

function PaiementTiroir({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: PaiementFiscal;
  onSubmit: (v: { montant: number; date_paiement: string; mode: string | null }) => Promise<void>;
  onClose: () => void;
}) {
  const [montantVal, setMontantVal] = useState(initial ? String(initial.montant) : "");
  const [date, setDate] = useState(initial?.date_paiement?.slice(0, 10) ?? aujourdhui());
  const [mode, setMode] = useState(initial?.mode ?? "");

  return (
    <FormDrawer
      title={initial ? "Modifier le paiement" : "Nouveau paiement"}
      submitLabel={initial ? "Enregistrer" : "Ajouter"}
      onClose={onClose}
      onSubmit={() => onSubmit({ montant: Number(montantVal), date_paiement: date, mode: mode.trim() || null })}
    >
      <FormField label="Montant *">
        <input className={FORM_CONTROL} type="number" min={0} step={1} value={montantVal} onChange={(e) => setMontantVal(e.target.value)} required autoFocus />
      </FormField>
      <FormField label="Date du paiement *">
        <input className={FORM_CONTROL} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </FormField>
      <FormField label="Mode de paiement">
        <input className={FORM_CONTROL} placeholder="Ex. Virement, chèque, espèces" value={mode} onChange={(e) => setMode(e.target.value)} />
      </FormField>
    </FormDrawer>
  );
}

export function PaiementsFiscauxPanel({ dossierId }: { dossierId: number }) {
  const { items, tiroir, setTiroir, enregistrer } = usePanneau<PaiementFiscal>(dossierId, listPaiementsFiscaux);
  return (
    <>
      <Liste
        items={items} vide="Aucun paiement." ajout="Nouveau paiement"
        onAjouter={() => setTiroir("nouveau")} onOuvrir={setTiroir}
        ligne={(p) => (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm text-on-surface tabular-nums">{montant(p.montant)}</p>
              {p.mode && <p className="text-label-md text-outline">{p.mode}</p>}
            </div>
            <span className="flex-none text-label-md text-outline">{jourFr(p.date_paiement)}</span>
          </>
        )}
      />
      {tiroir && (
        <PaiementTiroir
          key={cleTiroir(tiroir)} initial={initialDe(tiroir)} onClose={() => setTiroir(null)}
          onSubmit={(v) => enregistrer(
            () => createPaiementFiscal(dossierId, { montant: v.montant, date_paiement: v.date_paiement, mode: v.mode ?? undefined }),
            (p) => updatePaiementFiscal(dossierId, p.id, v),
          )}
        />
      )}
    </>
  );
}

// ───────────────────────── Pénalités ─────────────────────────

function PenaliteTiroir({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: Penalite;
  onSubmit: (v: { motif: string; montant: number; date: string; statut: StatutPenalite }) => Promise<void>;
  onClose: () => void;
}) {
  const [motif, setMotif] = useState(initial?.motif ?? "");
  const [montantVal, setMontantVal] = useState(initial ? String(initial.montant) : "");
  const [date, setDate] = useState(initial?.date?.slice(0, 10) ?? aujourdhui());
  const [statut, setStatut] = useState<StatutPenalite>(initial?.statut ?? "EN_ATTENTE");

  return (
    <FormDrawer
      title={initial ? "Modifier la pénalité" : "Nouvelle pénalité"}
      submitLabel={initial ? "Enregistrer" : "Ajouter"}
      onClose={onClose}
      onSubmit={() => onSubmit({ motif: motif.trim(), montant: Number(montantVal), date, statut })}
    >
      <FormField label="Motif *">
        <input className={FORM_CONTROL} value={motif} onChange={(e) => setMotif(e.target.value)} required autoFocus />
      </FormField>
      <FormField label="Montant *">
        <input className={FORM_CONTROL} type="number" min={0} step={1} value={montantVal} onChange={(e) => setMontantVal(e.target.value)} required />
      </FormField>
      <FormField label="Date *">
        <input className={FORM_CONTROL} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </FormField>
      {initial && (
        <FormField label="Statut">
          <select className={FORM_CONTROL} value={statut} onChange={(e) => setStatut(e.target.value as StatutPenalite)}>
            {Object.entries(STATUT_PENALITE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </FormField>
      )}
    </FormDrawer>
  );
}

export function PenalitesPanel({ dossierId }: { dossierId: number }) {
  const { items, tiroir, setTiroir, enregistrer } = usePanneau<Penalite>(dossierId, listPenalites);
  return (
    <>
      <Liste
        items={items} vide="Aucune pénalité." ajout="Nouvelle pénalité"
        onAjouter={() => setTiroir("nouveau")} onOuvrir={setTiroir}
        ligne={(p) => (
          <>
            <div className="flex-1 min-w-0">
              <p className="truncate text-body-sm text-on-surface">{p.motif}</p>
              <p className="text-label-md text-outline tabular-nums">{montant(p.montant)} · {jourFr(p.date)}</p>
            </div>
            <Puce>{STATUT_PENALITE_LABELS[p.statut]}</Puce>
          </>
        )}
      />
      {tiroir && (
        <PenaliteTiroir
          key={cleTiroir(tiroir)} initial={initialDe(tiroir)} onClose={() => setTiroir(null)}
          onSubmit={(v) => enregistrer(
            () => createPenalite(dossierId, { motif: v.motif, montant: v.montant, date: v.date }),
            (p) => updatePenalite(dossierId, p.id, v),
          )}
        />
      )}
    </>
  );
}

// ───────────────────────── Contrôles fiscaux ─────────────────────────

function ControleTiroir({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: ControleFiscal;
  onSubmit: (v: {
    type_controle: string | null; administration: string | null; date_debut: string | null; date_fin: string | null;
    resultat: string | null; statut: StatutControleFiscal;
  }) => Promise<void>;
  onClose: () => void;
}) {
  const [typeControle, setTypeControle] = useState(initial?.type_controle ?? "");
  const [administration, setAdministration] = useState(initial?.administration ?? "");
  const [dateDebut, setDateDebut] = useState(initial?.date_debut?.slice(0, 10) ?? "");
  const [dateFin, setDateFin] = useState(initial?.date_fin?.slice(0, 10) ?? "");
  const [resultat, setResultat] = useState(initial?.resultat ?? "");
  const [statut, setStatut] = useState<StatutControleFiscal>(initial?.statut ?? "ANNONCE");

  return (
    <FormDrawer
      title={initial ? "Modifier le contrôle fiscal" : "Nouveau contrôle fiscal"}
      submitLabel={initial ? "Enregistrer" : "Ajouter"}
      onClose={onClose}
      onSubmit={() =>
        onSubmit({
          type_controle: typeControle.trim() || null,
          administration: administration.trim() || null,
          date_debut: dateDebut || null,
          date_fin: dateFin || null,
          resultat: resultat.trim() || null,
          statut,
        })
      }
    >
      <FormField label="Type de contrôle">
        <input className={FORM_CONTROL} placeholder="Ex. Vérification générale" value={typeControle} onChange={(e) => setTypeControle(e.target.value)} autoFocus />
      </FormField>
      <FormField label="Administration">
        <input className={FORM_CONTROL} value={administration} onChange={(e) => setAdministration(e.target.value)} />
      </FormField>
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField label="Début">
          <input className={FORM_CONTROL} type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
        </FormField>
        <FormField label="Fin">
          <input className={FORM_CONTROL} type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
        </FormField>
      </div>
      {initial && (
        <>
          <FormField label="Statut">
            <select className={FORM_CONTROL} value={statut} onChange={(e) => setStatut(e.target.value as StatutControleFiscal)}>
              {Object.entries(STATUT_CONTROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </FormField>
          <FormField label="Résultat">
            <textarea className={`${FORM_CONTROL} min-h-[6rem] resize-y`} value={resultat} onChange={(e) => setResultat(e.target.value)} />
          </FormField>
        </>
      )}
    </FormDrawer>
  );
}

export function ControlesFiscauxPanel({ dossierId }: { dossierId: number }) {
  const { items, tiroir, setTiroir, enregistrer } = usePanneau<ControleFiscal>(dossierId, listControlesFiscaux);
  return (
    <>
      <Liste
        items={items} vide="Aucun contrôle fiscal." ajout="Nouveau contrôle"
        onAjouter={() => setTiroir("nouveau")} onOuvrir={setTiroir}
        ligne={(c) => (
          <>
            <div className="flex-1 min-w-0">
              <p className="truncate text-body-sm text-on-surface">
                {c.type_controle ?? "Contrôle"}{c.administration ? ` — ${c.administration}` : ""}
              </p>
              {(c.date_debut || c.date_fin) && (
                <p className="text-label-md text-outline">
                  {c.date_debut ? jourFr(c.date_debut) : "…"} → {c.date_fin ? jourFr(c.date_fin) : "…"}
                </p>
              )}
            </div>
            <Puce>{STATUT_CONTROLE_LABELS[c.statut]}</Puce>
          </>
        )}
      />
      {tiroir && (
        <ControleTiroir
          key={cleTiroir(tiroir)} initial={initialDe(tiroir)} onClose={() => setTiroir(null)}
          onSubmit={(v) => enregistrer(
            () => createControleFiscal(dossierId, {
              type_controle: v.type_controle ?? undefined, administration: v.administration ?? undefined,
              date_debut: v.date_debut ?? undefined, date_fin: v.date_fin ?? undefined,
            }),
            (c) => updateControleFiscal(dossierId, c.id, v),
          )}
        />
      )}
    </>
  );
}
