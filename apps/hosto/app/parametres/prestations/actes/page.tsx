"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { DashboardShell } from "@/components/DashboardShell";
import {
  AddOutlined,
  ArrowBackOutlined,
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  PaymentsOutlined,
  RestartAltOutlined,
  SearchOutlined,
  StorefrontOutlined,
  SyncOutlined,
  VisibilityOffOutlined,
} from "@mui/icons-material";
import {
  listActeCatalog,
  getActeCatalogDetail,
  upsertActeOverride,
  deleteActeOverride,
  createActe,
  updateActe,
  deleteActe,
  syncActeProduits,
  type ActeCatalogItem,
  type ActeType,
} from "@/app/lib/actes-api";

const TYPE_LABEL: Record<ActeType, string> = {
  MEDICAL: "Médical",
  INFIRMIER: "Infirmier",
  AUTRE: "Autre",
};

const TYPE_FILTERS: { key: "all" | ActeType; label: string }[] = [
  { key: "all", label: "Tous" },
  { key: "MEDICAL", label: "Médical" },
  { key: "INFIRMIER", label: "Infirmier" },
];

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";
const labelCls = "text-label-md font-medium text-on-surface-variant";

// ─── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 accent-primary cursor-pointer shrink-0"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <span className="text-body-md text-on-surface">{label}</span>
        {hint && <span className="block text-body-sm text-on-surface-variant mt-0.5">{hint}</span>}
      </span>
    </label>
  );
}

// ─── Edit drawer ───────────────────────────────────────────────────────────────

function EditDrawer({
  acte,
  canManage,
  onClose,
  onSaved,
}: {
  acte: ActeCatalogItem;
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [globalName, setGlobalName] = useState("");
  const [libelleLocal, setLibelleLocal] = useState("");
  const [active, setActive] = useState(true);
  const [bloquant, setBloquant] = useState(false);
  const [hasOverride, setHasOverride] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getActeCatalogDetail(acte.id)
      .then((d) => {
        setGlobalName(d.name);
        setLibelleLocal(d.libelle !== d.name ? d.libelle : "");
        setActive(d.active);
        setBloquant(d.paiement_bloquant);
        setHasOverride(d.has_override);
      })
      .catch(() => setError("Impossible de charger l'acte."))
      .finally(() => setLoading(false));
  }, [acte.id]);

  async function handleSave() {
    setSubmitting(true);
    setError(null);
    try {
      await upsertActeOverride(acte.id, {
        libelle_local: libelleLocal.trim() || null,
        active,
        paiement_bloquant: bloquant,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    setSubmitting(true);
    setError(null);
    try {
      await deleteActeOverride(acte.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la réinitialisation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title="Personnaliser l'acte" onClose={onClose} width="w-[520px] max-w-full">
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-surface-container" />
          ))}
        </div>
      ) : (
        <div className="h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1 space-y-5">
            <div className="rounded-xl bg-surface-container px-4 py-3">
              <p className="text-body-md font-semibold text-on-surface">{globalName}</p>
              <p className="text-body-sm text-on-surface-variant mt-0.5">
                {acte.category ?? "—"} · {TYPE_LABEL[acte.acte_type]}
                {acte.ichi_code && <span className="ml-2 font-mono">{acte.ichi_code}</span>}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelCls}>Libellé local</label>
              <input
                className={inputCls}
                value={libelleLocal}
                onChange={(e) => setLibelleLocal(e.target.value)}
                placeholder={globalName}
                disabled={!canManage}
              />
              <p className="text-body-sm text-on-surface-variant/70">
                Laissez vide pour utiliser le libellé standard.
              </p>
            </div>

            <Toggle
              checked={active}
              onChange={setActive}
              label="Acte pratiqué dans cet établissement"
              hint="Décochez pour le masquer de la prescription."
            />

            <Toggle
              checked={bloquant}
              onChange={setBloquant}
              label="Paiement requis avant réalisation"
              hint="L'acte ne pourra être réalisé qu'une fois payé (facturation immédiate à la prescription)."
            />

            {error && (
              <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3" role="alert">
                {error}
              </p>
            )}
          </div>

          {canManage && (
            <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50"
              >
                {submitting ? "Enregistrement…" : "Enregistrer"}
              </button>
              {hasOverride && (
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={submitting}
                  title="Revenir aux valeurs standard"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant text-body-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
                >
                  <RestartAltOutlined style={{ fontSize: 16 }} />
                  Réinitialiser
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </RightDrawer>
  );
}

// ─── Champs custom (création / édition d'un acte propre) ──────────────────────

const TYPE_OPTIONS: { value: ActeType; label: string }[] = [
  { value: "MEDICAL", label: "Médical" },
  { value: "INFIRMIER", label: "Infirmier" },
  { value: "AUTRE", label: "Autre" },
];

interface CustomForm {
  name: string;
  acte_type: ActeType;
  category: string;
  short_name: string;
  paiement_bloquant: boolean;
  active: boolean;
}

function CustomFields({
  form,
  onChange,
  showActive,
}: {
  form: CustomForm;
  onChange: (p: Partial<CustomForm>) => void;
  showActive?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className={labelCls}>
          Nom de l&apos;acte <span className="text-error">*</span>
        </label>
        <input
          className={inputCls}
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Ex : Pose de PICC line"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Type</label>
          <select
            className={inputCls}
            value={form.acte_type}
            onChange={(e) => onChange({ acte_type: e.target.value as ActeType })}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelCls}>Catégorie</label>
          <input
            className={inputCls}
            value={form.category}
            onChange={(e) => onChange({ category: e.target.value })}
            placeholder="Ex : Petite chirurgie"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className={labelCls}>Abréviation</label>
        <input
          className={inputCls}
          value={form.short_name}
          onChange={(e) => onChange({ short_name: e.target.value })}
          placeholder="Optionnel"
        />
      </div>
      <Toggle
        checked={form.paiement_bloquant}
        onChange={(v) => onChange({ paiement_bloquant: v })}
        label="Paiement requis avant réalisation"
        hint="L'acte ne pourra être réalisé qu'une fois payé."
      />
      {showActive && (
        <Toggle
          checked={form.active}
          onChange={(v) => onChange({ active: v })}
          label="Acte actif"
          hint="Décochez pour le retirer de la prescription."
        />
      )}
    </div>
  );
}

function CreateActeDrawer({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CustomForm>({
    name: "",
    acte_type: "MEDICAL",
    category: "",
    short_name: "",
    paiement_bloquant: false,
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Le nom de l'acte est requis.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createActe({
        name: form.name.trim(),
        acte_type: form.acte_type,
        category: form.category.trim() || null,
        short_name: form.short_name.trim() || null,
        paiement_bloquant: form.paiement_bloquant,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title="Nouvel acte" onClose={onClose} width="w-[520px] max-w-full">
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-1 space-y-5">
          <p className="text-body-sm text-on-surface-variant">
            Cet acte sera propre à votre établissement et n&apos;affectera pas les autres.
          </p>
          <CustomFields form={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
          {error && (
            <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {submitting ? "Création…" : "Créer l'acte"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2 rounded-xl text-body-md text-on-surface-variant border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
        </div>
      </div>
    </RightDrawer>
  );
}

function CustomEditDrawer({
  acte,
  canManage,
  onClose,
  onSaved,
}: {
  acte: ActeCatalogItem;
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CustomForm>({
    name: "",
    acte_type: "MEDICAL",
    category: "",
    short_name: "",
    paiement_bloquant: false,
    active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getActeCatalogDetail(acte.id)
      .then((d) =>
        setForm({
          name: d.name,
          acte_type: d.acte_type,
          category: d.category ?? "",
          short_name: d.short_name ?? "",
          paiement_bloquant: d.paiement_bloquant,
          active: d.active,
        }),
      )
      .catch(() => setError("Impossible de charger l'acte."))
      .finally(() => setLoading(false));
  }, [acte.id]);

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Le nom de l'acte est requis.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await updateActe(acte.id, {
        name: form.name.trim(),
        acte_type: form.acte_type,
        category: form.category.trim() || null,
        short_name: form.short_name.trim() || null,
        paiement_bloquant: form.paiement_bloquant,
        active: form.active,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    try {
      await deleteActe(acte.id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title="Modifier l'acte" onClose={onClose} width="w-[520px] max-w-full">
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-surface-container" />
          ))}
        </div>
      ) : (
        <div className="h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1 space-y-5">
            <span className="inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-medium">
              <StorefrontOutlined style={{ fontSize: 12 }} />
              Propre à l&apos;établissement
            </span>
            <CustomFields
              form={form}
              onChange={(p) => setForm((f) => ({ ...f, ...p }))}
              showActive
            />
            {error && (
              <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3" role="alert">
                {error}
              </p>
            )}
          </div>
          {canManage && (
            <div className="shrink-0 flex gap-3 pt-4 border-t border-outline-variant">
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="flex-1 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50"
              >
                {submitting ? "Enregistrement…" : "Enregistrer"}
              </button>
              {confirmDelete ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-error text-on-error text-body-md hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <DeleteOutlined style={{ fontSize: 16 }} />
                  Confirmer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={submitting}
                  title="Supprimer l'acte"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-error/40 text-error text-body-md hover:bg-error/8 transition-colors disabled:opacity-50"
                >
                  <DeleteOutlined style={{ fontSize: 16 }} />
                  Supprimer
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </RightDrawer>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ActesCatalogPage() {
  const { can } = usePermissions();
  const canView = can("hosto.actes.view");
  const canManage = can("hosto.actes.manage");

  const [items, setItems] = useState<ActeCatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ActeType>("all");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [editing, setEditing] = useState<ActeCatalogItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    listActeCatalog({
      type: typeFilter === "all" ? undefined : typeFilter,
      include_inactive: includeInactive,
      page,
      per_page: 25,
    })
      .then((res) => {
        setItems(res.items);
        setTotal(res.total);
        setPages(res.pages);
      })
      .catch(() => setError("Impossible de charger le catalogue d'actes."))
      .finally(() => setLoading(false));
  }, [canView, typeFilter, includeInactive, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await syncActeProduits();
      setSyncMsg(`${res.synced}/${res.total} actes synchronisés avec Facturation.`);
    } catch {
      setSyncMsg("Échec de la synchronisation.");
    } finally {
      setSyncing(false);
    }
  }

  const term = search.trim().toLowerCase();
  const visible = term
    ? items.filter(
        (a) =>
          a.libelle.toLowerCase().includes(term) ||
          (a.category ?? "").toLowerCase().includes(term) ||
          (a.ichi_code ?? "").toLowerCase().includes(term),
      )
    : items;

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <Link
          href="/parametres/prestations"
          className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} /> Retour aux prestations
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Actes médicaux</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Catalogue des actes et soins infirmiers. Personnalisez le libellé, l&apos;activation
              et le régime de paiement pour votre établissement.
            </p>
          </div>
          {canManage && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                <SyncOutlined style={{ fontSize: 16 }} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Synchronisation…" : "Synchroniser avec Facturation"}
              </button>
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-on-primary text-body-sm font-medium hover:bg-primary-container transition-colors"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                Nouvel acte
              </button>
            </div>
          )}
        </div>

        {syncMsg && (
          <p className="text-body-sm text-secondary bg-secondary/8 rounded-xl px-4 py-3">{syncMsg}</p>
        )}

        {!canView ? (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission de consulter les actes.
          </p>
        ) : (
          <>
            {/* Filtres */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <SearchOutlined
                  style={{ fontSize: 18 }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 pointer-events-none"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un acte, une catégorie…"
                  className={`${inputCls} pl-9`}
                />
              </div>
              <div className="flex rounded-xl border border-outline-variant overflow-hidden">
                {TYPE_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => {
                      setTypeFilter(f.key);
                      setPage(1);
                    }}
                    className={`px-3 py-2 text-body-sm transition-colors ${
                      typeFilter === f.key
                        ? "bg-primary text-on-primary"
                        : "text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary cursor-pointer"
                  checked={includeInactive}
                  onChange={(e) => {
                    setIncludeInactive(e.target.checked);
                    setPage(1);
                  }}
                />
                Inclure les inactifs
              </label>
            </div>

            {error && (
              <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
            )}

            {/* Liste */}
            {loading ? (
              <div className="space-y-2" aria-busy>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 rounded-2xl bg-surface-container animate-pulse" />
                ))}
              </div>
            ) : visible.length === 0 ? (
              <p className="px-5 py-8 text-body-sm text-on-surface-variant text-center rounded-2xl border border-outline-variant bg-surface-container-lowest">
                {term ? `Aucun acte pour « ${search} ».` : "Aucun acte."}
              </p>
            ) : (
              <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant overflow-hidden">
                {visible.map((a) => (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-body-md font-medium text-on-surface ${!a.active ? "line-through opacity-60" : ""}`}>
                          {a.libelle}
                        </span>
                        {a.is_custom && (
                          <span className="inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full bg-secondary/10 text-secondary font-medium">
                            <StorefrontOutlined style={{ fontSize: 12 }} />
                            Propre à l&apos;établissement
                          </span>
                        )}
                        {a.paiement_bloquant && (
                          <span className="inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary font-medium">
                            <PaymentsOutlined style={{ fontSize: 12 }} />
                            Paiement requis
                          </span>
                        )}
                        {a.has_override && !a.is_custom && (
                          <span className="text-label-sm px-2 py-0.5 rounded-full bg-primary/8 text-primary font-medium">
                            Personnalisé
                          </span>
                        )}
                        {!a.active && (
                          <span className="inline-flex items-center gap-1 text-label-sm px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                            <VisibilityOffOutlined style={{ fontSize: 12 }} />
                            Non pratiqué
                          </span>
                        )}
                      </div>
                      <p className="text-body-sm text-on-surface-variant mt-0.5">
                        {a.category ?? "—"} · {TYPE_LABEL[a.acte_type]}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(a)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-body-sm text-on-surface-variant hover:text-primary hover:bg-primary/8 transition-colors shrink-0"
                    >
                      {canManage ? <EditOutlined style={{ fontSize: 15 }} /> : <LockOutlined style={{ fontSize: 15 }} />}
                      {canManage ? "Modifier" : "Voir"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && !term && pages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-body-sm text-on-surface-variant">{total} actes</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
                  >
                    Précédent
                  </button>
                  <span className="text-body-sm text-on-surface-variant">
                    {page} / {pages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    disabled={page >= pages}
                    className="px-3 py-1.5 rounded-xl border border-outline-variant text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {editing &&
        (editing.is_custom ? (
          <CustomEditDrawer
            acte={editing}
            canManage={canManage}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        ) : (
          <EditDrawer
            acte={editing}
            canManage={canManage}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        ))}

      {creating && (
        <CreateActeDrawer
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </DashboardShell>
  );
}
