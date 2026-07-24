"use client";

import { useCallback, useEffect, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { DashboardShell } from "@/components/DashboardShell";
import {
  AddOutlined,
  BedOutlined,
  DeleteOutlineOutlined,
  HotelOutlined,
  LockOutlined,
  MeetingRoomOutlined,
} from "@mui/icons-material";
import { listServices, type Service } from "@/app/lib/api";
import {
  listChambres,
  createChambre,
  deleteChambre,
  createLitsBulk,
  changeLitStatus,
  deleteLit,
  getChambre,
  OPERATIONAL_STATUSES,
  LIT_STATUS_LABEL,
  type ChambreListItem,
  type ChambreDetail,
  type Lit,
  type LitStatus,
} from "@/app/lib/beds-api";

const STATUS_CLS: Record<LitStatus, string> = {
  LIBRE: "bg-secondary/10 text-secondary",
  OCCUPE: "bg-primary/10 text-primary",
  NETTOYAGE: "bg-error-container/60 text-error",
  MAINTENANCE: "bg-error-container/60 text-error",
  HORS_SERVICE: "bg-surface-container text-on-surface-variant/70",
};

const CHAMBRE_TYPES = ["INDIVIDUELLE", "DOUBLE", "COMMUNE", "ISOLEMENT", "AUTRE"];

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "text-label-md font-medium text-on-surface-variant";

// ─── Lit chip ────────────────────────────────────────────────────────────────
function LitChip({
  lit,
  canManage,
  onChanged,
}: {
  lit: Lit;
  canManage: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const occupe = lit.status === "OCCUPE";

  async function setStatus(s: LitStatus) {
    setBusy(true);
    try {
      await changeLitStatus(lit.id, s);
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteLit(lit.id);
      onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ${STATUS_CLS[lit.status]}`}>
      <BedOutlined style={{ fontSize: 15 }} />
      <span className="text-body-sm font-medium">Lit {lit.numero}</span>
      {canManage && !occupe ? (
        <select
          value={lit.status}
          disabled={busy}
          onChange={(e) => setStatus(e.target.value as LitStatus)}
          className="bg-transparent text-label-sm focus:outline-none cursor-pointer"
          title="Changer le statut opérationnel"
        >
          {OPERATIONAL_STATUSES.map((s) => (
            <option key={s} value={s}>{LIT_STATUS_LABEL[s]}</option>
          ))}
        </select>
      ) : (
        <span className="text-label-sm">{LIT_STATUS_LABEL[lit.status]}</span>
      )}
      {canManage && !occupe && (
        <button type="button" onClick={remove} disabled={busy} title="Supprimer le lit"
          className="text-current/60 hover:text-error transition-colors">
          <DeleteOutlineOutlined style={{ fontSize: 15 }} />
        </button>
      )}
    </div>
  );
}

// ─── Chambre card ────────────────────────────────────────────────────────────
function ChambreCard({
  chambre,
  canManage,
  onMutate,
  onAddLits,
}: {
  chambre: ChambreListItem;
  canManage: boolean;
  onMutate: () => void;
  onAddLits: () => void;
}) {
  const [detail, setDetail] = useState<ChambreDetail | null>(null);

  const load = useCallback(() => {
    getChambre(chambre.id).then(setDetail).catch(() => {});
  }, [chambre.id]);

  useEffect(() => { load(); }, [load]);

  async function removeChambre() {
    try {
      await deleteChambre(chambre.id);
      onMutate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Suppression impossible.");
    }
  }

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <MeetingRoomOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" />
          <span className="text-body-md font-semibold text-on-surface">Chambre {chambre.numero}</span>
          {chambre.nom && <span className="text-body-sm text-on-surface-variant">— {chambre.nom}</span>}
          {chambre.type && (
            <span className="text-label-sm bg-surface-container px-2 py-0.5 rounded-full text-on-surface-variant">
              {chambre.type}
            </span>
          )}
          {chambre.etage && (
            <span className="text-label-sm text-on-surface-variant/70">Étage {chambre.etage}</span>
          )}
          <span className="text-label-sm text-on-surface-variant/60">{chambre.nb_lits} lit(s)</span>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={onAddLits}
              className="inline-flex items-center gap-1 text-body-sm text-primary hover:opacity-70 transition-opacity">
              <AddOutlined style={{ fontSize: 15 }} /> Lits
            </button>
            <button type="button" onClick={removeChambre} title="Supprimer la chambre"
              className="text-on-surface-variant hover:text-error transition-colors">
              <DeleteOutlineOutlined style={{ fontSize: 17 }} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {detail?.lits.length ? (
          detail.lits.map((lit) => (
            <LitChip key={lit.id} lit={lit} canManage={canManage} onChanged={() => { load(); onMutate(); }} />
          ))
        ) : (
          <p className="text-body-sm text-on-surface-variant/60 italic">Aucun lit.</p>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function BedsPage() {
  const { can } = usePermissions();
  const canView = can("hosto.beds.view");
  const canManage = can("hosto.beds.manage");

  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [chambres, setChambres] = useState<ChambreListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newChambre, setNewChambre] = useState(false);
  const [addLitsChambre, setAddLitsChambre] = useState<ChambreListItem | null>(null);

  useEffect(() => {
    if (!canView) return;
    listServices()
      .then((s) => {
        setServices(s);
        if (s.length && serviceId == null) setServiceId(s[0].id);
      })
      .catch(() => setError("Impossible de charger les services."));
  }, [canView]);

  const load = useCallback(() => {
    if (serviceId == null) return;
    setLoading(true);
    setError(null);
    listChambres(serviceId)
      .then((p) => setChambres(p.items))
      .catch(() => setError("Impossible de charger les chambres."))
      .finally(() => setLoading(false));
  }, [serviceId]);

  useEffect(() => { load(); }, [load]);

  if (!canView) {
    return (
      <DashboardShell>
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
          <LockOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
          <p className="text-body-md text-on-surface-variant">Vous n&apos;avez pas accès à la cartographie des lits.</p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-md font-display text-on-surface flex items-center gap-2">
              <HotelOutlined style={{ fontSize: 26 }} /> Cartographie des lits
            </h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Chambres et lits par service. Le statut « occupé » est piloté par l&apos;admission des patients.
            </p>
          </div>
          {canManage && serviceId != null && (
            <button type="button" onClick={() => setNewChambre(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors">
              <AddOutlined style={{ fontSize: 18 }} /> Nouvelle chambre
            </button>
          )}
        </div>

        {/* Sélecteur de service */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={labelCls}>Service</span>
          <select
            value={serviceId ?? ""}
            onChange={(e) => setServiceId(Number(e.target.value))}
            className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.nom}</option>
            ))}
          </select>
        </div>

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-surface-container animate-pulse" />)}
          </div>
        ) : chambres.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-12 flex flex-col items-center gap-3 text-center">
            <MeetingRoomOutlined style={{ fontSize: 32 }} className="text-on-surface-variant/30" />
            <p className="text-body-md text-on-surface-variant">Aucune chambre dans ce service.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {chambres.map((c) => (
              <ChambreCard key={c.id} chambre={c} canManage={canManage} onMutate={load}
                onAddLits={() => setAddLitsChambre(c)} />
            ))}
          </div>
        )}
      </div>

      {newChambre && serviceId != null && (
        <CreateChambreDrawer serviceId={serviceId} onClose={() => setNewChambre(false)}
          onDone={() => { setNewChambre(false); load(); }} />
      )}
      {addLitsChambre && (
        <AddLitsDrawer chambre={addLitsChambre} onClose={() => setAddLitsChambre(null)}
          onDone={() => { setAddLitsChambre(null); load(); }} />
      )}
    </DashboardShell>
  );
}

// ─── Drawers ─────────────────────────────────────────────────────────────────
function CreateChambreDrawer({ serviceId, onClose, onDone }: {
  serviceId: number; onClose: () => void; onDone: () => void;
}) {
  const [numero, setNumero] = useState("");
  const [nom, setNom] = useState("");
  const [type, setType] = useState("");
  const [etage, setEtage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!numero.trim()) { setError("Le numéro est requis."); return; }
    setSaving(true); setError(null);
    try {
      await createChambre({
        service_id: serviceId, numero: numero.trim(),
        nom: nom.trim() || null, type: type || null, etage: etage.trim() || null,
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur.");
    } finally { setSaving(false); }
  }

  return (
    <RightDrawer title="Nouvelle chambre" onClose={onClose} width="md:w-[480px] md:max-w-[92vw]">
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Numéro <span className="text-error">*</span></label>
            <input className={inputCls} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Ex : 204, A-12" autoFocus />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Libellé</label>
            <input className={inputCls} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Chambre double vue jardin" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">—</option>
                {CHAMBRE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelCls}>Étage</label>
              <input className={inputCls} value={etage} onChange={(e) => setEtage(e.target.value)} placeholder="Ex : 2" />
            </div>
          </div>
          {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}
        </div>
        <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
          <button type="button" onClick={save} disabled={saving}
            className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50">
            {saving ? "Création…" : "Créer la chambre"}
          </button>
          <button type="button" onClick={onClose} disabled={saving}
            className="px-5 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50">
            Annuler
          </button>
        </div>
      </div>
    </RightDrawer>
  );
}

function AddLitsDrawer({ chambre, onClose, onDone }: {
  chambre: ChambreListItem; onClose: () => void; onDone: () => void;
}) {
  const [raw, setRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numeros = raw.split(",").map((x) => x.trim()).filter(Boolean);

  async function save() {
    if (numeros.length === 0) { setError("Indiquez au moins un numéro de lit."); return; }
    setSaving(true); setError(null);
    try {
      await createLitsBulk(chambre.id, numeros);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur.");
    } finally { setSaving(false); }
  }

  return (
    <RightDrawer title={`Ajouter des lits — Chambre ${chambre.numero}`} onClose={onClose} width="md:w-[480px] md:max-w-[92vw]">
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Numéros des lits</label>
            <input className={inputCls} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Ex : 1, 2, 3, 4" autoFocus />
            <p className="text-body-sm text-on-surface-variant/70">
              Séparés par des virgules. {numeros.length > 0 && `${numeros.length} lit(s) seront créés (statut LIBRE).`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[2, 4, 6].map((n) => (
              <button key={n} type="button"
                onClick={() => setRaw(Array.from({ length: n }, (_, i) => String(i + 1)).join(", "))}
                className="text-label-sm px-3 py-1 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors">
                {n} lits (1–{n})
              </button>
            ))}
          </div>
          {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}
        </div>
        <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
          <button type="button" onClick={save} disabled={saving}
            className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50">
            {saving ? "Création…" : "Créer les lits"}
          </button>
          <button type="button" onClick={onClose} disabled={saving}
            className="px-5 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50">
            Annuler
          </button>
        </div>
      </div>
    </RightDrawer>
  );
}
