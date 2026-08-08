"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowBackOutlined, AddOutlined, ChevronRightOutlined, HomeOutlined } from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import { listGroups, listPermissions, deleteGroup, ApiError } from "@/app/lib/api";
import type { Group, AppPermissionGroup } from "@/app/lib/types";
import { SearchField } from "@repo/ui/SearchField";
import { CreateGroupModal } from "@/components/CreateGroupModal";

export default function GroupsPage() {
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);
  const { can } = usePermissions();

  const [groups, setGroups] = useState<Group[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<AppPermissionGroup[]>([]);
  const [recherche, setRecherche] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // `undefined` = modale fermée, `null` = création à la racine, sinon le parent.
  const [createParent, setCreateParent] = useState<Group | null | undefined>(undefined);
  const [pendingDeletion, setPendingDeletion] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const workspaceId = activeWorkspace?.id;
  const canManage = can("groups.manage");

  useEffect(() => {
    if (!workspaceId || !canManage) {
      setLoading(false);
      return;
    }
    listGroups(workspaceId)
      .then((res) => setGroups(res.groups))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Une erreur est survenue"))
      .finally(() => setLoading(false));

    listPermissions()
      .then((res) => setPermissionCatalog(res.groups))
      .catch(() => {});
  }, [workspaceId, canManage]);

  const confirmDeletion = useCallback(async () => {
    if (!workspaceId || !pendingDeletion) return;
    setDeleting(true);
    try {
      await deleteGroup(workspaceId, pendingDeletion.id);
      setGroups((prev) => prev.filter((g) => g.id !== pendingDeletion.id));
      setToast({ message: `Groupe « ${pendingDeletion.name} » supprimé.`, tone: "success" });
      setPendingDeletion(null);
    } catch (err) {
      setToast({
        message: err instanceof ApiError ? err.message : "Une erreur est survenue",
        tone: "error",
      });
    } finally {
      setDeleting(false);
    }
  }, [workspaceId, pendingDeletion]);

  if (!canManage) {
    return (
      <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
        <h1 className="font-display text-headline-md text-on-surface">Groupes</h1>
        <p className="text-body-md text-on-surface-variant mt-0.5">
          Vous n&apos;avez pas accès à cette page.
        </p>
      </div>
    );
  }

  const filtres = groups.filter((g) => {
    const q = recherche.trim().toLowerCase();
    if (!q) return true;
    return (
      g.name.toLowerCase().includes(q) ||
      (g.description ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
      <Link
        href="/members"
        className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
      >
        <ArrowBackOutlined style={{ fontSize: 15 }} />
        Membres
      </Link>

      <div className="flex items-start gap-4 mb-6">
        <div className="flex-1">
          <h1 className="font-display text-headline-md text-on-surface">Groupes</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Organisez les droits par groupe et sous-groupe.
          </p>
        </div>
        <button
          onClick={() => setCreateParent(null)}
          className="inline-flex items-center justify-center gap-1.5 h-11 md:h-[38px] px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors whitespace-nowrap"
        >
          <AddOutlined style={{ fontSize: 16 }} />
          Nouveau groupe
        </button>
      </div>

      {error && (
        <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      <div className="mb-4">
        <SearchField
          value={recherche}
          onChange={setRecherche}
          placeholder="Rechercher un groupe…"
          className="w-full sm:w-[280px]"
        />
      </div>

      {loading ? (
        <p className="text-body-md text-on-surface-variant">Chargement…</p>
      ) : filtres.length === 0 ? (
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
          <p className="text-body-md text-on-surface">
            {recherche ? "Aucun groupe ne correspond." : "Aucun groupe."}
          </p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Un groupe rassemble des droits, et peut aussi décider de l&apos;écran
            d&apos;accueil de ses membres.
          </p>
        </div>
      ) : (
        /* Une liste : on compare des groupes entre eux — droits, membres,
           accueil configuré — et une colonne se compare d'un coup d'œil. Le
           détail, lui, a sa propre page. */
        <div className="overflow-x-auto rounded-2xl border border-outline-soft bg-surface-container-lowest">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-soft bg-surface-row-alt">
                <Th>Groupe</Th>
                <Th align="right">Droits</Th>
                <Th align="right">Membres</Th>
                <Th>Accueil</Th>
                <Th align="right" />
              </tr>
            </thead>
            <tbody>
              {filtres.map((g) => {
                const parent = g.parent_id
                  ? groups.find((x) => x.id === g.parent_id)
                  : null;
                const accueilRegle =
                  g.landing_app_key || (g.accueil_personnalise && g.liens_rapides.length > 0);
                return (
                  <tr
                    key={g.id}
                    className="border-b border-hairline last:border-b-0 hover:bg-surface-container-low"
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/members/groups/${g.id}`}
                        className="text-body-sm font-medium text-on-surface hover:underline"
                      >
                        {g.name}
                      </Link>
                      {g.is_system && (
                        <span className="ml-2 rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                          Système
                        </span>
                      )}
                      {parent && (
                        <p className="text-label-sm text-outline">Sous-groupe de {parent.name}</p>
                      )}
                      {g.description && (
                        <p className="mt-0.5 max-w-[46ch] truncate text-label-md text-on-surface-variant">
                          {g.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-body-sm tabular-nums text-on-surface-variant">
                      {g.permissions.length}
                    </td>
                    <td className="px-4 py-2.5 text-right text-body-sm tabular-nums text-on-surface-variant">
                      {g.member_count}
                    </td>
                    <td className="px-4 py-2.5">
                      {accueilRegle ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-label-sm text-secondary">
                          <HomeOutlined style={{ fontSize: 12 }} />
                          Configuré
                        </span>
                      ) : (
                        <span className="text-label-md text-outline">Par défaut</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/members/groups/${g.id}`}
                        aria-label={`Ouvrir ${g.name}`}
                        className="inline-flex text-on-surface-variant hover:text-primary"
                      >
                        <ChevronRightOutlined style={{ fontSize: 18 }} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {createParent !== undefined && workspaceId && (
        <CreateGroupModal
          workspaceId={workspaceId}
          parent={createParent}
          onClose={() => setCreateParent(undefined)}
          onCreated={(group) => {
            setGroups((prev) => [...prev, group]);
            setToast({ message: `Groupe « ${group.name} » créé.`, tone: "success" });
          }}
        />
      )}

      {pendingDeletion && (
        <ConfirmDialog
          title={`Supprimer « ${pendingDeletion.name} » ?`}
          message="Les membres de ce groupe perdront les droits qu'il leur accordait. Les comptes ne sont pas supprimés."
          confirmLabel="Supprimer"
          busy={deleting}
          onConfirm={confirmDeletion}
          onCancel={() => setPendingDeletion(null)}
        />
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={`px-4 py-2 text-label-sm uppercase tracking-wide text-outline ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
