"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowBackOutlined } from "@mui/icons-material";
import { useSessionStore } from "@repo/auth/store/session.store";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Toast } from "@repo/ui/Toast";
import { getGroup, listPermissions, ApiError } from "@/app/lib/api";
import type { AppPermissionGroup, Group } from "@/app/lib/types";
import { OngletDroits } from "@/components/groupes/OngletDroits";
import { OngletAccueil } from "@/components/groupes/OngletAccueil";

type Onglet = "droits" | "accueil";

/** Le détail d'un groupe.
 *
 *  Deux onglets parce que ce sont deux sujets : ce qu'un groupe AUTORISE, et
 *  ce qu'il MONTRE à ses membres quand ils se connectent. Les mêler dans un
 *  seul panneau ferait une page où l'on ne trouve plus rien.
 */
export default function GroupeDetailPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = use(params);
  const activeWorkspace = useSessionStore((s) => s.activeWorkspace);
  const { can } = usePermissions();
  const workspaceId = activeWorkspace?.id;
  const peutGerer = can("groups.manage");

  const [onglet, setOnglet] = useState<Onglet>("droits");
  const [groupe, setGroupe] = useState<Group | null>(null);
  const [catalogue, setCatalogue] = useState<AppPermissionGroup[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "success" | "error" } | null>(null);

  const charger = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setGroupe(await getGroup(workspaceId, Number(groupId)));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : "Groupe introuvable.");
    }
  }, [workspaceId, groupId]);

  useEffect(() => {
    void charger();
    listPermissions()
      .then((r) => setCatalogue(r.groups))
      .catch(() => {});
  }, [charger]);

  if (!peutGerer) {
    return (
      <div className="mx-auto max-w-[1024px] p-4 md:p-8">
        <p className="text-body-md text-on-surface-variant">
          Vous n&apos;avez pas le droit de gérer les groupes.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1024px] p-4 md:p-8">
      <Link
        href="/members/groups"
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowBackOutlined style={{ fontSize: 15 }} />
        Groupes
      </Link>

      {erreur && (
        <p className="mb-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      {!groupe ? (
        !erreur && <p className="text-body-md text-on-surface-variant">Chargement…</p>
      ) : (
        <>
          <header className="mb-5">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-headline-md text-on-surface">
              {groupe.name}
              {groupe.is_system && (
                <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-md font-normal text-on-surface-variant">
                  Groupe système
                </span>
              )}
            </h1>
            <p className="mt-1 max-w-[70ch] text-body-md text-on-surface-variant">
              {groupe.description || "Aucune description."}
            </p>
            <p className="mt-1 text-label-md text-outline">
              {groupe.permissions.length} droit{groupe.permissions.length > 1 ? "s" : ""} ·{" "}
              {groupe.member_count} membre{groupe.member_count > 1 ? "s" : ""}
            </p>
          </header>

          <div className="mb-5 flex gap-1 border-b border-outline-soft">
            {([
              ["droits", "Droits"],
              ["accueil", "Écran d'accueil"],
            ] as const).map(([cle, libelle]) => (
              <button
                key={cle}
                type="button"
                onClick={() => setOnglet(cle)}
                className={`-mb-px border-b-2 px-4 py-2 text-body-sm transition-colors ${
                  onglet === cle
                    ? "border-primary font-semibold text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {libelle}
              </button>
            ))}
          </div>

          {onglet === "droits" ? (
            <OngletDroits
              workspaceId={workspaceId!}
              groupe={groupe}
              catalogue={catalogue}
              onChange={(g, message) => {
                setGroupe(g);
                setToast({ message, tone: "success" });
              }}
              onErreur={(m) => setToast({ message: m, tone: "error" })}
            />
          ) : (
            <OngletAccueil
              workspaceId={workspaceId!}
              groupe={groupe}
              onChange={(g, message) => {
                setGroupe(g);
                setToast({ message, tone: "success" });
              }}
              onErreur={(m) => setToast({ message: m, tone: "error" })}
            />
          )}
        </>
      )}

      {toast && (
        <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
