"use client";

import { useEffect, useState } from "react";
import {
  listContacts,
  createContact,
  deleteContact,
  listContrats,
  createContrat,
  deleteContrat,
  listServicesSouscrits,
  createServiceSouscrit,
  deleteServiceSouscrit,
  listEchanges,
  createEchange,
  deleteEchange,
  listActivites,
  logActivite,
  listTiersDocuments,
  listFacturesDuClient,
  TYPE_ECHANGE_LABELS,
  type Contact,
  type Contrat,
  type ServiceSouscrit,
  type Echange,
  type TypeEchange,
} from "@/lib/tiers-api";
import { listMissions, createMission, STATUT_MISSION_LABELS, type MissionSummary } from "@/lib/bfm-missions-api";
import { AddOutlined, DeleteOutlineOutlined, ChevronRightOutlined } from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

function montant(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("fr-FR");
}

// ───────────────────────── Contacts ─────────────────────────

export function ContactsPanel({ tiersId }: { tiersId: number }) {
  const [items, setItems] = useState<Contact[] | null>(null);
  const [ajout, setAjout] = useState(false);
  const [nom, setNom] = useState("");
  const [fonction, setFonction] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");

  function reload() {
    listContacts(tiersId).then(setItems);
  }
  useEffect(reload, [tiersId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createContact(tiersId, { nom, fonction: fonction || null, telephone: telephone || null, email: email || null, adresse_bureau: null });
    setNom(""); setFonction(""); setTelephone(""); setEmail(""); setAjout(false);
    reload();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {!ajout && (
          <button onClick={() => setAjout(true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors">
            <AddOutlined style={{ fontSize: 15 }} /> Ajouter
          </button>
        )}
      </div>
      {ajout && (
        <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2 rounded-xl border border-outline-soft p-3">
          <input className={FIELD} placeholder="Nom *" value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
          <input className={FIELD} placeholder="Fonction" value={fonction} onChange={(e) => setFonction(e.target.value)} />
          <input className={FIELD} placeholder="Téléphone" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
          <input className={FIELD} placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button type="button" onClick={() => setAjout(false)} className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">Annuler</button>
          <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
        </form>
      )}
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucun contact.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-on-surface">{c.nom} {c.fonction && <span className="text-outline">— {c.fonction}</span>}</p>
                <p className="text-label-md text-outline">{[c.telephone, c.email].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              <button onClick={() => deleteContact(tiersId, c.id).then(reload)} className="text-outline hover:text-error transition-colors">
                <DeleteOutlineOutlined style={{ fontSize: 17 }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Contrats ─────────────────────────

export function ContratsPanel({ tiersId }: { tiersId: number }) {
  const [items, setItems] = useState<Contrat[] | null>(null);
  const [ajout, setAjout] = useState(false);
  const [nom, setNom] = useState("");
  const [montantVal, setMontantVal] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  function reload() { listContrats(tiersId).then(setItems); }
  useEffect(reload, [tiersId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createContrat(tiersId, {
      nom, montant: montantVal ? Number(montantVal) : undefined,
      date_debut: dateDebut || undefined, date_fin: dateFin || undefined,
    });
    logActivite(tiersId, `Contrat créé : ${nom}`);
    setNom(""); setMontantVal(""); setDateDebut(""); setDateFin(""); setAjout(false);
    reload();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {!ajout && (
          <button onClick={() => setAjout(true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors">
            <AddOutlined style={{ fontSize: 15 }} /> Nouveau contrat
          </button>
        )}
      </div>
      {ajout && (
        <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2 rounded-xl border border-outline-soft p-3">
          <input className={FIELD} placeholder="Nom du contrat *" value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
          <input className={`${FIELD} w-32`} type="number" placeholder="Montant" value={montantVal} onChange={(e) => setMontantVal(e.target.value)} />
          <input className={FIELD} type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          <input className={FIELD} type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          <button type="button" onClick={() => setAjout(false)} className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">Annuler</button>
          <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Créer</button>
        </form>
      )}
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucun contrat.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-on-surface">{c.nom}</p>
                <p className="text-label-md text-outline">
                  {c.date_debut?.slice(0, 10) ?? "—"} → {c.date_fin?.slice(0, 10) ?? "—"} · {montant(c.montant)} · {c.statut}
                </p>
              </div>
              <button onClick={() => deleteContrat(tiersId, c.id).then(reload)} className="text-outline hover:text-error transition-colors">
                <DeleteOutlineOutlined style={{ fontSize: 17 }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Services souscrits ─────────────────────────

export function ServicesPanel({ tiersId }: { tiersId: number }) {
  const [items, setItems] = useState<ServiceSouscrit[] | null>(null);
  const [ajout, setAjout] = useState(false);
  const [nom, setNom] = useState("");

  function reload() { listServicesSouscrits(tiersId).then(setItems); }
  useEffect(reload, [tiersId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createServiceSouscrit(tiersId, { nom });
    logActivite(tiersId, `Service souscrit ajouté : ${nom}`);
    setNom(""); setAjout(false);
    reload();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {!ajout && (
          <button onClick={() => setAjout(true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors">
            <AddOutlined style={{ fontSize: 15 }} /> Ajouter
          </button>
        )}
      </div>
      {ajout && (
        <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2 rounded-xl border border-outline-soft p-3">
          <input className={`${FIELD} flex-1`} placeholder="Ex. Tenue de comptabilité mensuelle" value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
          <button type="button" onClick={() => setAjout(false)} className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">Annuler</button>
          <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
        </form>
      )}
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucun service souscrit.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-on-surface">{s.nom}</p>
                <p className="text-label-md text-outline">{s.statut}</p>
              </div>
              <button onClick={() => deleteServiceSouscrit(tiersId, s.id).then(reload)} className="text-outline hover:text-error transition-colors">
                <DeleteOutlineOutlined style={{ fontSize: 17 }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Missions ─────────────────────────

export function MissionsPanel({ tiersId }: { tiersId: number }) {
  const [items, setItems] = useState<MissionSummary[] | null>(null);
  const [ajout, setAjout] = useState(false);
  const [nom, setNom] = useState("");

  function reload() { listMissions({ tiers_id: tiersId }).then(setItems); }
  useEffect(reload, [tiersId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createMission({ nom, tiers_id: tiersId });
    logActivite(tiersId, `Mission créée : ${nom}`);
    setNom(""); setAjout(false);
    reload();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {!ajout && (
          <button onClick={() => setAjout(true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors">
            <AddOutlined style={{ fontSize: 15 }} /> Nouvelle mission
          </button>
        )}
      </div>
      {ajout && (
        <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2 rounded-xl border border-outline-soft p-3">
          <input className={`${FIELD} flex-1`} placeholder="Nom de la mission" value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
          <button type="button" onClick={() => setAjout(false)} className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">Annuler</button>
          <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Créer</button>
        </form>
      )}
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucune mission.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-on-surface">{m.nom}</p>
                <p className="text-label-md text-outline">{STATUT_MISSION_LABELS[m.statut]} {m.type_mission ? `· ${m.type_mission}` : ""}</p>
              </div>
              <a href={`/missions/${m.id}`} className="text-outline hover:text-primary transition-colors">
                <ChevronRightOutlined style={{ fontSize: 18 }} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Factures ─────────────────────────

export function FacturesPanel({ tiersId }: { tiersId: number }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listFacturesDuClient>> | null>(null);
  useEffect(() => { listFacturesDuClient(tiersId).then(setItems); }, [tiersId]);

  if (items === null) return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;
  if (items.length === 0) return <p className="text-body-sm text-on-surface-variant">Aucune facture.</p>;
  return (
    <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
      {items.map((f) => (
        <li key={f.id} className="flex items-center gap-3 px-3 py-2.5">
          <span className="font-mono text-body-sm">{f.code}</span>
          <span className="flex-1 text-label-md text-outline">{f.statut}</span>
          <span className="text-body-sm tabular-nums">{Number(f.montant_paye).toLocaleString("fr-FR")} / {Number(f.montant_total).toLocaleString("fr-FR")}</span>
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────── Documents ─────────────────────────

export function DocumentsPanel({ tiersId }: { tiersId: number }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listTiersDocuments>> | null>(null);
  useEffect(() => { listTiersDocuments(tiersId).then(setItems); }, [tiersId]);

  if (items === null) return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;
  if (items.length === 0) return <p className="text-body-sm text-on-surface-variant">Aucun document.</p>;
  return (
    <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
      {items.map((d) => (
        <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
          <span className="flex-1 text-body-sm truncate">{d.filename}</span>
          <span className="text-label-md text-outline">{d.category ?? "—"}</span>
        </li>
      ))}
    </ul>
  );
}

// ───────────────────────── Échanges ─────────────────────────

export function EchangesPanel({ tiersId }: { tiersId: number }) {
  const [items, setItems] = useState<Echange[] | null>(null);
  const [ajout, setAjout] = useState(false);
  const [type, setType] = useState<TypeEchange>("APPEL");
  const [sujet, setSujet] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  function reload() { listEchanges(tiersId).then(setItems); }
  useEffect(reload, [tiersId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createEchange(tiersId, { type, sujet, notes: notes || undefined, date_echange: date });
    setSujet(""); setNotes(""); setAjout(false);
    reload();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        {!ajout && (
          <button onClick={() => setAjout(true)} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors">
            <AddOutlined style={{ fontSize: 15 }} /> Nouvel échange
          </button>
        )}
      </div>
      {ajout && (
        <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2 rounded-xl border border-outline-soft p-3">
          <select className={FIELD} value={type} onChange={(e) => setType(e.target.value as TypeEchange)}>
            {Object.entries(TYPE_ECHANGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input className={FIELD} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <input className={`${FIELD} flex-1`} placeholder="Sujet *" value={sujet} onChange={(e) => setSujet(e.target.value)} required />
          <input className={`${FIELD} flex-1`} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button type="button" onClick={() => setAjout(false)} className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors">Annuler</button>
          <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
        </form>
      )}
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucun échange enregistré.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-body-sm font-medium text-on-surface">{TYPE_ECHANGE_LABELS[e.type]} — {e.sujet}</p>
                <p className="text-label-md text-outline">{e.date_echange.slice(0, 10)} {e.notes ? `· ${e.notes}` : ""}</p>
              </div>
              <button onClick={() => deleteEchange(tiersId, e.id).then(reload)} className="text-outline hover:text-error transition-colors">
                <DeleteOutlineOutlined style={{ fontSize: 17 }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Actions réalisées ─────────────────────────

export function ActivitesPanel({ tiersId }: { tiersId: number }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listActivites>> | null>(null);
  useEffect(() => { listActivites(tiersId).then(setItems); }, [tiersId]);

  if (items === null) return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;
  if (items.length === 0) return <p className="text-body-sm text-on-surface-variant">Aucune action enregistrée.</p>;
  return (
    <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
      {items.map((a) => (
        <li key={a.id} className="px-3 py-2.5">
          <p className="text-body-sm text-on-surface">{a.action}</p>
          <p className="text-label-md text-outline">{new Date(a.created_at).toLocaleString("fr-FR")}</p>
        </li>
      ))}
    </ul>
  );
}
