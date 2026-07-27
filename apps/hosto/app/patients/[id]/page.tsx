"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { Accordion } from "@repo/ui/Accordion";
import { DashboardShell } from "@/components/DashboardShell";
import { getPatient, updatePatient, archivePatient, type Patient } from "@/app/lib/api";
import {
  ArchiveOutlined,
  ArrowBackOutlined,
  BadgeOutlined,
  BloodtypeOutlined,
  CakeOutlined,
  EditOutlined,
  HistoryOutlined,
  EmailOutlined,
  ExpandMoreOutlined,
  HomeOutlined,
  LocalHospitalOutlined,
  LockOutlined,
  MedicalInformationOutlined,
  MonitorWeightOutlined,
  PersonOutlined,
  PhoneOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const SEXE_LABEL: Record<string, string> = { M: "Masculin", F: "Féminin", A: "Autre" };
const GROUPE_OPTIONS = ["A", "B", "AB", "O"];
const RHESUS_OPTIONS = ["+", "-"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function calcAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ─────────────────────────────────────────────
// Small shared components
// ─────────────────────────────────────────────

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

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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
  title, icon, onEdit, children,
}: {
  title: string; icon: React.ReactNode; onEdit?: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant bg-surface-container-low">
        <div className="flex items-center gap-2">
          <span className="text-on-surface-variant">{icon}</span>
          <h2 className="text-body-md font-semibold text-on-surface">{title}</h2>
        </div>
        {onEdit && (
          <button onClick={onEdit}
            className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-lg hover:bg-primary/8"
            title="Modifier">
            <EditOutlined style={{ fontSize: 18 }} />
          </button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
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

// ─────────────────────────────────────────────
// Tab dropdown
// ─────────────────────────────────────────────

interface TabDef {
  id: string;
  label: string;
  permission: string;
}

const TABS: TabDef[] = [
  { id: "info_general",  label: "Info Général",       permission: "hosto.patients.view" },
  { id: "contacts",      label: "Contacts",            permission: "hosto.patients.view" },
  { id: "couverture",    label: "Couverture Médicale", permission: "hosto.patients.insurance" },
];

function TabDropdown({
  activeTab, onSelect, canAccess,
}: {
  activeTab: string; onSelect: (id: string) => void; canAccess: (p: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md font-medium text-on-surface hover:bg-surface-container transition-colors min-w-[200px] justify-between"
      >
        <span>{active.label}</span>
        <ExpandMoreOutlined style={{ fontSize: 18, transition: "transform .15s", transform: open ? "rotate(180deg)" : "rotate(0)" }} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-30 min-w-[220px] rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-lg overflow-hidden py-1">
          {TABS.map((tab) => {
            const accessible = canAccess(tab.permission);
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                disabled={!accessible}
                onClick={() => { if (accessible) { onSelect(tab.id); setOpen(false); } }}
                className={[
                  "w-full flex items-center justify-between px-4 py-2.5 text-body-md text-left transition-colors",
                  isActive
                    ? "bg-primary/8 text-primary font-medium"
                    : accessible
                      ? "text-on-surface hover:bg-surface-container"
                      : "text-on-surface-variant/50 cursor-not-allowed",
                ].join(" ")}
              >
                <span>{tab.label}</span>
                {!accessible && <LockOutlined style={{ fontSize: 15 }} className="text-on-surface-variant/40" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Drawer types
// ─────────────────────────────────────────────

type DrawerType = "identite" | "naissance" | "adresse" | "medical" | null;

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can } = usePermissions();

  const canView    = can("hosto.patients.view");
  const canManage  = can("hosto.patients.manage");
  const canMedical = can("hosto.patients.medical");
  const canEMR     = can("hosto.emr.view");

  const [patient, setPatient]       = useState<Patient | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving]   = useState(false);

  const [drawer, setDrawer]         = useState<DrawerType>(null);
  const [saving, setSaving]         = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const rawTab = searchParams.get("tab") ?? "info_general";
  const activeTab = TABS.some((t) => t.id === rawTab) ? rawTab : "info_general";

  function setTab(tab: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  // ── Form state ──
  const [formIdentite, setFormIdentite] = useState({ nom: "", postnom: "", prenom: "", sexe: "", date_naissance: "" });
  const [formNaissance, setFormNaissance] = useState({ lieu_naissance_ville: "", lieu_naissance_province: "", lieu_naissance_pays: "" });
  const [formAdresse, setFormAdresse] = useState({ adresse_ligne1: "", adresse_quartier: "", adresse_ville: "", adresse_province: "", adresse_pays: "" });
  const [formMedical, setFormMedical] = useState({ groupe_sanguin: "", rhesus: "", derniere_tension: "", dernier_poids: "" });

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
      setFormIdentite({ nom: patient.nom, postnom: patient.postnom, prenom: patient.prenom, sexe: patient.sexe, date_naissance: patient.date_naissance });
    } else if (type === "naissance") {
      setFormNaissance({ lieu_naissance_ville: patient.lieu_naissance_ville, lieu_naissance_province: patient.lieu_naissance_province ?? "", lieu_naissance_pays: patient.lieu_naissance_pays });
    } else if (type === "adresse") {
      setFormAdresse({ adresse_ligne1: patient.adresse_ligne1 ?? "", adresse_quartier: patient.adresse_quartier ?? "", adresse_ville: patient.adresse_ville ?? "", adresse_province: patient.adresse_province ?? "", adresse_pays: patient.adresse_pays ?? "" });
    } else if (type === "medical") {
      setFormMedical({ groupe_sanguin: patient.groupe_sanguin ?? "", rhesus: patient.rhesus ?? "", derniere_tension: patient.derniere_tension ?? "", dernier_poids: patient.dernier_poids ?? "" });
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

  async function handleArchive() {
    setArchiving(true);
    try {
      await archivePatient(Number(id));
      router.push("/");
    } catch {
      setError("Impossible d'archiver le patient.");
      setArchiving(false);
      setConfirmArchive(false);
    }
  }

  // ─────────────────────────────────────────────
  return (
    <DashboardShell>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">

        {/* ── Nav header ── */}
        <div className="flex items-center gap-2">
          <Link href="/" className="text-on-surface-variant hover:text-on-surface transition-colors">
            <ArrowBackOutlined style={{ fontSize: 20 }} />
          </Link>
          <span className="text-body-sm text-on-surface-variant">Patients</span>
          <span className="text-on-surface-variant/40 text-body-sm">/</span>
          {patient && (
            <span className="text-body-sm text-on-surface truncate">
              {patient.nom} {patient.postnom} {patient.prenom}
            </span>
          )}
        </div>

        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>}
        {loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {!loading && !error && patient && (
          <>
            {/* ══════════════════════════════════════════
                PATIENT CARD
            ══════════════════════════════════════════ */}
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">

              {/* Top band */}
              <div className="px-6 pt-5 pb-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-headline-sm font-display text-on-surface">
                      {patient.nom} {patient.postnom} {patient.prenom}
                    </h1>
                    <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-mono bg-surface-container text-on-surface-variant border border-outline-variant">
                      <BadgeOutlined style={{ fontSize: 12 }} />
                      {patient.dossier_number}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 flex-wrap text-body-sm text-on-surface-variant">
                    <span className="flex items-center gap-1.5">
                      <PersonOutlined style={{ fontSize: 15 }} />
                      {SEXE_LABEL[patient.sexe] ?? patient.sexe}
                    </span>
                    <span className="text-on-surface-variant/30">·</span>
                    <span className="flex items-center gap-1.5">
                      <CakeOutlined style={{ fontSize: 15 }} />
                      {formatDate(patient.date_naissance)}&nbsp;
                      <span className="text-on-surface-variant/60">({calcAge(patient.date_naissance)} ans)</span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canEMR && (
                    <Link
                      href={`/patients/${id}/emr`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-body-sm text-primary border border-primary/30 hover:bg-primary/8 transition-colors"
                    >
                      <MedicalInformationOutlined style={{ fontSize: 15 }} />
                      Dossier médical
                    </Link>
                  )}
                </div>
              </div>

              {/* Medical quick card — RBAC gated */}
              {canMedical && (
                <div className="mx-6 mb-5 rounded-xl border border-outline-variant bg-surface-container-low overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant">
                    <div className="flex items-center gap-2">
                      <BloodtypeOutlined style={{ fontSize: 15 }} className="text-on-surface-variant" />
                      <span className="text-label-md font-semibold text-on-surface-variant">Fiche médicale rapide</span>
                    </div>
                    {canManage && (
                      <button onClick={() => openDrawer("medical")}
                        className="text-on-surface-variant hover:text-primary transition-colors p-1 rounded-lg hover:bg-primary/8"
                        title="Modifier">
                        <EditOutlined style={{ fontSize: 16 }} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-outline-variant">
                    <Vital label="Groupe sanguin" value={patient.groupe_sanguin} />
                    <Vital label="Rhésus" value={patient.rhesus} />
                    <Vital label="Dernière tension" value={patient.derniere_tension} unit="cmHg" icon={<span className="text-label-sm">♥</span>} />
                    <Vital
                      label="Dernier poids"
                      value={patient.dernier_poids}
                      unit="kg"
                      icon={<MonitorWeightOutlined style={{ fontSize: 13 }} />}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ══════════════════════════════════════════
                TABS
            ══════════════════════════════════════════ */}
            <TabDropdown activeTab={activeTab} onSelect={setTab} canAccess={can} />

            {/* ── Tab: Info Général ── */}
            {activeTab === "info_general" && can("hosto.patients.view") && (
              <div className="space-y-4">
                <Section title="Identité" icon={<PersonOutlined style={{ fontSize: 18 }} />}
                  onEdit={canManage ? () => openDrawer("identite") : undefined}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    <Field label="Nom" value={patient.nom} />
                    <Field label="Post-nom" value={patient.postnom} />
                    <Field label="Prénom" value={patient.prenom} />
                    <Field label="Sexe" value={SEXE_LABEL[patient.sexe] ?? patient.sexe} />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-label-md text-on-surface-variant flex items-center gap-1">
                        <CakeOutlined style={{ fontSize: 14 }} /> Date de naissance
                      </span>
                      <span className="text-body-md text-on-surface">{formatDate(patient.date_naissance)}</span>
                    </div>
                  </div>
                </Section>

                <Section title="Lieu de naissance" icon={<LocalHospitalOutlined style={{ fontSize: 18 }} />}
                  onEdit={canManage ? () => openDrawer("naissance") : undefined}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    <Field label="Ville" value={patient.lieu_naissance_ville} />
                    <Field label="Province" value={patient.lieu_naissance_province} />
                    <Field label="Pays" value={patient.lieu_naissance_pays} />
                  </div>
                </Section>

                <Section title="Adresse" icon={<HomeOutlined style={{ fontSize: 18 }} />}
                  onEdit={canManage ? () => openDrawer("adresse") : undefined}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                    <div className="sm:col-span-3"><Field label="Ligne 1" value={patient.adresse_ligne1} /></div>
                    <Field label="Quartier / Commune" value={patient.adresse_quartier} />
                    <Field label="Ville" value={patient.adresse_ville} />
                    <Field label="Province" value={patient.adresse_province} />
                    <Field label="Pays" value={patient.adresse_pays} />
                  </div>
                </Section>
              </div>
            )}

            {/* ── Tab: Contacts ── */}
            {activeTab === "contacts" && can("hosto.patients.view") && (
              <Section title={`Contacts (${patient.contacts.length})`} icon={<PhoneOutlined style={{ fontSize: 18 }} />}>
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
                              <span className="text-label-sm px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary">Principal</span>
                            )}
                            {contact.is_emergency && (
                              <span className="text-label-sm px-2 py-0.5 rounded-full bg-error/10 text-error">Urgence</span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {contact.phone && (
                            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                              <PhoneOutlined style={{ fontSize: 14 }} /><span>{contact.phone}</span>
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                              <EmailOutlined style={{ fontSize: 14 }} /><span>{contact.email}</span>
                            </div>
                          )}
                          {contact.adresse && (
                            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                              <HomeOutlined style={{ fontSize: 14 }} /><span>{contact.adresse}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* ── Tab: Couverture Médicale ── */}
            {activeTab === "couverture" && (
              can("hosto.patients.insurance") ? (
                <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
                  <p className="text-body-md text-on-surface-variant italic">Couverture médicale — à venir</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-8 flex flex-col items-center gap-3">
                  <LockOutlined style={{ fontSize: 28 }} className="text-on-surface-variant/40" />
                  <p className="text-body-md text-on-surface-variant">
                    Vous n'avez pas accès à la couverture médicale de ce patient.
                  </p>
                  <p className="text-body-sm text-on-surface-variant/60">
                    Permission requise : <code className="font-mono">hosto.patients.insurance</code>
                  </p>
                </div>
              )
            )}

            <div className="text-label-sm text-on-surface-variant text-right">
              Enregistré le {formatDate(patient.created_at)}
              {patient.updated_at !== patient.created_at && <> · Modifié le {formatDate(patient.updated_at)}</>}
            </div>

            {/* ── Options avancées ── */}
            {(canManage || can("hosto.emr.tab.audit")) && (
              <Accordion title="Options avancées">
                <div className="p-4 space-y-2">
                  {can("hosto.emr.tab.audit") && (
                    <Link
                      href={`/patients/${id}/audit`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant px-4 py-3 hover:bg-surface-container transition-colors"
                    >
                      <span className="flex items-center gap-2 text-body-md text-on-surface">
                        <HistoryOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" />
                        Journal d&apos;audit (historique du dossier)
                      </span>
                      <span className="text-body-sm text-primary shrink-0">Ouvrir →</span>
                    </Link>
                  )}

                  {canManage && (
                    confirmArchive ? (
                      <div className="flex items-center gap-3 rounded-xl border border-error/40 bg-error-container/30 px-4 py-3">
                        <WarningAmberOutlined style={{ fontSize: 18 }} className="text-error shrink-0" />
                        <p className="text-body-sm text-on-surface flex-1">
                          Archiver ce dossier ? Il sera masqué des listes (soft delete, récupérable en base).
                        </p>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => setConfirmArchive(false)} disabled={archiving}
                            className="px-3 py-1.5 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50">
                            Annuler
                          </button>
                          <button onClick={handleArchive} disabled={archiving}
                            className="px-3 py-1.5 rounded-lg text-body-sm bg-error text-white hover:opacity-90 disabled:opacity-50">
                            {archiving ? "Archivage…" : "Confirmer"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmArchive(true)}
                        className="w-full flex items-center gap-2 rounded-xl border border-outline-variant px-4 py-3 text-body-md text-on-surface hover:border-error hover:text-error transition-colors"
                      >
                        <ArchiveOutlined style={{ fontSize: 18 }} className="text-on-surface-variant" />
                        Archiver le dossier (soft delete)
                      </button>
                    )
                  )}
                </div>
              </Accordion>
            )}
          </>
        )}
      </div>

      {/* ─────── Drawers ─────── */}

      {drawer === "identite" && (
        <RightDrawer title="Modifier l'identité" onClose={() => setDrawer(null)} width="md:w-[480px] md:max-w-[92vw]">
          <form className="h-full flex flex-col" onSubmit={(e) => { e.preventDefault(); saveDrawer(formIdentite); }}>
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
              {drawerError && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">{drawerError}</p>}
            </div>
            <DrawerFooter onCancel={() => setDrawer(null)} saving={saving} />
          </form>
        </RightDrawer>
      )}

      {drawer === "naissance" && (
        <RightDrawer title="Modifier le lieu de naissance" onClose={() => setDrawer(null)} width="md:w-[480px] md:max-w-[92vw]">
          <form className="h-full flex flex-col" onSubmit={(e) => { e.preventDefault(); saveDrawer(formNaissance); }}>
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
              {drawerError && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">{drawerError}</p>}
            </div>
            <DrawerFooter onCancel={() => setDrawer(null)} saving={saving} />
          </form>
        </RightDrawer>
      )}

      {drawer === "adresse" && (
        <RightDrawer title="Modifier l'adresse" onClose={() => setDrawer(null)} width="md:w-[480px] md:max-w-[92vw]">
          <form className="h-full flex flex-col" onSubmit={(e) => { e.preventDefault(); saveDrawer(formAdresse); }}>
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
              {drawerError && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">{drawerError}</p>}
            </div>
            <DrawerFooter onCancel={() => setDrawer(null)} saving={saving} />
          </form>
        </RightDrawer>
      )}

      {drawer === "medical" && (
        <RightDrawer title="Modifier la fiche médicale" onClose={() => setDrawer(null)} width="md:w-[480px] md:max-w-[92vw]">
          <form className="h-full flex flex-col" onSubmit={(e) => { e.preventDefault(); saveDrawer(formMedical); }}>
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Groupe sanguin">
                  <select className={inputCls} value={formMedical.groupe_sanguin}
                    onChange={(e) => setFormMedical((f) => ({ ...f, groupe_sanguin: e.target.value }))}>
                    <option value="">—</option>
                    {GROUPE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </FormField>
                <FormField label="Rhésus">
                  <select className={inputCls} value={formMedical.rhesus}
                    onChange={(e) => setFormMedical((f) => ({ ...f, rhesus: e.target.value }))}>
                    <option value="">—</option>
                    {RHESUS_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </FormField>
              </div>
              <FormField label="Dernière tension (cmHg)">
                <input className={inputCls} placeholder="ex: 12/8" value={formMedical.derniere_tension}
                  onChange={(e) => setFormMedical((f) => ({ ...f, derniere_tension: e.target.value }))} />
              </FormField>
              <FormField label="Dernier poids (kg)">
                <input className={inputCls} placeholder="ex: 72" value={formMedical.dernier_poids}
                  onChange={(e) => setFormMedical((f) => ({ ...f, dernier_poids: e.target.value }))} />
              </FormField>
              {drawerError && <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-3 py-2">{drawerError}</p>}
            </div>
            <DrawerFooter onCancel={() => setDrawer(null)} saving={saving} />
          </form>
        </RightDrawer>
      )}
    </DashboardShell>
  );
}

// ─────────────────────────────────────────────
// Vital cell for the quick medical card
// ─────────────────────────────────────────────

function Vital({ label, value, unit, icon }: { label: string; value?: string | null; unit?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-surface-container-lowest px-4 py-3 flex flex-col gap-0.5">
      <span className="text-label-sm text-on-surface-variant flex items-center gap-1">
        {icon}{label}
      </span>
      <span className="text-body-md font-semibold text-on-surface">
        {value ? `${value}${unit ? " " + unit : ""}` : "—"}
      </span>
    </div>
  );
}
