"use client";

import { useEffect, useMemo, useState } from "react";
import { useSessionStore } from "@repo/auth/store/session.store";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import {
  listProjetsDuTiers,
  creerProjetPourTiers,
  listFacturesDuTiers,
  listDocumentsDuTiers,
  listMembers,
  type ProjetBrief,
  type FactureBrief,
  type DocumentBrief,
  type WorkspaceMember,
} from "@/lib/tiers-api";
import {
  AddOutlined,
  OpenInNewOutlined,
  DescriptionOutlined,
  ReceiptLongOutlined,
} from "@mui/icons-material";

const WORKSPACE_APP_URL = process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN ?? "";
const VENTES_APP_URL = process.env.NEXT_PUBLIC_AUTH_API_VENTES_DOMAIN ?? "";

const PROJET_STATUT_LABEL: Record<string, string> = {
  ACTIF: "Actif",
  EN_PAUSE: "En pause",
  ARCHIVE: "Archivé",
};

const FACTURE_STATUT_LABEL: Record<string, string> = {
  BROUILLON: "Brouillon",
  EMISE: "Émise",
  PAYEE: "Payée",
  ANNULEE: "Annulée",
};

function formatMontant(v: number | string): string {
  const n = Number(v);
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
      {icon}
      <p className="text-body-md text-on-surface-variant mt-2">{label}</p>
    </div>
  );
}

export function ProjetsPanel({ tiersId, canManage }: { tiersId: number; canManage: boolean }) {
  const workspaceId = useSessionStore((s) => s.activeWorkspace?.id);
  const [projets, setProjets] = useState<ProjetBrief[] | null>(null);
  const [membres, setMembres] = useState<WorkspaceMember[]>([]);
  const [ajout, setAjout] = useState(false);
  const [nom, setNom] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    listProjetsDuTiers(tiersId).then(setProjets);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiersId]);

  useEffect(() => {
    if (workspaceId) listMembers(workspaceId).then(setMembres);
  }, [workspaceId]);

  function nomCreateur(userId: number | null): string {
    if (!userId) return "—";
    const m = membres.find((mb) => mb.user.id === userId);
    return m ? m.user.username || m.user.email : `#${userId}`;
  }

  const columns = useMemo<DataListColumn<ProjetBrief>[]>(
    () => [
      {
        key: "titre",
        header: "Titre",
        render: (p) => <span className="font-medium text-on-surface">{p.name}</span>,
      },
      {
        key: "created_at",
        header: "Date de création",
        render: (p) => new Date(p.created_at).toLocaleDateString("fr-FR"),
      },
      {
        key: "created_by",
        header: "Créé par",
        render: (p) => nomCreateur(p.created_by),
      },
      {
        key: "status",
        header: "Statut",
        render: (p) => PROJET_STATUT_LABEL[p.status] ?? p.status,
      },
      {
        key: "actions",
        header: "",
        className: "w-10",
        render: (p) =>
          WORKSPACE_APP_URL ? (
            <a
              href={`${WORKSPACE_APP_URL}/projects/${p.id}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
              aria-label="Ouvrir le projet"
            >
              <OpenInNewOutlined style={{ fontSize: 16 }} />
            </a>
          ) : null,
      },
    ],
    [membres],
  );

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await creerProjetPourTiers(tiersId, nom.trim());
      setNom("");
      setAjout(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  if (projets === null) {
    return <p className="text-body-md text-on-surface-variant">Chargement…</p>;
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex items-center justify-between">
          <p className="text-label-md text-outline">
            {projets.length} projet{projets.length > 1 ? "s" : ""}
          </p>
          {!ajout && (
            <button
              type="button"
              onClick={() => setAjout(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Nouveau projet
            </button>
          )}
        </div>
      )}

      {ajout && (
        <form
          onSubmit={creer}
          className="flex flex-wrap items-end gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
        >
          <div className="flex-1 min-w-[200px]">
            <span className="block text-label-sm uppercase text-outline mb-1">Nom du projet</span>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary transition-colors"
              autoFocus
              required
            />
          </div>
          <button
            type="button"
            onClick={() => setAjout(false)}
            className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            {saving ? "…" : "Créer"}
          </button>
          {error && <p className="text-body-sm text-error w-full">{error}</p>}
        </form>
      )}

      {!ajout && (
        <DataList
          items={projets}
          columns={columns}
          getRowKey={(p) => p.id}
          searchText={(p) => `${p.name} ${nomCreateur(p.created_by)}`}
          searchPlaceholder="Rechercher un projet…"
          pageSize={10}
          emptyMessage="Aucun projet lié à ce client."
          onRowClick={(p) => {
            if (WORKSPACE_APP_URL) window.open(`${WORKSPACE_APP_URL}/projects/${p.id}`, "_blank");
          }}
        />
      )}
    </div>
  );
}

export function FacturesPanel({ tiersId }: { tiersId: number }) {
  const [factures, setFactures] = useState<FactureBrief[] | null>(null);

  useEffect(() => {
    listFacturesDuTiers(tiersId).then(setFactures);
  }, [tiersId]);

  if (factures === null) {
    return <p className="text-body-md text-on-surface-variant">Chargement…</p>;
  }
  if (factures.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptLongOutlined style={{ fontSize: 28 }} className="text-outline mx-auto" />}
        label="Aucune facture liée à ce client."
      />
    );
  }

  return (
    <ul className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
      {factures.map((f) => (
        <li key={f.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-body-md font-medium text-on-surface truncate font-mono">{f.code}</p>
            <p className="text-label-md text-outline">
              {FACTURE_STATUT_LABEL[f.statut] ?? f.statut} · {formatMontant(f.montant_paye)} /{" "}
              {formatMontant(f.montant_total)} reçu
            </p>
          </div>
          {VENTES_APP_URL && (
            <a
              href={`${VENTES_APP_URL}/factures`}
              target="_blank"
              rel="noreferrer"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
              aria-label="Ouvrir dans Facturation"
            >
              <OpenInNewOutlined style={{ fontSize: 16 }} />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export function DocumentsPanel({ tiersId }: { tiersId: number }) {
  const [documents, setDocuments] = useState<DocumentBrief[] | null>(null);

  useEffect(() => {
    listDocumentsDuTiers(tiersId).then(setDocuments);
  }, [tiersId]);

  if (documents === null) {
    return <p className="text-body-md text-on-surface-variant">Chargement…</p>;
  }
  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<DescriptionOutlined style={{ fontSize: 28 }} className="text-outline mx-auto" />}
        label="Aucun document pour ce client."
      />
    );
  }

  return (
    <ul className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
      {documents.map((d) => (
        <li key={d.id} className="flex items-center gap-3 px-4 py-3">
          <DescriptionOutlined style={{ fontSize: 18 }} className="text-outline shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-body-md font-medium text-on-surface truncate">{d.filename}</p>
            <p className="text-label-md text-outline">
              {formatSize(d.size_bytes)}
              {d.category ? ` · ${d.category}` : ""} ·{" "}
              {new Date(d.created_at).toLocaleDateString("fr-FR")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
