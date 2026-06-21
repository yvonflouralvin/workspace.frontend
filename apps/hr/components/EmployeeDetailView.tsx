"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowBackOutlined,
  WorkOutlined,
  ApartmentOutlined,
  EmailOutlined,
  HomeOutlined,
  PhoneOutlined,
  EditOutlined,
  DescriptionOutlined,
  DownloadOutlined,
  DeleteOutlined,
  AddOutlined,
  LinkOutlined,
  LinkOffOutlined,
} from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Tabs } from "@repo/ui/Tabs";
import {
  getEmployee,
  listEmployeeDocuments,
  deleteEmployeeDocument,
  employeeDocumentContentUrl,
  listEmployeeContracts,
  unlinkEmployeeAccount,
  ApiError,
  type Employee,
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

const CONTRACT_STATUS_STYLES: Record<Contract["status"], { label: string; className: string }> = {
  upcoming: { label: "À venir", className: "bg-surface-container text-on-surface-variant" },
  active: { label: "Actif", className: "bg-secondary/15 text-secondary" },
  ended: { label: "Terminé", className: "bg-surface-container text-on-surface-variant" },
};

function formatDate(value: string | null): string {
  // Découpage manuel plutôt que `new Date(value)` : une date "YYYY-MM-DD" sans
  // heure est interprétée en UTC par `Date`, ce qui peut afficher le jour
  // précédent dans un fuseau horaire en arrière de UTC.
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-on-surface-variant">{icon}</span>
      <span className="text-on-surface-variant w-28 shrink-0">{label}</span>
      <span className="text-on-surface">{value || "—"}</span>
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
      .then(setEmployee)
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
      <p className="text-sm text-on-surface-variant bg-surface-container rounded-lg px-3 py-2">
        Accès restreint à cette section.
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>
    );
  }

  if (loading || !employee) {
    return <p className="text-sm text-on-surface-variant">Chargement…</p>;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/employees"
        className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
      >
        <ArrowBackOutlined style={{ fontSize: 16 }} />
        Retour aux employés
      </Link>

      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-on-surface">
            {employee.first_name} {employee.last_name}
          </h1>
          {canManage && (
            <button
              onClick={() => setShowBasicEdit(true)}
              title="Modifier les informations de base"
              className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              <EditOutlined style={{ fontSize: 18 }} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoRow icon={<WorkOutlined style={{ fontSize: 18 }} />} label="Fonction" value={employee.job_title} />
          <InfoRow
            icon={<ApartmentOutlined style={{ fontSize: 18 }} />}
            label="Département"
            value={employee.group_name}
          />
          <InfoRow icon={<EmailOutlined style={{ fontSize: 18 }} />} label="Email" value={employee.email} />
        </div>

        {accountError && (
          <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
            {accountError}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-outline-variant">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-on-surface-variant">
              {employee.user_id ? (
                <LinkOutlined style={{ fontSize: 18 }} />
              ) : (
                <LinkOffOutlined style={{ fontSize: 18 }} />
              )}
            </span>
            <span className="text-on-surface-variant w-28 shrink-0">Compte</span>
            <span className="text-on-surface">
              {employee.linked_account_email ?? "Non lié à un compte plateforme"}
            </span>
          </div>
          {canManage &&
            (employee.user_id ? (
              <button
                onClick={handleUnlinkAccount}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Délier
              </button>
            ) : (
              <button
                onClick={() => setShowAccountLink(true)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-primary hover:bg-surface-container transition-colors"
              >
                Lier à un compte
              </button>
            ))}
        </div>
      </div>

      <Tabs
        tabs={[
          {
            key: "general",
            label: "Général",
            content: (
              <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-on-surface-variant">
                    Informations générales
                  </h3>
                  {canManage && (
                    <button
                      onClick={() => setShowGeneralEdit(true)}
                      title="Modifier les informations générales"
                      className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                    >
                      <EditOutlined style={{ fontSize: 18 }} />
                    </button>
                  )}
                </div>
                <InfoRow
                  icon={<HomeOutlined style={{ fontSize: 18 }} />}
                  label="Adresse"
                  value={employee.address}
                />
                <InfoRow
                  icon={<PhoneOutlined style={{ fontSize: 18 }} />}
                  label="Téléphone"
                  value={employee.phone}
                />
              </div>
            ),
          },
          {
            key: "documents",
            label: "Documents",
            content: (
              <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-on-surface-variant">Documents</h3>
                  {canManageDocuments && (
                    <button
                      onClick={() => setShowDocumentUpload(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-primary hover:bg-surface-container transition-colors"
                    >
                      <AddOutlined style={{ fontSize: 16 }} />
                      Ajouter un document
                    </button>
                  )}
                </div>

                {!canViewDocuments && (
                  <p className="text-sm text-on-surface-variant">Accès restreint à cette section.</p>
                )}

                {documentsError && (
                  <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
                    {documentsError}
                  </p>
                )}

                {canViewDocuments && documentsLoading && (
                  <p className="text-sm text-on-surface-variant">Chargement…</p>
                )}

                {canViewDocuments && !documentsLoading && documents.length === 0 && (
                  <p className="text-sm text-on-surface-variant">Aucun document pour le moment.</p>
                )}

                {canViewDocuments && documents.length > 0 && (
                  <ul className="divide-y divide-outline-variant">
                    {documents.map((doc) => (
                      <li key={doc.id} className="flex items-center gap-3 py-2.5">
                        <DescriptionOutlined
                          style={{ fontSize: 18 }}
                          className="text-on-surface-variant shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-on-surface truncate">{doc.filename}</p>
                          <p className="text-xs text-on-surface-variant">
                            {categoryLabel(doc.category)} · {formatFileSize(doc.size_bytes)} ·{" "}
                            {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <a
                          href={employeeDocumentContentUrl(employeeId, doc.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Télécharger"
                          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                        >
                          <DownloadOutlined style={{ fontSize: 18 }} />
                        </a>
                        {canManageDocuments && (
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            title="Supprimer"
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                          >
                            <DeleteOutlined style={{ fontSize: 18 }} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          },
          {
            key: "contrat",
            label: "Contrat",
            content: (
              <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-on-surface-variant">Contrats</h3>
                  {canManageContracts && (
                    <button
                      onClick={() => setContractFormMode({ mode: "create" })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-primary hover:bg-surface-container transition-colors"
                    >
                      <AddOutlined style={{ fontSize: 16 }} />
                      Nouveau contrat
                    </button>
                  )}
                </div>

                {!canViewContracts && (
                  <p className="text-sm text-on-surface-variant">Accès restreint à cette section.</p>
                )}

                {contractsError && (
                  <p className="text-sm text-error bg-error-container/40 rounded-lg px-3 py-2">
                    {contractsError}
                  </p>
                )}

                {canViewContracts && contractsLoading && (
                  <p className="text-sm text-on-surface-variant">Chargement…</p>
                )}

                {canViewContracts && !contractsLoading && contracts.length === 0 && (
                  <p className="text-sm text-on-surface-variant">Aucun contrat pour le moment.</p>
                )}

                {canViewContracts && contracts.length > 0 && (
                  <ul className="divide-y divide-outline-variant">
                    {contracts.map((contract) => (
                      <li key={contract.id} className="flex items-center gap-3 py-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-on-surface">
                              {contractTypeLabel(contract.contract_type)}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${CONTRACT_STATUS_STYLES[contract.status].className}`}
                            >
                              {CONTRACT_STATUS_STYLES[contract.status].label}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant">
                            {formatDate(contract.start_date)} → {formatDate(contract.end_date)} ·{" "}
                            {contract.working_time_percent}% ·{" "}
                            {contract.base_salary.toLocaleString("fr-FR")} {currencyLabel(contract.currency)}
                            {salaryPeriodLabel(contract.salary_period)}
                          </p>
                        </div>
                        {contract.document_id !== null && (
                          <a
                            href={employeeDocumentContentUrl(employeeId, contract.document_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Voir le document associé"
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                          >
                            <DescriptionOutlined style={{ fontSize: 18 }} />
                          </a>
                        )}
                        {canManageContracts && (
                          <button
                            onClick={() => setContractFormMode({ mode: "edit", contract })}
                            title="Modifier le contrat"
                            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                          >
                            <EditOutlined style={{ fontSize: 18 }} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          },
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
