"use client";

import { useEffect, useState } from "react";
import {
  listEquipe, addEquipe, removeEquipe,
  listEtapes, createEtape, updateEtape, deleteEtape,
  listDocumentsDemandes, createDocumentDemande, updateDocumentDemande, deleteDocumentDemande,
  listControles, createControle, changerStatutControle, deleteControle,
  listRisques, createRisque, updateRisque,
  listAnomalies, createAnomalie, updateAnomalie,
  listRapports, deposerRapport,
  getHistoriqueMission,
  STATUT_CONTROLE_LABELS, NIVEAU_RISQUE_LABELS, STATUT_RISQUE_LABELS, STATUT_ANOMALIE_LABELS,
  type Etape, type DocumentDemande, type Controle, type Risque, type Anomalie, type Rapport,
  type StatutControle, type StatutRisque, type StatutAnomalie, type TypeRapport,
} from "@/lib/bfm-audit-api";
import { AddOutlined, DeleteOutlineOutlined } from "@mui/icons-material";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

// ───────────────────────── Équipe ─────────────────────────

export function EquipePanel({ missionId }: { missionId: number }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listEquipe>> | null>(null);
  const [userId, setUserId] = useState("");

  function reload() { listEquipe(missionId).then(setItems); }
  useEffect(reload, [missionId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    await addEquipe(missionId, Number(userId));
    setUserId("");
    reload();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={ajouter} className="flex items-end gap-2">
        <input className={FIELD} placeholder="ID utilisateur" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
      </form>
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucun membre affecté.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex-1 text-body-sm">{m.user_name ?? `Utilisateur #${m.user_id}`}</span>
              <button onClick={() => removeEquipe(missionId, m.user_id).then(reload)} className="text-outline hover:text-error transition-colors">
                <DeleteOutlineOutlined style={{ fontSize: 17 }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Étapes (planning) ─────────────────────────

export function EtapesPanel({ missionId }: { missionId: number }) {
  const [items, setItems] = useState<Etape[] | null>(null);
  const [nom, setNom] = useState("");
  const [datePrevue, setDatePrevue] = useState("");

  function reload() { listEtapes(missionId).then(setItems); }
  useEffect(reload, [missionId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createEtape(missionId, { nom, date_prevue: datePrevue || undefined });
    setNom(""); setDatePrevue("");
    reload();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={ajouter} className="flex flex-wrap items-end gap-2">
        <input className={`${FIELD} flex-1`} placeholder="Nom de l'étape" value={nom} onChange={(e) => setNom(e.target.value)} required />
        <input className={FIELD} type="date" value={datePrevue} onChange={(e) => setDatePrevue(e.target.value)} />
        <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
      </form>
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucune étape planifiée.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex-1 text-body-sm">{e.nom}</span>
              <span className="text-label-md text-outline">{e.date_prevue ?? "—"}</span>
              <select
                className={FIELD}
                value={e.statut}
                onChange={(ev) => updateEtape(missionId, e.id, { statut: ev.target.value as Etape["statut"] }).then(reload)}
              >
                <option value="A_FAIRE">À faire</option>
                <option value="EN_COURS">En cours</option>
                <option value="TERMINEE">Terminée</option>
              </select>
              <button onClick={() => deleteEtape(missionId, e.id).then(reload)} className="text-outline hover:text-error transition-colors">
                <DeleteOutlineOutlined style={{ fontSize: 17 }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Documents demandés/reçus/manquants ─────────────────────────

export function DocumentsDemandesPanel({ missionId }: { missionId: number }) {
  const [items, setItems] = useState<DocumentDemande[] | null>(null);
  const [nom, setNom] = useState("");

  function reload() { listDocumentsDemandes(missionId).then(setItems); }
  useEffect(reload, [missionId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createDocumentDemande(missionId, { nom });
    setNom("");
    reload();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={ajouter} className="flex items-end gap-2">
        <input className={`${FIELD} flex-1`} placeholder="Document demandé au client" value={nom} onChange={(e) => setNom(e.target.value)} required />
        <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Demander</button>
      </form>
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucun document demandé.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex-1 text-body-sm">{d.nom}</span>
              <select
                className={FIELD}
                value={d.statut}
                onChange={(e) => updateDocumentDemande(missionId, d.id, { statut: e.target.value as DocumentDemande["statut"] }).then(reload)}
              >
                <option value="DEMANDE">Demandé</option>
                <option value="RECU">Reçu</option>
                <option value="MANQUANT">Manquant</option>
              </select>
              <button onClick={() => deleteDocumentDemande(missionId, d.id).then(reload)} className="text-outline hover:text-error transition-colors">
                <DeleteOutlineOutlined style={{ fontSize: 17 }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Checklist (contrôles) ─────────────────────────

export function ChecklistPanel({ missionId }: { missionId: number }) {
  const [items, setItems] = useState<Controle[] | null>(null);
  const [libelle, setLibelle] = useState("");

  function reload() { listControles(missionId).then(setItems); }
  useEffect(reload, [missionId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createControle(missionId, { libelle });
    setLibelle("");
    reload();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={ajouter} className="flex items-end gap-2">
        <input className={`${FIELD} flex-1`} placeholder="Nouveau point de contrôle" value={libelle} onChange={(e) => setLibelle(e.target.value)} required />
        <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
      </form>
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucun contrôle.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-body-sm text-on-surface">{c.libelle}</p>
                {c.assigne_nom && <p className="text-label-md text-outline">Assigné à {c.assigne_nom}</p>}
              </div>
              <select
                className={FIELD}
                value={c.statut}
                onChange={(e) => changerStatutControle(missionId, c.id, e.target.value as StatutControle).then(reload)}
              >
                {Object.entries(STATUT_CONTROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <button onClick={() => deleteControle(missionId, c.id).then(reload)} className="text-outline hover:text-error transition-colors">
                <DeleteOutlineOutlined style={{ fontSize: 17 }} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Risques ─────────────────────────

export function RisquesPanel({ missionId }: { missionId: number }) {
  const [items, setItems] = useState<Risque[] | null>(null);
  const [titre, setTitre] = useState("");

  function reload() { listRisques(missionId).then(setItems); }
  useEffect(reload, [missionId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createRisque(missionId, { titre });
    setTitre("");
    reload();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={ajouter} className="flex items-end gap-2">
        <input className={`${FIELD} flex-1`} placeholder="Risque identifié" value={titre} onChange={(e) => setTitre(e.target.value)} required />
        <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
      </form>
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucun risque identifié.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex-1 text-body-sm">{r.titre}</span>
              <select className={FIELD} value={r.niveau} onChange={(e) => updateRisque(missionId, r.id, { niveau: e.target.value as Risque["niveau"] }).then(reload)}>
                {Object.entries(NIVEAU_RISQUE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select className={FIELD} value={r.statut} onChange={(e) => updateRisque(missionId, r.id, { statut: e.target.value as StatutRisque }).then(reload)}>
                {Object.entries(STATUT_RISQUE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Anomalies ─────────────────────────

export function AnomaliesPanel({ missionId }: { missionId: number }) {
  const [items, setItems] = useState<Anomalie[] | null>(null);
  const [titre, setTitre] = useState("");

  function reload() { listAnomalies(missionId).then(setItems); }
  useEffect(reload, [missionId]);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    await createAnomalie(missionId, { titre });
    setTitre("");
    reload();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={ajouter} className="flex items-end gap-2">
        <input className={`${FIELD} flex-1`} placeholder="Anomalie constatée" value={titre} onChange={(e) => setTitre(e.target.value)} required />
        <button type="submit" className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold">Ajouter</button>
      </form>
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucune anomalie.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex-1 text-body-sm">{a.titre}</span>
              <select className={FIELD} value={a.statut} onChange={(e) => updateAnomalie(missionId, a.id, { statut: e.target.value as StatutAnomalie }).then(reload)}>
                {Object.entries(STATUT_ANOMALIE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Rapports ─────────────────────────

export function RapportsPanel({ missionId }: { missionId: number }) {
  const [items, setItems] = useState<Rapport[] | null>(null);
  const [type, setType] = useState<TypeRapport>("PROVISOIRE");
  const [uploading, setUploading] = useState(false);

  function reload() { listRapports(missionId).then(setItems); }
  useEffect(reload, [missionId]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      await deposerRapport(missionId, type, file);
      reload();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <select className={FIELD} value={type} onChange={(e) => setType(e.target.value as TypeRapport)}>
          <option value="PROVISOIRE">Provisoire</option>
          <option value="FINAL">Final</option>
        </select>
        <label className="h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold cursor-pointer inline-flex items-center">
          {uploading ? "Envoi…" : "Déposer le rapport"}
          <input type="file" className="hidden" onChange={onFile} disabled={uploading} />
        </label>
      </div>
      {items === null ? <p className="text-body-sm text-on-surface-variant">Chargement…</p> : items.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">Aucun rapport déposé.</p>
      ) : (
        <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
          {items.map((r) => (
            <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex-1 text-body-sm">{r.type === "PROVISOIRE" ? "Rapport provisoire" : "Rapport final"}</span>
              <span className="text-label-md text-outline">{new Date(r.genere_le).toLocaleDateString("fr-FR")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────── Historique ─────────────────────────

export function HistoriquePanel({ missionId }: { missionId: number }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof getHistoriqueMission>> | null>(null);
  useEffect(() => { getHistoriqueMission(missionId).then(setItems); }, [missionId]);

  if (items === null) return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;
  if (items.length === 0) return <p className="text-body-sm text-on-surface-variant">Aucun événement.</p>;
  return (
    <ul className="rounded-xl border border-outline-soft divide-y divide-hairline">
      {items.map((h) => (
        <li key={h.id} className="px-3 py-2.5">
          <p className="text-body-sm text-on-surface">{h.evenement}</p>
          <p className="text-label-md text-outline">{h.par_nom ?? "—"} · {new Date(h.survenu_le).toLocaleString("fr-FR")}</p>
        </li>
      ))}
    </ul>
  );
}
