"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircleOutlined,
  LockOutlined,
  OpenInNewOutlined,
  SearchOutlined,
  StorefrontOutlined,
} from "@mui/icons-material";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useSessionStore } from "@repo/auth/store/session.store";
import { MODE_LABELS, appsApi, type AppEntree } from "@/app/lib/apps-api";

const CHAMP =
  "h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

/** Où ouvrir chaque application. La couleur est décorative ; l'URL, elle, vient
 *  de l'environnement — une application servie sur un autre domaine ne doit pas
 *  dépendre d'une valeur écrite en dur. */
const META: Record<string, { color: string; url?: string }> = {
  workspace: { color: "#3525cd", url: process.env.NEXT_PUBLIC_WORKSPACE_DOMAIN },
  hr: { color: "#006c49", url: process.env.NEXT_PUBLIC_AUTH_API_HR_DOMAIN },
  approval_flows: { color: "#004598", url: process.env.NEXT_PUBLIC_AUTH_API_APPROVAL_FLOWS_DOMAIN },
  hosto: { color: "#0e7490", url: process.env.NEXT_PUBLIC_AUTH_API_HOSTO_DOMAIN },
  documents: { color: "#7c3aed", url: process.env.NEXT_PUBLIC_AUTH_API_DOCUMENTS_DOMAIN },
  tiers: { color: "#b45309", url: process.env.NEXT_PUBLIC_AUTH_API_TIERS_DOMAIN },
  stock: { color: "#006c49", url: process.env.NEXT_PUBLIC_AUTH_API_STOCK_DOMAIN },
  ventes: { color: "#e11d48", url: process.env.NEXT_PUBLIC_AUTH_API_VENTES_DOMAIN },
  dashboard: { color: "#0f766e", url: process.env.NEXT_PUBLIC_AUTH_API_DASHBOARD_DOMAIN },
  saas_monitoring: { color: "#0b1c30", url: "/admin" },
};

function initiales(nom: string) {
  return nom.split(" ").map((m) => m[0]).join("").slice(0, 2).toUpperCase();
}

/** Les applications du workspace : ce qui est actif, ce qui ne l'est pas, et la
 *  porte vers la boutique.
 *
 *  On montre TOUT le catalogue, y compris ce qui n'est pas activé : masquer ce
 *  qu'on n'a pas obligerait à passer par la boutique pour savoir ce qui existe.
 */
export default function AppsPage() {
  const { can } = usePermissions();
  const workspaceId = useSessionStore((s) => s.activeWorkspace?.id);
  const estProprietaire = useSessionStore((s) => s.activeWorkspace?.is_owner ?? false);
  const peutGerer = estProprietaire || can("workspace.apps.manage");

  const [apps, setApps] = useState<AppEntree[] | null>(null);
  const [recherche, setRecherche] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aDesactiver, setADesactiver] = useState<AppEntree | null>(null);

  const charger = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setApps(await appsApi.duWorkspace(Number(workspaceId)));
    } catch {
      setErreur("Impossible de charger les applications.");
      setApps([]);
    }
  }, [workspaceId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return apps ?? [];
    return (apps ?? []).filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.key.toLowerCase().includes(q) ||
        (a.description ?? "").toLowerCase().includes(q)
    );
  }, [apps, recherche]);

  const actives = filtrees.filter((a) => a.activee);
  const inactives = filtrees.filter((a) => !a.activee);

  async function basculer(app: AppEntree, activer: boolean) {
    if (!workspaceId) return;
    setBusy(true);
    setErreur(null);
    try {
      const suite = activer
        ? await appsApi.activer(Number(workspaceId), app.id)
        : await appsApi.desactiver(Number(workspaceId), app.id);
      setApps(suite);
      setToast(activer ? `${app.name} activée.` : `${app.name} désactivée.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Opération impossible.");
    } finally {
      setADesactiver(null);
      setBusy(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-md text-on-surface">Applications</h1>
          <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
            Ce que ce workspace utilise. Vous pouvez en activer d&apos;autres depuis la
            boutique, ou désactiver ce qui ne sert plus.
          </p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <span className="relative">
            <SearchOutlined
              style={{ fontSize: 16 }}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-outline"
            />
            <input
              aria-label="Rechercher une application"
              className={`${CHAMP} w-[220px] pl-8`}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher…"
            />
          </span>
          <Link
            href="/apps/boutique"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container"
          >
            <StorefrontOutlined style={{ fontSize: 16 }} />
            Boutique
          </Link>
        </div>
      </div>

      {erreur && (
        <p className="mt-3 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      {apps === null && <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>}

      {apps !== null && (
        <>
          <Section
            titre="Actives"
            vide="Aucune application active."
            apps={actives}
            peutGerer={peutGerer}
            busy={busy}
            onBasculer={(a) => setADesactiver(a)}
          />
          {inactives.length > 0 && (
            <Section
              titre="Disponibles"
              vide=""
              apps={inactives}
              peutGerer={peutGerer}
              busy={busy}
              onBasculer={(a) => basculer(a, true)}
            />
          )}
        </>
      )}

      {aDesactiver && (
        <ConfirmDialog
          title={`Désactiver ${aDesactiver.name} ?`}
          message="Les données ne sont pas effacées : l'application redevient accessible dès qu'elle est réactivée. Les membres n'y auront plus accès entre-temps."
          confirmLabel="Désactiver"
          onConfirm={() => basculer(aDesactiver, false)}
          onCancel={() => setADesactiver(null)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function Section({
  titre,
  vide,
  apps,
  peutGerer,
  busy,
  onBasculer,
}: {
  titre: string;
  vide: string;
  apps: AppEntree[];
  peutGerer: boolean;
  busy: boolean;
  onBasculer: (app: AppEntree) => void;
}) {
  if (!apps.length && !vide) return null;
  return (
    <section className="mt-6">
      <p className="mb-2 text-label-sm uppercase text-outline">
        {titre}
        {apps.length > 0 && <span className="ml-2 text-outline-variant">{apps.length}</span>}
      </p>
      {apps.length === 0 ? (
        <p className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-6 text-center text-body-sm text-on-surface-variant">
          {vide}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {apps.map((app) => {
            const meta = META[app.key];
            return (
              <article
                key={app.id}
                className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 flex-none items-center justify-center rounded-xl text-label-md font-semibold text-white"
                    style={{ backgroundColor: meta?.color ?? "#777587" }}
                  >
                    {initiales(app.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-body-md font-medium text-on-surface">
                      {app.name}
                      {app.est_systeme && (
                        <span
                          title="Nécessaire au fonctionnement du workspace"
                          className="text-outline"
                        >
                          <LockOutlined style={{ fontSize: 14 }} />
                        </span>
                      )}
                    </p>
                    {app.description && (
                      <p className="mt-0.5 line-clamp-2 text-body-sm text-on-surface-variant">
                        {app.description}
                      </p>
                    )}
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 text-label-md text-outline">
                      <span>{MODE_LABELS[app.mode_activation] ?? app.mode_activation}</span>
                      {app.prix != null && (
                        <span>
                          {app.prix} {app.devise ?? ""}
                        </span>
                      )}
                      {app.expire_le && (
                        <span>
                          jusqu&apos;au{" "}
                          {new Date(app.expire_le).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </p>
                    {app.motif_suspension && !app.activee && (
                      <p className="mt-1 text-label-md text-error">{app.motif_suspension}</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {app.activee && meta?.url && (
                    <a
                      href={meta.url}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
                    >
                      <OpenInNewOutlined style={{ fontSize: 15 }} />
                      Ouvrir
                    </a>
                  )}
                  {app.activee && (
                    <span className="inline-flex items-center gap-1 text-label-md text-secondary">
                      <CheckCircleOutlined style={{ fontSize: 14 }} />
                      Active
                    </span>
                  )}
                  <span className="flex-1" />
                  {peutGerer && !app.est_systeme && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onBasculer(app)}
                      className={`h-8 rounded-lg px-3 text-body-sm font-semibold transition-colors disabled:opacity-50 ${
                        app.activee
                          ? "border border-outline-soft text-on-surface-variant hover:text-error"
                          : "bg-primary text-on-primary hover:bg-primary-container"
                      }`}
                    >
                      {app.activee ? "Désactiver" : "Activer"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
