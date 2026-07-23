"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getTiers,
  updateTiers,
  deactivateTiers,
  CATEGORIE_LABELS,
  type TiersDetail,
  type TiersUpdateInput,
} from "@/lib/tiers-api";
import { TiersAvatar, TypeBadge } from "../page";
import {
  ArrowBackOutlined,
  EditOutlined,
  ArchiveOutlined,
  UnarchiveOutlined,
} from "@mui/icons-material";

const FIELD =
  "w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary transition-colors disabled:bg-background disabled:text-on-surface-variant";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className={LABEL}>{label}</span>
      {children}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5">
      <h2 className="text-body-md font-semibold text-on-surface">{title}</h2>
      {description && <p className="text-label-md text-outline mt-0.5 mb-3">{description}</p>}
      <div className={description ? "space-y-4" : "space-y-4 mt-3"}>{children}</div>
    </section>
  );
}

export default function TiersDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermissions();
  const canEdit = can("tiers.tiers.manage");

  const [tiers, setTiers] = useState<TiersDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TiersUpdateInput>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getTiers(Number(id))
      .then((t) => {
        setTiers(t);
        setForm(toForm(t));
      })
      .catch(() => setError("Tiers introuvable."))
      .finally(() => setLoading(false));
  }, [id]);

  function toForm(t: TiersDetail): TiersUpdateInput {
    return {
      type: t.type,
      categorie: t.categorie,
      nom: t.nom,
      email: t.email ?? "",
      telephone: t.telephone ?? "",
      telephone2: t.telephone2 ?? "",
      adresse_ligne1: t.adresse_ligne1 ?? "",
      adresse_ville: t.adresse_ville ?? "",
      adresse_province: t.adresse_province ?? "",
      adresse_pays: t.adresse_pays ?? "",
      numero_contribuable: t.numero_contribuable ?? "",
      rccm: t.rccm ?? "",
      notes: t.notes ?? "",
    };
  }

  function set(field: keyof TiersUpdateInput, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nom?.toString().trim()) {
      setSaveError("Le nom est obligatoire.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === "" ? undefined : v])
      ) as TiersUpdateInput;
      const updated = await updateTiers(Number(id), payload);
      setTiers(updated);
      setForm(toForm(updated));
      setEditing(false);
      setToast("Fiche enregistrée.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    setSaving(true);
    try {
      await deactivateTiers(Number(id));
      setToast("Tiers archivé.");
      router.push("/tiers");
    } catch {
      setToast("Impossible d'archiver ce tiers.");
    } finally {
      setSaving(false);
      setConfirmArchive(false);
    }
  }

  /** Un tiers archivé doit pouvoir revenir : l'archivage n'est pas une suppression. */
  async function restore() {
    setSaving(true);
    try {
      const updated = await updateTiers(Number(id), { is_active: true });
      setTiers(updated);
      setToast("Tiers réactivé.");
    } catch {
      setToast("Impossible de réactiver ce tiers.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 text-body-md text-on-surface-variant">Chargement…</div>
      </DashboardShell>
    );
  }
  if (error || !tiers) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 text-body-md text-error">{error ?? "Tiers introuvable."}</div>
      </DashboardShell>
    );
  }

  const f = form as Record<string, string>;
  const entreprise = tiers.categorie === "ENTREPRISE";
  const nomLabel = entreprise ? "Raison sociale" : "Nom complet";

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
        <Link
          href="/tiers"
          className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
        >
          <ArrowBackOutlined style={{ fontSize: 15 }} />
          Tiers
        </Link>

        <div className="flex items-start gap-4 flex-wrap mb-5">
          <TiersAvatar tiers={tiers} size={48} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-headline-md text-on-surface truncate">{tiers.nom}</h1>
              <TypeBadge type={tiers.type} />
              {!tiers.is_active && (
                <span className="rounded-md bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-outline">
                  Archivé
                </span>
              )}
            </div>
            <p className="text-label-md text-outline mt-0.5">
              <span className="font-mono">{tiers.code}</span> ·{" "}
              {CATEGORIE_LABELS[tiers.categorie]}
            </p>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2.5">
              {tiers.is_active ? (
                <>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center gap-1.5 h-11 md:h-[38px] px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
                    >
                      <EditOutlined style={{ fontSize: 16 }} />
                      Modifier
                    </button>
                  )}
                  <button
                    onClick={() => setConfirmArchive(true)}
                    className="inline-flex items-center gap-1.5 h-11 md:h-[38px] px-3.5 rounded-lg text-body-sm font-semibold text-error hover:bg-error-container transition-colors"
                  >
                    <ArchiveOutlined style={{ fontSize: 16 }} />
                    Archiver
                  </button>
                </>
              ) : (
                <button
                  onClick={restore}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
                >
                  <UnarchiveOutlined style={{ fontSize: 16 }} />
                  Réactiver
                </button>
              )}
            </div>
          )}
        </div>

        {saveError && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2 mb-4">
            {saveError}
          </p>
        )}

        <form onSubmit={save} className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">
          <div className="space-y-5">
            <Section title="Identité">
              <Field label={nomLabel}>
                <input
                  type="text"
                  value={f.nom}
                  onChange={(e) => set("nom", e.target.value)}
                  disabled={!editing}
                  className={FIELD}
                  required
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Type">
                  <select
                    value={f.type}
                    onChange={(e) => set("type", e.target.value)}
                    disabled={!editing}
                    className={FIELD}
                  >
                    <option value="CLIENT">Client</option>
                    <option value="FOURNISSEUR">Fournisseur</option>
                    <option value="LES_DEUX">Client &amp; fournisseur</option>
                  </select>
                </Field>
                <Field label="Nature">
                  <select
                    value={f.categorie}
                    onChange={(e) => set("categorie", e.target.value)}
                    disabled={!editing}
                    className={FIELD}
                  >
                    <option value="ENTREPRISE">Entreprise</option>
                    <option value="PARTICULIER">Particulier</option>
                  </select>
                </Field>
              </div>
            </Section>

            <Section title="Contact">
              <Field label="Email">
                <input
                  type="email"
                  value={f.email}
                  onChange={(e) => set("email", e.target.value)}
                  disabled={!editing}
                  className={FIELD}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Téléphone">
                  <input
                    type="tel"
                    value={f.telephone}
                    onChange={(e) => set("telephone", e.target.value)}
                    disabled={!editing}
                    className={FIELD}
                  />
                </Field>
                <Field label="Téléphone secondaire">
                  <input
                    type="tel"
                    value={f.telephone2}
                    onChange={(e) => set("telephone2", e.target.value)}
                    disabled={!editing}
                    className={FIELD}
                  />
                </Field>
              </div>
            </Section>

            <Section title="Adresse">
              <Field label="Adresse">
                <input
                  type="text"
                  value={f.adresse_ligne1}
                  onChange={(e) => set("adresse_ligne1", e.target.value)}
                  disabled={!editing}
                  className={FIELD}
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Ville">
                  <input
                    type="text"
                    value={f.adresse_ville}
                    onChange={(e) => set("adresse_ville", e.target.value)}
                    disabled={!editing}
                    className={FIELD}
                  />
                </Field>
                <Field label="Province">
                  <input
                    type="text"
                    value={f.adresse_province}
                    onChange={(e) => set("adresse_province", e.target.value)}
                    disabled={!editing}
                    className={FIELD}
                  />
                </Field>
                <Field label="Pays">
                  <input
                    type="text"
                    value={f.adresse_pays}
                    onChange={(e) => set("adresse_pays", e.target.value)}
                    disabled={!editing}
                    className={FIELD}
                  />
                </Field>
              </div>
            </Section>

            {/* Identifiants légaux : sans objet pour un particulier. */}
            {entreprise && (
              <Section
                title="Informations légales"
                description="Identifiants d'entreprise repris sur les documents officiels."
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="N° contribuable (NIF)">
                    <input
                      type="text"
                      value={f.numero_contribuable}
                      onChange={(e) => set("numero_contribuable", e.target.value)}
                      disabled={!editing}
                      className={`${FIELD} font-mono`}
                    />
                  </Field>
                  <Field label="RCCM">
                    <input
                      type="text"
                      value={f.rccm}
                      onChange={(e) => set("rccm", e.target.value)}
                      disabled={!editing}
                      className={`${FIELD} font-mono`}
                    />
                  </Field>
                </div>
              </Section>
            )}

            <Section title="Notes">
              <textarea
                value={f.notes}
                onChange={(e) => set("notes", e.target.value)}
                disabled={!editing}
                rows={3}
                placeholder="Notes internes…"
                className={`${FIELD} resize-none`}
              />
            </Section>

            {editing && (
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setForm(toForm(tiers));
                    setSaveError(null);
                  }}
                  className="h-11 md:h-[38px] px-4 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 md:h-[38px] px-5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            )}
          </div>

          <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
            <MetaRow label="Code">
              <span className="font-mono text-body-sm text-on-surface">{tiers.code}</span>
            </MetaRow>
            <MetaRow label="Nature">
              <span className="text-body-sm text-on-surface">
                {CATEGORIE_LABELS[tiers.categorie]}
              </span>
            </MetaRow>
            <MetaRow label="Statut">
              <span
                className={`text-body-sm font-semibold ${
                  tiers.is_active ? "text-member-active" : "text-outline"
                }`}
              >
                {tiers.is_active ? "Actif" : "Archivé"}
              </span>
            </MetaRow>
            <MetaRow label="Créé le">
              <span className="text-body-sm text-on-surface">
                {new Date(tiers.created_at).toLocaleDateString("fr-FR")}
              </span>
            </MetaRow>
            <MetaRow label="Modifié le">
              <span className="text-body-sm text-on-surface">
                {new Date(tiers.updated_at).toLocaleDateString("fr-FR")}
              </span>
            </MetaRow>
          </aside>
        </form>

        {confirmArchive && (
          <ConfirmDialog
            title={`Archiver « ${tiers.nom} » ?`}
            message="Le tiers sortira du répertoire actif. Vous pourrez le réactiver depuis le filtre « Afficher les archivés »."
            confirmLabel="Archiver"
            busy={saving}
            onConfirm={archive}
            onCancel={() => setConfirmArchive(false)}
          />
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-body-sm text-on-surface-variant">{label}</span>
      {children}
    </div>
  );
}
