"use client";

import { useEffect, useState } from "react";
import {
  listContacts,
  createContact,
  updateContact,
  deleteContact,
  listContrats,
  createContrat,
  deleteContrat,
  logActivite,
  listFacturesDuClient,
  type Contact,
  type Contrat,
} from "@/lib/tiers-api";
import { listMissions, createMission, STATUT_MISSION_LABELS, type MissionSummary } from "@/lib/bfm-missions-api";
import { AddOutlined, DeleteOutlineOutlined, EditOutlined, ChevronRightOutlined } from "@mui/icons-material";
import { useConfirmSuppression } from "@repo/ui/hooks/useConfirmSuppression";
import { FormDrawer } from "@repo/ui/FormDrawer";
import { AccesPortailContact } from "@/components/AccesPortailContact";
import { listAccesClient, retirerAcces, type AccesClient } from "@/lib/acces-client-api";

const FIELD =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";
const BOUTON_AJOUT =
  "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors";

function montant(n: number | null): string {
  if (n === null) return "—";
  return n.toLocaleString("fr-FR");
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  );
}

// ───────────────────────── Contacts ─────────────────────────

type ContactValeurs = Omit<Contact, "id" | "tiers_id">;

function ContactTiroir({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: Contact;
  onSubmit: (v: ContactValeurs) => Promise<void>;
  onClose: () => void;
}) {
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [fonction, setFonction] = useState(initial?.fonction ?? "");
  const [telephone, setTelephone] = useState(initial?.telephone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");

  return (
    <FormDrawer
      title={initial ? "Modifier le contact" : "Nouveau contact"}
      submitLabel={initial ? "Enregistrer" : "Ajouter"}
      onClose={onClose}
      onSubmit={() =>
        onSubmit({
          nom: nom.trim(),
          fonction: fonction.trim() || null,
          telephone: telephone.trim() || null,
          email: email.trim() || null,
          adresse_bureau: initial?.adresse_bureau ?? null,
        })
      }
    >
      <Champ label="Nom *">
        <input className={FIELD} value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
      </Champ>
      <Champ label="Fonction">
        <input className={FIELD} value={fonction} onChange={(e) => setFonction(e.target.value)} />
      </Champ>
      <Champ label="Téléphone">
        <input className={FIELD} value={telephone} onChange={(e) => setTelephone(e.target.value)} />
      </Champ>
      <Champ label="E-mail">
        <input className={FIELD} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Champ>
    </FormDrawer>
  );
}

export function ContactsPanel({ tiersId, tiersNom }: { tiersId: number; tiersNom: string }) {
  const [items, setItems] = useState<Contact[] | null>(null);
  const [acces, setAcces] = useState<AccesClient[]>([]);
  // `null` : rien d'ouvert · `"nouveau"` : ajout · un contact : sa modification.
  const [tiroir, setTiroir] = useState<Contact | "nouveau" | null>(null);
  const { confirmer, dialogue } = useConfirmSuppression();

  function reload() {
    listContacts(tiersId).then(setItems);
    listAccesClient(tiersId).then(setAcces);
  }
  useEffect(reload, [tiersId]);

  // L'accès d'un contact : le lien direct, sinon l'adresse — un accès donné avant que le contact
  // ne soit rattaché se retrouve quand même.
  const accesDe = (c: Contact) =>
    acces.find((a) => a.actif && (a.contact_id === c.id || (c.email && a.email === c.email.toLowerCase())));

  const orphelins = items === null ? [] : acces.filter((a) => a.actif && !items.some((c) => accesDe(c)?.id === a.id));

  async function enregistrer(v: ContactValeurs) {
    if (tiroir === "nouveau") await createContact(tiersId, v);
    else if (tiroir) await updateContact(tiersId, tiroir.id, v);
    setTiroir(null);
    reload();
  }

  function demanderSuppression(c: Contact) {
    confirmer({
      title: "Supprimer ce contact ?",
      message: (
        <>
          <strong className="text-on-surface">{c.nom}</strong> sera supprimé
          {accesDe(c) ? " et son accès au portail sera retiré" : ""}. Cette action est irréversible.
        </>
      ),
      action: async () => {
        // Supprimer un contact ne doit pas laisser son accès ouvert : on le retire d'abord.
        const a = accesDe(c);
        if (a) await retirerAcces(a.id).catch(() => undefined);
        await deleteContact(tiersId, c.id);
        reload();
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setTiroir("nouveau")} className={BOUTON_AJOUT}>
          <AddOutlined style={{ fontSize: 15 }} /> Ajouter
        </button>
      </div>
      {orphelins.length > 0 && (
        <div className="rounded-xl border border-error/30 bg-error-container/20 p-3 space-y-1.5">
          <p className="text-body-sm font-semibold text-error">Accès au portail sans contact</p>
          {orphelins.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 text-body-sm">
              <span className="truncate text-on-surface">{a.nom || a.email} <span className="text-outline">— {a.email}</span></span>
              <button
                onClick={() =>
                  confirmer({
                    title: "Retirer cet accès ?",
                    message: <><strong className="text-on-surface">{a.nom || a.email}</strong> ne pourra plus se connecter au portail.</>,
                    confirmLabel: "Retirer",
                    action: () => retirerAcces(a.id).then(reload),
                  })
                }
                className="flex-none text-label-md font-semibold text-error hover:underline"
              >
                Retirer l&apos;accès
              </button>
            </div>
          ))}
        </div>
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
              <AccesPortailContact contact={c} tiersId={tiersId} tiersNom={tiersNom} acces={accesDe(c)} onChange={reload} />
              <button
                onClick={() => setTiroir(c)}
                aria-label={`Modifier ${c.nom}`}
                className="text-outline hover:text-primary transition-colors"
              >
                <EditOutlined style={{ fontSize: 17 }} />
              </button>
              <button
                onClick={() => demanderSuppression(c)}
                aria-label={`Supprimer ${c.nom}`}
                className="text-outline hover:text-error transition-colors"
              >
                <DeleteOutlineOutlined style={{ fontSize: 17 }} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {tiroir && (
        <ContactTiroir
          key={tiroir === "nouveau" ? "nouveau" : tiroir.id}
          initial={tiroir === "nouveau" ? undefined : tiroir}
          onSubmit={enregistrer}
          onClose={() => setTiroir(null)}
        />
      )}
      {dialogue}
    </div>
  );
}

// ───────────────────────── Contrats ─────────────────────────

function ContratTiroir({
  onSubmit,
  onClose,
}: {
  onSubmit: (v: { nom: string; montant?: number; date_debut?: string; date_fin?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [nom, setNom] = useState("");
  const [montantVal, setMontantVal] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  return (
    <FormDrawer
      title="Nouveau contrat"
      submitLabel="Créer"
      onClose={onClose}
      onSubmit={() =>
        onSubmit({
          nom: nom.trim(),
          montant: montantVal ? Number(montantVal) : undefined,
          date_debut: dateDebut || undefined,
          date_fin: dateFin || undefined,
        })
      }
    >
      <Champ label="Nom du contrat *">
        <input className={FIELD} value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
      </Champ>
      <Champ label="Montant">
        <input className={FIELD} type="number" value={montantVal} onChange={(e) => setMontantVal(e.target.value)} />
      </Champ>
      <div className="grid sm:grid-cols-2 gap-4">
        <Champ label="Date de début">
          <input className={FIELD} type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
        </Champ>
        <Champ label="Date de fin">
          <input className={FIELD} type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
        </Champ>
      </div>
    </FormDrawer>
  );
}

export function ContratsPanel({ tiersId }: { tiersId: number }) {
  const [items, setItems] = useState<Contrat[] | null>(null);
  const [ajout, setAjout] = useState(false);
  const { confirmer, dialogue } = useConfirmSuppression();

  function reload() { listContrats(tiersId).then(setItems); }
  useEffect(reload, [tiersId]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setAjout(true)} className={BOUTON_AJOUT}>
          <AddOutlined style={{ fontSize: 15 }} /> Nouveau contrat
        </button>
      </div>
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
              <button
                onClick={() =>
                  confirmer({
                    title: "Supprimer ce contrat ?",
                    message: <><strong className="text-on-surface">{c.nom}</strong> sera supprimé. Cette action est irréversible.</>,
                    action: () => deleteContrat(tiersId, c.id).then(reload),
                  })
                }
                aria-label={`Supprimer ${c.nom}`}
                className="text-outline hover:text-error transition-colors"
              >
                <DeleteOutlineOutlined style={{ fontSize: 17 }} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {dialogue}
      {ajout && (
        <ContratTiroir
          onClose={() => setAjout(false)}
          onSubmit={async (v) => {
            await createContrat(tiersId, v);
            logActivite(tiersId, `Contrat créé : ${v.nom}`);
            setAjout(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────── Missions ─────────────────────────

function MissionTiroir({ onSubmit, onClose }: { onSubmit: (nom: string) => Promise<void>; onClose: () => void }) {
  const [nom, setNom] = useState("");
  return (
    <FormDrawer title="Nouvelle mission" submitLabel="Créer" onClose={onClose} onSubmit={() => onSubmit(nom.trim())}>
      <Champ label="Nom de la mission *">
        <input className={FIELD} value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
      </Champ>
    </FormDrawer>
  );
}

export function MissionsPanel({ tiersId }: { tiersId: number }) {
  const [items, setItems] = useState<MissionSummary[] | null>(null);
  const [ajout, setAjout] = useState(false);

  function reload() { listMissions({ tiers_id: tiersId }).then(setItems); }
  useEffect(reload, [tiersId]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setAjout(true)} className={BOUTON_AJOUT}>
          <AddOutlined style={{ fontSize: 15 }} /> Nouvelle mission
        </button>
      </div>
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
      {ajout && (
        <MissionTiroir
          onClose={() => setAjout(false)}
          onSubmit={async (nom) => {
            await createMission({ nom, tiers_id: tiersId });
            logActivite(tiersId, `Mission créée : ${nom}`);
            setAjout(false);
            reload();
          }}
        />
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
