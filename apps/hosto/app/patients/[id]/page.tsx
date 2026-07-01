"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { DashboardShell } from "@/components/DashboardShell";
import { getPatient, updatePatient, deletePatient, type Patient } from "@/app/lib/api";
import {
  ArrowBackOutlined,
  BadgeOutlined,
  CakeOutlined,
  DeleteOutlined,
  EditOutlined,
  HomeOutlined,
  LocalHospitalOutlined,
  PersonOutlined,
  PhoneOutlined,
  EmailOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";

const SEXE_LABEL: Record<string, string> = { M: "Masculin", F: "Féminin", A: "Autre" };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-label-md text-on-surface-variant">{label}</span>
      <span className="text-body-md text-on-surface">{value || "—"}</span>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-label-md font-medium text-on-surface-variant">
        {label}
        {required && <span className="text-error ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Section({
  title,
  icon,
  onEdit,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onEdit?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant bg-surface-container-low">
        <div className="flex items-center gap-2">
          <span className="text-on-surface-variant">{icon}</span>
          <h2 className="text-body-md font-semibold text-on-surface">{title}</h2>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-lg hover:bg-primary/8"
            title="Modifier"
          >
            <EditOutlined style={{ fontSize: 18 }} />
          </button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

type DrawerType = "identite" | "naissance" | "adresse" | null;

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = usePermissions();
  const canView = can("hosto.patients.view");
  const canManage = can("hosto.patients.manage");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [drawer, setDrawer] = useState<DrawerType>(null);
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Local form state per drawer — reset when drawer opens
  const [formIdentite, setFormIdentite] = useState({
    nom: "", postnom: "", prenom: "", sexe: "", date_naissance: "",
  });
  const [formNaissance, setFormNaissance] = useState({
    lieu_naissance_ville: "", lieu_naissance_province: "", lieu_naissance_pays: "",
  });
  const [formAdresse, setFormAdresse] = useState({
    adresse_ligne1: "", adresse_quartier: "", adresse_ville: "", adresse_province: "", adresse_pays: "",
  });

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    getPatient(Number(id))
      .then(setPatient)
      .catch(() => setError("Patient introuvable ou inaccessible."))
      .finally(() => setLoading(false));
  }, [id, canView]);

  function openDrawer(type: DrawerType) {
    if (!patient) return;
    setDrawerError(null);
    if (type === "identite") {
      setFormIdentite({
        nom: patient.nom,
        postnom: patient.postnom,
        prenom: patient.prenom,
        sexe: patient.sexe,
        date_naissance: patient.date_naissance,
      });
    } else if (type === "naissance") {
      setFormNaissance({
        lieu_naissance_ville: patient.lieu_naissance_ville,
        lieu_naissance_province: patient.lieu_naissance_province ?? "",
        lieu_naissance_pays: patient.lieu_naissance_pays,
      });
    } else if (type === "adresse") {
      setFormAdresse({
        adresse_ligne1: patient.adresse_ligne1 ?? "",
        adresse_quartier: patient.adresse_quartier ?? "",
        adresse_ville: patient.adresse_ville ?? "",
        adresse_province: patient.adresse_province ?? "",
        adresse_pays: patient.adresse_pays ?? "",
      });
    }
    setDrawer(type);
  }

  async function saveDrawer(data: Record<string, string>) {
    if (!patient) return;
    setSaving(true);
    setDrawerError(null);
    try {
      const updated = await updatePatient(patient.id, data);
      setPatient(updated);
      setDrawer(null);
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deletePatient(Number(id));
      router.push("/");
    } catch {
      setError("Impossible de supprimer le patient.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <DashboardShell>
      <div className="p-8 max-w-4xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <Link href="/" className="text-on-surface-variant hover:text-on-surface transition-colors">
            <ArrowBackOutlined style={{ fontSize: 20 }} />
          </Link>
          <div className="flex-1 min-w-0">
            {patient ? (
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-headline-md font-display text-on-surface truncate">
                  {patient.nom} {patient.postnom} {patient.prenom}
                </h1>
                <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-mono bg-surface-container text-on-surface-variant border border-outline-variant">
                  <BadgeOutlined style={{ fontSize: 13 }} />
                  {patient.dossier_number}
                </span>
              </div>
            ) : (
              <h1 className="text-headline-md font-display text-on-surface">Dossier patient</h1>
            )}
          </div>
          {canManage && patient && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-body-sm text-on-surface-variant border border-outline-variant hover:border-error hover:text-error transition-colors"
            >
              <DeleteOutlined style={{ fontSize: 16 }} />
              Supprimer
            </button>
          )}
        </div>

        {/* ── Confirm delete ── */}
        {confirmDelete && (
          <div className="flex items-center gap-3 rounded-xl border border-error/40 bg-error-container/30 px-4 py-3">
            <WarningAmberOutlined style={{ fontSize: 18 }} className="text-error shrink-0" />
            <p className="text-body-sm text-on-surface flex-1">
              Confirmer la suppression de ce dossier ? Cette action est irréversible.
            </p>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setConfirmDelete(false)} disabled={deleting}
                className="px-3 py-1.5 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50">
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-3 py-1.5 rounded-lg text-body-sm bg-error text-white hover:opacity-90 disabled:opacity-50">
                {deleting ? "Suppression…" : "Confirmer"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}

        {loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {!loading && !error && patient && (
          <>
            {/* ── Identité ── */}
            <Section
              title="Identité"
              icon={<PersonOutlined style={{ fontSize: 18 }} />}
              onEdit={canManage ? () => openDrawer("identite") : undefined}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <Field label="Nom" value={patient.nom} />
                <Field label="Post-nom" value={patient.postnom} />
                <Field label="Prénom" value={patient.prenom} />
                <Field label="Sexe" value={SEXE_LABEL[patient.sexe] ?? patient.sexe} />
                <div className="flex flex-col gap-0.5">
                  <span className="text-label-md text-on-surface-variant flex items-center gap-1">
                    <CakeOutlined style={{ fontSize: 14 }} />
                    Date de naissance
                  </span>
                  <span className="text-body-md text-on-surface">{formatDate(patient.date_naissance)}</span>
                </div>
              </div>
            </Section>

            {/* ── Lieu de naissance ── */}
            <Section
              title="Lieu de naissance"
              icon={<LocalHospitalOutlined style={{ fontSize: 18 }} />}
              onEdit={canManage ? () => openDrawer("naissance") : undefined}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <Field label="Ville" value={patient.lieu_naissance_ville} />
                <Field label="Province" value={patient.lieu_naissance_province} />
                <Field label="Pays" value={patient.lieu_naissance_pays} />
              </div>
            </Section>

            {/* ── Adresse ── */}
            <Section
              title="Adresse"
              icon={<HomeOutlined style={{ fontSize: 18 }} />}
              onEdit={canManage ? () => openDrawer("adresse") : undefined}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                <div className="sm:col-span-3">
                  <Field label="Ligne 1" value={patient.adresse_ligne1} />
                </div>
                <Field label="Quartier / Commune" value={patient.adresse_quartier} />
                <Field label="Ville" value={patient.adresse_ville} />
                <Field label="Province" value={patient.adresse_province} />
                <Field label="Pays" value={patient.adresse_pays} />
              </div>
            </Section>

            {/* ── Contacts ── */}
            <Section
              title={`Contacts (${patient.contacts.length})`}
              icon={<PhoneOutlined style={{ fontSize: 18 }} />}
            >
              {patient.contacts.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant italic">Aucun contact enregistré.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {patient.contacts.map((contact) => (
                    <div key={contact.id}
                      className="rounded-xl border border-outline-variant bg-surface-container-low p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-body-md font-semibold text-on-surface">{contact.full_name}</p>
                          <p className="text-body-sm text-on-surface-variant">{contact.relation}</p>
                        </div>
                        <div className="flex flex-col gap-1 items-end shrink-0">
                          {contact.is_primary && (
                            <span className="text-label-sm px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">
                              Principal
                            </span>
                          )}
                          {contact.is_emergency && (
                            <span className="text-label-sm px-2 py-0.5 rounded-full bg-error/10 text-error">
                              Urgence
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                            <PhoneOutlined style={{ fontSize: 14 }} />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                            <EmailOutlined style={{ fontSize: 14 }} />
                            <span>{contact.email}</span>
                          </div>
                        )}
                        {contact.adresse && (
                          <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                            <HomeOutlined style={{ fontSize: 14 }} />
                            <span>{contact.adresse}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <div className="text-label-sm text-on-surface-variant text-right">
              Enregistré le {formatDate(patient.created_at)}
              {patient.updated_at !== patient.created_at && (
                <> · Modifié le {formatDate(patient.updated_at)}</>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Drawer Identité ── */}
      {drawer === "identite" && (
        <RightDrawer title="Modifier l'identité" onClose={() => setDrawer(null)} width="w-[480px] max-w-full">
          <form
            className="h-full flex flex-col"
            onSubmit={(e) => { e.preventDefault(); saveDrawer(formIdentite); }}
          >
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Nom" required>
                  <input className={inputCls} value={formIdentite.nom} required
                    onChange={(e) => setFormIdentite((f) => ({ ...f, nom: e.target.value }))} />
                </FormField>
                <FormField label="Post-nom" required>
                  <input className={inputCls} value={formIdentite.postnom} required
                    onChange={(e) => setFormIdentite((f) => ({ ...f, postnom: e.target.value }))} />
                </FormField>
                <FormField label="Prénom" required>
                  <input className={inputCls} value={formIdentite.prenom} required
                    onChange={(e) => setFormIdentite((f) => ({ ...f, prenom: e.target.value }))} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Sexe" required>
                  <select className={inputCls} value={formIdentite.sexe} required
                    onChange={(e) => setFormIdentite((f) => ({ ...f, sexe: e.target.value }))}>
                    <option value="">Sélectionner…</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="A">Autre</option>
                  </select>
                </FormField>
                <FormField label="Date de naissance" required>
                  <input type="date" className={inputCls} value={formIdentite.date_naissance} required
                    onChange={(e) => setFormIdentite((f) => ({ ...f, date_naissance: e.target.value }))} />
                </FormField>
              </div>
              {drawerError && (
                <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">{drawerError}</p>
              )}
            </div>
            <DrawerFooter onCancel={() => setDrawer(null)} saving={saving} />
          </form>
        </RightDrawer>
      )}

      {/* ── Drawer Lieu de naissance ── */}
      {drawer === "naissance" && (
        <RightDrawer title="Modifier le lieu de naissance" onClose={() => setDrawer(null)} width="w-[480px] max-w-full">
          <form
            className="h-full flex flex-col"
            onSubmit={(e) => { e.preventDefault(); saveDrawer(formNaissance); }}
          >
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <FormField label="Ville" required>
                  <input className={inputCls} value={formNaissance.lieu_naissance_ville} required
                    onChange={(e) => setFormNaissance((f) => ({ ...f, lieu_naissance_ville: e.target.value }))} />
                </FormField>
                <FormField label="Province">
                  <input className={inputCls} value={formNaissance.lieu_naissance_province}
                    onChange={(e) => setFormNaissance((f) => ({ ...f, lieu_naissance_province: e.target.value }))} />
                </FormField>
                <FormField label="Pays" required>
                  <input className={inputCls} value={formNaissance.lieu_naissance_pays} required
                    onChange={(e) => setFormNaissance((f) => ({ ...f, lieu_naissance_pays: e.target.value }))} />
                </FormField>
              </div>
              {drawerError && (
                <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">{drawerError}</p>
              )}
            </div>
            <DrawerFooter onCancel={() => setDrawer(null)} saving={saving} />
          </form>
        </RightDrawer>
      )}

      {/* ── Drawer Adresse ── */}
      {drawer === "adresse" && (
        <RightDrawer title="Modifier l'adresse" onClose={() => setDrawer(null)} width="w-[480px] max-w-full">
          <form
            className="h-full flex flex-col"
            onSubmit={(e) => { e.preventDefault(); saveDrawer(formAdresse); }}
          >
            <div className="flex-1 overflow-y-auto space-y-4">
              <FormField label="Adresse (ligne 1)">
                <input className={inputCls} value={formAdresse.adresse_ligne1}
                  onChange={(e) => setFormAdresse((f) => ({ ...f, adresse_ligne1: e.target.value }))} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Quartier / Commune">
                  <input className={inputCls} value={formAdresse.adresse_quartier}
                    onChange={(e) => setFormAdresse((f) => ({ ...f, adresse_quartier: e.target.value }))} />
                </FormField>
                <FormField label="Ville">
                  <input className={inputCls} value={formAdresse.adresse_ville}
                    onChange={(e) => setFormAdresse((f) => ({ ...f, adresse_ville: e.target.value }))} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Province">
                  <input className={inputCls} value={formAdresse.adresse_province}
                    onChange={(e) => setFormAdresse((f) => ({ ...f, adresse_province: e.target.value }))} />
                </FormField>
                <FormField label="Pays">
                  <input className={inputCls} value={formAdresse.adresse_pays}
                    onChange={(e) => setFormAdresse((f) => ({ ...f, adresse_pays: e.target.value }))} />
                </FormField>
              </div>
              {drawerError && (
                <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">{drawerError}</p>
              )}
            </div>
            <DrawerFooter onCancel={() => setDrawer(null)} saving={saving} />
          </form>
        </RightDrawer>
      )}
    </DashboardShell>
  );
}

function DrawerFooter({ onCancel, saving }: { onCancel: () => void; saving: boolean }) {
  return (
    <div className="shrink-0 flex items-center justify-end gap-3 pt-4 mt-4 border-t border-outline-variant">
      <button type="button" onClick={onCancel} disabled={saving}
        className="px-4 py-2 rounded-xl text-body-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50">
        Annuler
      </button>
      <button type="submit" disabled={saving}
        className="px-6 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors disabled:opacity-50">
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}
