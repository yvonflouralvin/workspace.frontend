"use client";

import { useEffect, useState } from "react";
import {
  listObligations, createObligation,
  listEcheances, createEcheance, updateEcheance,
  listDeclarations, createDeclaration, updateDeclaration,
  listCorrespondances, createCorrespondance,
  listPaiementsFiscaux, createPaiementFiscal,
  listPenalites, createPenalite, updatePenalite,
  listControlesFiscaux, createControleFiscal, updateControleFiscal,
  FREQUENCE_LABELS, STATUT_ECHEANCE_LABELS, STATUT_DECLARATION_LABELS,
  type Obligation, type Echeance, type Declaration, type Correspondance,
  type PaiementFiscal, type Penalite, type ControleFiscal,
  type FrequenceObligation, type TypeEcheance, type StatutEcheance, type StatutDeclaration,
  type TypeCorrespondance, type StatutPenalite, type StatutControleFiscal,
} from "@/lib/bfm-fiscal-api";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

function montant(n: number): string { return n.toLocaleString("fr-FR"); }

// ───────────────────────── Obligations ─────────────────────────

export function ObligationsPanel({ dossierId }: { dossierId: number }) {
  const [items, setItems] = useState<Obligation[] | null>(null);
  const [nom, setNom] = useState("");
  const [frequence, setFrequence] = useState<FrequenceObligation>("MENSUELLE");

  function reload() { listObligations(dossierId).then(setItems); }
  useEffect(reload, [dossierId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createObligation(dossierId, { nom, frequence });
    setNom("");
    reload();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2">
        <input className={`${FIELD} flex-1`} placeholder="Ex. TVA mensuelle" value={nom} onChange={(e) => setNom(e.target.value)} required />
        <select className={FIELD} value={frequence} onChange={(e) => setFrequence(e.target.value as FrequenceObligation)}>
          {Object.entries(FREQUENCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
      </form>
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucune obligation.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((o) => (
            <li key={o.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex-1 text-body-sm">{o.nom}</span>
              <span className="text-label-md text-outline">{FREQUENCE_LABELS[o.frequence]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Échéances ─────────────────────────

export function EcheancesPanel({ dossierId }: { dossierId: number }) {
  const [items, setItems] = useState<Echeance[] | null>(null);
  const [nom, setNom] = useState("");
  const [type, setType] = useState<TypeEcheance>("DECLARATION");
  const [dateLimite, setDateLimite] = useState("");

  function reload() { listEcheances(dossierId).then(setItems); }
  useEffect(reload, [dossierId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createEcheance(dossierId, { type, nom, date_limite: dateLimite });
    setNom(""); setDateLimite("");
    reload();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2">
        <select className={FIELD} value={type} onChange={(e) => setType(e.target.value as TypeEcheance)}>
          <option value="DECLARATION">Déclaration</option>
          <option value="PAIEMENT">Paiement</option>
          <option value="AUTRE">Autre</option>
        </select>
        <input className={`${FIELD} flex-1`} placeholder="Nom de l'échéance" value={nom} onChange={(e) => setNom(e.target.value)} required />
        <input className={FIELD} type="date" value={dateLimite} onChange={(e) => setDateLimite(e.target.value)} required />
        <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
      </form>
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucune échéance.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-body-sm text-on-surface">{e.nom}</p>
                <p className="text-label-md text-outline">{e.date_limite}</p>
              </div>
              <select className={FIELD} value={e.statut} onChange={(ev) => updateEcheance(dossierId, e.id, { statut: ev.target.value as StatutEcheance }).then(reload)}>
                {Object.entries(STATUT_ECHEANCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Déclarations ─────────────────────────

export function DeclarationsPanel({ dossierId }: { dossierId: number }) {
  const [items, setItems] = useState<Declaration[] | null>(null);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [obligationId, setObligationId] = useState("");
  const [periode, setPeriode] = useState("");

  function reload() { listDeclarations(dossierId).then(setItems); }
  useEffect(() => { reload(); listObligations(dossierId).then(setObligations); }, [dossierId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!obligationId) return;
    await createDeclaration(dossierId, { obligation_id: Number(obligationId), periode });
    setPeriode("");
    reload();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2">
        <select className={FIELD} value={obligationId} onChange={(e) => setObligationId(e.target.value)} required>
          <option value="">Obligation…</option>
          {obligations.map((o) => <option key={o.id} value={o.id}>{o.nom}</option>)}
        </select>
        <input className={FIELD} placeholder="Période (ex. 2026-09)" value={periode} onChange={(e) => setPeriode(e.target.value)} required />
        <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
      </form>
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucune déclaration.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex-1 text-body-sm">{d.periode}</span>
              <select className={FIELD} value={d.statut} onChange={(e) => updateDeclaration(dossierId, d.id, { statut: e.target.value as StatutDeclaration }).then(reload)}>
                {Object.entries(STATUT_DECLARATION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Correspondances ─────────────────────────

export function CorrespondancesPanel({ dossierId }: { dossierId: number }) {
  const [items, setItems] = useState<Correspondance[] | null>(null);
  const [avec, setAvec] = useState<TypeCorrespondance>("ADMINISTRATION");
  const [sujet, setSujet] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function reload() { listCorrespondances(dossierId).then(setItems); }
  useEffect(reload, [dossierId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createCorrespondance(dossierId, { avec, sujet, date });
    setSujet("");
    reload();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2">
        <select className={FIELD} value={avec} onChange={(e) => setAvec(e.target.value as TypeCorrespondance)}>
          <option value="CLIENT">Client</option>
          <option value="ADMINISTRATION">Administration</option>
        </select>
        <input className={FIELD} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <input className={`${FIELD} flex-1`} placeholder="Sujet" value={sujet} onChange={(e) => setSujet(e.target.value)} required />
        <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
      </form>
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucune correspondance.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((c) => (
            <li key={c.id} className="px-3 py-2.5">
              <p className="text-body-sm text-on-surface">{c.avec === "CLIENT" ? "Client" : "Administration"} — {c.sujet}</p>
              <p className="text-label-md text-outline">{c.date}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Paiements ─────────────────────────

export function PaiementsFiscauxPanel({ dossierId }: { dossierId: number }) {
  const [items, setItems] = useState<PaiementFiscal[] | null>(null);
  const [montantVal, setMontantVal] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function reload() { listPaiementsFiscaux(dossierId).then(setItems); }
  useEffect(reload, [dossierId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createPaiementFiscal(dossierId, { montant: Number(montantVal), date_paiement: date });
    setMontantVal("");
    reload();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2">
        <input className={FIELD} type="number" placeholder="Montant" value={montantVal} onChange={(e) => setMontantVal(e.target.value)} required />
        <input className={FIELD} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
      </form>
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucun paiement.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex-1 text-body-sm">{montant(p.montant)}</span>
              <span className="text-label-md text-outline">{p.date_paiement}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Pénalités ─────────────────────────

export function PenalitesPanel({ dossierId }: { dossierId: number }) {
  const [items, setItems] = useState<Penalite[] | null>(null);
  const [motif, setMotif] = useState("");
  const [montantVal, setMontantVal] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function reload() { listPenalites(dossierId).then(setItems); }
  useEffect(reload, [dossierId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createPenalite(dossierId, { motif, montant: Number(montantVal), date });
    setMotif(""); setMontantVal("");
    reload();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2">
        <input className={`${FIELD} flex-1`} placeholder="Motif" value={motif} onChange={(e) => setMotif(e.target.value)} required />
        <input className={FIELD} type="number" placeholder="Montant" value={montantVal} onChange={(e) => setMontantVal(e.target.value)} required />
        <input className={FIELD} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
      </form>
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucune pénalité.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-body-sm text-on-surface">{p.motif}</p>
                <p className="text-label-md text-outline">{montant(p.montant)} · {p.date}</p>
              </div>
              <select className={FIELD} value={p.statut} onChange={(e) => updatePenalite(dossierId, p.id, e.target.value as StatutPenalite).then(reload)}>
                <option value="EN_ATTENTE">En attente</option>
                <option value="PAYEE">Payée</option>
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Contrôles fiscaux ─────────────────────────

export function ControlesFiscauxPanel({ dossierId }: { dossierId: number }) {
  const [items, setItems] = useState<ControleFiscal[] | null>(null);
  const [typeControle, setTypeControle] = useState("");
  const [administration, setAdministration] = useState("");

  function reload() { listControlesFiscaux(dossierId).then(setItems); }
  useEffect(reload, [dossierId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createControleFiscal(dossierId, { type_controle: typeControle || undefined, administration: administration || undefined });
    setTypeControle(""); setAdministration("");
    reload();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2">
        <input className={`${FIELD} flex-1`} placeholder="Type de contrôle" value={typeControle} onChange={(e) => setTypeControle(e.target.value)} />
        <input className={`${FIELD} flex-1`} placeholder="Administration" value={administration} onChange={(e) => setAdministration(e.target.value)} />
        <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
      </form>
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucun contrôle fiscal.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-body-sm text-on-surface">{c.type_controle ?? "Contrôle"} {c.administration ? `— ${c.administration}` : ""}</p>
              </div>
              <select className={FIELD} value={c.statut} onChange={(e) => updateControleFiscal(dossierId, c.id, { statut: e.target.value as StatutControleFiscal }).then(reload)}>
                <option value="ANNONCE">Annoncé</option>
                <option value="EN_COURS">En cours</option>
                <option value="CLOTURE">Clôturé</option>
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
