"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowBackOutlined,
  EditOutlined,
  DescriptionOutlined,
  DownloadOutlined,
  DeleteOutlined,
  AddOutlined,
  CheckOutlined,
  UploadFileOutlined,
  SupervisorAccountOutlined,
} from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Avatar } from "@repo/ui/Avatar";
import { Tabs } from "@repo/ui/Tabs";
import {
  getEmployee,
  getGroup,
  listEmployeeDocuments,
  deleteEmployeeDocument,
  employeeDocumentContentUrl,
  listEmployeeContracts,
  unlinkEmployeeAccount,
  ApiError,
  type Employee,
  type EmployeeSummary,
  type EmployeeDocument,
  type Contract,
} from "@/app/lib/api";
import { EmployeeGeneralEditDrawer } from "@/components/EmployeeGeneralEditDrawer";
import { EmployeeBasicInfoEditDrawer } from "@/components/EmployeeBasicInfoEditDrawer";
import { AccountLinkDrawer } from "@/components/AccountLinkDrawer";
import {
  EmployeeDocumentUploadDrawer,
  DOCUMENT_CATEGORIES,
} from "@/components/EmployeeDocumentUploadDrawer";
import {
  ContractFormDrawer,
  CONTRACT_TYPES,
  CURRENCIES,
  SALARY_PERIODS,
} from "@/components/ContractFormDrawer";

// Accents d'avatar — variété stable par employé.
const AVATAR_COLORS = [
  "#3525cd", "#006c49", "#004598", "#9a3412", "#7c3aed", "#b91c1c", "#0e7490", "#a16207",
];
const accentFor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function categoryLabel(category: string | null): string {
  return DOCUMENT_CATEGORIES.find((c) => c.value === category)?.label ?? "Autre";
}

function contractTypeLabel(type: string): string {
  return CONTRACT_TYPES.find((t) => t.value === type)?.label ?? type;
}

function currencyLabel(currency: string): string {
  return CURRENCIES.find((c) => c.value === currency)?.label ?? currency;
}

function salaryPeriodLabel(period: string): string {
  return SALARY_PERIODS.find((p) => p.value === period)?.label ?? "";
}

const CONTRACT_STATUS_STYLES: Record<
  Contract["status"],
  { label: string; badge: string; dot: string; border: string; card: string }
> = {
  upcoming: {
    label: "À venir",
    badge: "bg-tertiary/10 text-tertiary",
    dot: "bg-tertiary",
    border: "border-outline-soft",
    card: "bg-surface-container-lowest",
  },
  active: {
    label: "Actif",
    badge: "bg-member-active-container text-member-active",
    dot: "bg-secondary",
    border: "border-secondary/30",
    card: "bg-secondary/[0.04]",
  },
  ended: {
    label: "Terminé",
    badge: "bg-surface-container text-on-surface-variant",
    dot: "bg-track",
    border: "border-outline-soft",
    card: "bg-surface-container-lowest",
  },
};

function formatDate(value: string | null): string {
  // Découpage manuel plutôt que `new Date(value)` : une date "YYYY-MM-DD" sans
  // heure est interprétée en UTC par `Date`, ce qui peut afficher le jour
  // précédent dans un fuseau horaire en arrière de UTC.
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function InfoRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string | null;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-hairline last:border-b-0">
      <span className="text-label-md text-outline w-28 flex-none">{label}</span>
      <span className="flex-1 min-w-0 text-body-md text-on-surface break-words">{value || "—"}</span>
      {onEdit && (
        <button
          onClick={onEdit}
          title="Modifier"
          className="w-7 h-7 flex-none flex items-center justify-center rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
        >
          <EditOutlined style={{ fontSize: 14 }} />
        </button>
      )}
    </div>
  );
}

export function EmployeeDetailView({ employeeId }: { employeeId: number }) {
  const { can } = usePermissions();
  const canView = can("hr.employees.view");
  const canManage = can("hr.employees.manage");
  const canViewDocuments = can("hr.documents.view");
  const canManageDocuments = can("hr.documents.manage");
  const canViewContracts = can("hr.contracts.view");
  const canManageContracts = can("hr.contracts.manage");

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [manager, setManager] = useState<EmployeeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGeneralEdit, setShowGeneralEdit] = useState(false);
  const [showBasicEdit, setShowBasicEdit] = useState(false);
  const [showAccountLink, setShowAccountLink] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [contractsError, setContractsError] = useState<string | null>(null);
  const [contractFormMode, setContractFormMode] = useState<
    { mode: "create" } | { mode: "edit"; contract: Contract } | null
  >(null);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }

    getEmployee(employeeId)
      .then((emp) => {
        setEmployee(emp);
        // Le manager de la personne = le responsable de son groupe.
        getGroup(emp.group_id)
          .then((g) => setManager(g.manager))
          .catch(() => {});
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Une erreur est survenue"))
      .finally(() => setLoading(false));
  }, [employeeId, canView]);

  useEffect(() => {
    if (!canViewDocuments) {
      setDocumentsLoading(false);
      return;
    }

    listEmployeeDocuments(employeeId)
      .then(setDocuments)
      .catch((err) =>
        setDocumentsError(err instanceof ApiError ? err.message : "Une erreur est survenue")
      )
      .finally(() => setDocumentsLoading(false));
  }, [employeeId, canViewDocuments]);

  useEffect(() => {
    if (!canViewContracts) {
      setContractsLoading(false);
      return;
    }

    listEmployeeContracts(employeeId)
      .then(setContracts)
      .catch((err) =>
        setContractsError(err instanceof ApiError ? err.message : "Une erreur est survenue")
      )
      .finally(() => setContractsLoading(false));
  }, [employeeId, canViewContracts]);

  async function handleDeleteDocument(documentId: number) {
    if (!window.confirm("Supprimer ce document ?")) return;
    try {
      await deleteEmployeeDocument(employeeId, documentId);
      setDocuments((docs) => docs.filter((d) => d.id !== documentId));
    } catch (err) {
      setDocumentsError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  async function handleUnlinkAccount() {
    if (!window.confirm("Délier ce compte ? L'accès plateforme de la personne n'est pas retiré.")) return;
    setAccountError(null);
    try {
      const updated = await unlinkEmployeeAccount(employeeId);
      setEmployee(updated);
    } catch (err) {
      setAccountError(err instanceof ApiError ? err.message : "Une erreur est survenue");
    }
  }

  if (!canView) {
    return (
      <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
        Accès restreint à cette section.
      </p>
    );
  }

  if (error) {
    return <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>;
  }

  if (loading || !employee) {
    return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;
  }

  const fullName = `${employee.first_name} ${employee.last_name}`.trim();
  const linked = employee.user_id !== null;
  const subtitle = [employee.job_title, employee.group_name].filter(Boolean).join(" · ");

  const infosTab = (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-5">
        <InfoRow
          label="Fonction"
          value={employee.job_title}
          onEdit={canManage ? () => setShowBasicEdit(true) : undefined}
        />
        <InfoRow
          label="Département"
          value={employee.group_name}
          onEdit={canManage ? () => setShowBasicEdit(true) : undefined}
        />
        <InfoRow
          label="Email"
          value={employee.email}
          onEdit={canManage ? () => setShowBasicEdit(true) : undefined}
        />
        <InfoRow
          label="Adresse"
          value={employee.address}
          onEdit={canManage ? () => setShowGeneralEdit(true) : undefined}
        />
        <InfoRow
          label="Téléphone"
          value={employee.phone}
          onEdit={canManage ? () => setShowGeneralEdit(true) : undefined}
        />
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <p className="text-label-sm uppercase text-outline mb-3">Compte plateforme</p>
          {accountError && (
            <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2 mb-3">
              {accountError}
            </p>
          )}
          {linked ? (
            <>
              <div className="flex items-center gap-3">
                <Avatar name={fullName} letters={2} size={36} variant="solid" color={accentFor(employee.id)} />
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-on-surface truncate">
                    {employee.linked_account_email}
                  </p>
                  <p className="text-label-md text-secondary font-semibold">Compte actif</p>
                </div>
              </div>
              {canManage && (
                <button
                  onClick={handleUnlinkAccount}
                  className="mt-3 text-label-md font-semibold text-on-surface-variant hover:text-error transition-colors"
                >
                  Délier le compte
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-body-sm text-on-surface-variant">Aucun compte plateforme lié.</p>
              {canManage && (
                <button
                  onClick={() => setShowAccountLink(true)}
                  className="mt-3 inline-flex items-center gap-1.5 text-label-md font-semibold text-primary hover:underline"
                >
                  <AddOutlined style={{ fontSize: 15 }} />
                  Lier à un compte
                </button>
              )}
            </>
          )}
        </div>

        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <p className="text-label-sm uppercase text-outline mb-3">Manager</p>
          {manager ? (
            <div className="flex items-center gap-3">
              <Avatar
                name={`${manager.first_name} ${manager.last_name}`}
                letters={2}
                size={36}
                variant="solid"
                color={accentFor(manager.id)}
              />
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-on-surface truncate">
                  {manager.first_name} {manager.last_name}
                </p>
                <p className="text-label-md text-outline truncate">{manager.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-body-sm text-on-surface-variant">
              <SupervisorAccountOutlined style={{ fontSize: 18 }} className="text-outline-variant" />
              Aucun manager défini pour ce département.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const contratsTab = (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-label-sm uppercase text-outline">Contrats</h3>
        {canManageContracts && (
          <button
            onClick={() => setContractFormMode({ mode: "create" })}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Nouveau contrat
          </button>
        )}
      </div>

      {!canViewContracts && (
        <p className="text-body-sm text-on-surface-variant">Accès restreint à cette section.</p>
      )}
      {contractsError && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{contractsError}</p>
      )}
      {canViewContracts && contractsLoading && (
        <p className="text-body-sm text-on-surface-variant">Chargement…</p>
      )}
      {canViewContracts && !contractsLoading && contracts.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">Aucun contrat pour le moment.</p>
      )}

      {canViewContracts && contracts.length > 0 && (
        <div className="relative pl-8">
          <div className="absolute left-[10px] top-2 bottom-2 w-0.5 bg-outline-soft" />
          {contracts.map((contract) => {
            const s = CONTRACT_STATUS_STYLES[contract.status];
            return (
              <div key={contract.id} className="relative mb-4 last:mb-0">
                <span
                  className={`absolute -left-8 top-4 w-[22px] h-[22px] rounded-full border-[3px] border-background ${s.dot}`}
                />
                <div className={`rounded-2xl border ${s.border} ${s.card} p-4`}>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="font-display text-body-lg font-semibold text-on-surface flex-1 min-w-0 truncate">
                      {contractTypeLabel(contract.contract_type)}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${s.badge}`}>
                      {s.label}
                    </span>
                    {contract.document_id !== null && (
                      <a
                        href={employeeDocumentContentUrl(employeeId, contract.document_id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Document associé"
                        className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                      >
                        <DescriptionOutlined style={{ fontSize: 16 }} />
                      </a>
                    )}
                    {canManageContracts && (
                      <button
                        onClick={() => setContractFormMode({ mode: "edit", contract })}
                        title="Modifier le contrat"
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                      >
                        <EditOutlined style={{ fontSize: 16 }} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-label-md text-outline mb-0.5">Début</p>
                      <p className="text-body-sm text-on-surface">{formatDate(contract.start_date)}</p>
                    </div>
                    <div>
                      <p className="text-label-md text-outline mb-0.5">Fin</p>
                      <p className="text-body-sm text-on-surface">{formatDate(contract.end_date)}</p>
                    </div>
                    <div>
                      <p className="text-label-md text-outline mb-0.5">Temps</p>
                      <p className="text-body-sm text-on-surface">{contract.working_time_percent} %</p>
                    </div>
                    <div>
                      <p className="text-label-md text-outline mb-0.5">Salaire brut</p>
                      <p className="text-body-sm font-medium text-on-surface tabular-nums font-mono">
                        {contract.base_salary.toLocaleString("fr-FR")} {currencyLabel(contract.currency)}
                        <span className="text-outline font-sans font-normal">
                          {salaryPeriodLabel(contract.salary_period)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const documentsByCategory = DOCUMENT_CATEGORIES.map((cat) => ({
    ...cat,
    docs: documents.filter((d) => (d.category ?? "other") === cat.value),
  })).filter((cat) => cat.docs.length > 0);
  const uncategorized = documents.filter(
    (d) => !DOCUMENT_CATEGORIES.some((c) => c.value === (d.category ?? "other"))
  );

  const documentsTab = (
    <div>
      {!canViewDocuments && (
        <p className="text-body-sm text-on-surface-variant">Accès restreint à cette section.</p>
      )}
      {documentsError && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2 mb-4">
          {documentsError}
        </p>
      )}

      {canManageDocuments && (
        <button
          onClick={() => setShowDocumentUpload(true)}
          className="w-full rounded-2xl border-[1.5px] border-dashed border-primary/40 bg-primary/[0.03] py-6 px-4 flex flex-col items-center gap-1 text-center hover:bg-primary/[0.06] transition-colors mb-5"
        >
          <UploadFileOutlined style={{ fontSize: 28 }} className="text-primary" />
          <span className="text-body-md font-semibold text-on-surface">Ajouter un document</span>
          <span className="text-label-md text-outline">PDF, image ou Word · 10 Mo max</span>
        </button>
      )}

      {canViewDocuments && documentsLoading && (
        <p className="text-body-sm text-on-surface-variant">Chargement…</p>
      )}
      {canViewDocuments && !documentsLoading && documents.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">Aucun document pour le moment.</p>
      )}

      {canViewDocuments && documents.length > 0 && (
        <div className="flex flex-col gap-5">
          {[...documentsByCategory, ...(uncategorized.length ? [{ value: "other", label: "Autre", docs: uncategorized }] : [])].map(
            (cat) => (
              <div key={cat.value}>
                <p className="text-body-sm font-semibold text-on-surface-variant mb-2">
                  {cat.label} <span className="text-outline">{cat.docs.length}</span>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {cat.docs.map((doc) => {
                    const ext = (doc.filename.split(".").pop() ?? "?").slice(0, 4).toUpperCase();
                    return (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 rounded-xl border border-outline-soft bg-surface-container-lowest p-3 hover:border-primary/40 transition-colors"
                      >
                        <span className="w-10 h-10 flex-none rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold font-mono">
                          {ext}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-body-sm font-medium text-on-surface truncate">{doc.filename}</p>
                          <p className="text-label-md text-outline">
                            {formatFileSize(doc.size_bytes)} ·{" "}
                            {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <a
                          href={employeeDocumentContentUrl(employeeId, doc.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Télécharger"
                          className="w-8 h-8 flex-none flex items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                        >
                          <DownloadOutlined style={{ fontSize: 16 }} />
                        </a>
                        {canManageDocuments && (
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Supprimer"
                            className="w-8 h-8 flex-none flex items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
                          >
                            <DeleteOutlined style={{ fontSize: 16 }} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Link
        href="/employees"
        className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <ArrowBackOutlined style={{ fontSize: 16 }} />
        Employés
      </Link>

      {/* Entête identité */}
      <div className="flex items-center gap-4 flex-wrap">
        <Avatar name={fullName} letters={2} size={56} variant="solid" color={accentFor(employee.id)} />
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-headline-sm text-on-surface break-words">{fullName || "—"}</h1>
          {subtitle && <p className="text-body-sm text-on-surface-variant mt-0.5 break-words">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2.5">
          {linked && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-member-active-container px-3 py-1.5 text-label-md font-semibold text-member-active">
              <CheckOutlined style={{ fontSize: 14 }} />
              Compte lié
            </span>
          )}
          {canManage && (
            <button
              onClick={() => setShowBasicEdit(true)}
              title="Modifier les informations"
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
            >
              <EditOutlined style={{ fontSize: 16 }} />
              Modifier
            </button>
          )}
        </div>
      </div>

      <Tabs
        tabs={[
          { key: "infos", label: "Infos", content: infosTab },
          { key: "contrats", label: "Contrats", content: contratsTab },
          { key: "documents", label: "Documents", content: documentsTab },
        ]}
      />

      {showGeneralEdit && (
        <EmployeeGeneralEditDrawer
          employee={employee}
          onClose={() => setShowGeneralEdit(false)}
          onSaved={setEmployee}
        />
      )}

      {showBasicEdit && (
        <EmployeeBasicInfoEditDrawer
          employee={employee}
          onClose={() => setShowBasicEdit(false)}
          onSaved={setEmployee}
        />
      )}

      {showDocumentUpload && (
        <EmployeeDocumentUploadDrawer
          employeeId={employeeId}
          onClose={() => setShowDocumentUpload(false)}
          onUploaded={(doc) => setDocuments((docs) => [doc, ...docs])}
        />
      )}

      {contractFormMode?.mode === "create" && (
        <ContractFormDrawer
          mode="create"
          employeeId={employeeId}
          onClose={() => setContractFormMode(null)}
          onSaved={(contract) => setContracts((list) => [contract, ...list])}
        />
      )}

      {contractFormMode?.mode === "edit" && (
        <ContractFormDrawer
          mode="edit"
          employeeId={employeeId}
          contract={contractFormMode.contract}
          onClose={() => setContractFormMode(null)}
          onSaved={(updated) =>
            setContracts((list) => list.map((c) => (c.id === updated.id ? updated : c)))
          }
        />
      )}

      {showAccountLink && (
        <AccountLinkDrawer
          employee={employee}
          onClose={() => setShowAccountLink(false)}
          onLinked={setEmployee}
        />
      )}
    </div>
  );
}
