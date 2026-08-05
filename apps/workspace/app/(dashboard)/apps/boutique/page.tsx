"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowBackOutlined,
  CheckCircleOutlined,
  KeyOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useSessionStore } from "@repo/auth/store/session.store";
import { MODE_LABELS, appsApi, type AppEntree } from "@/app/lib/apps-api";

const CHAMP =
  "h-10 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

/** La boutique.
 *
 *  Deux façons de trouver : par nom, pour ce qui est publié ; par identifiant
 *  EXACT, pour ce qui ne l'est pas. Les applications taillées pour une
 *  entreprise donnée n'ont pas à défiler dans un catalogue public — leur
 *  identifiant est la clé, et c'est le serveur qui l'exige entier.
 */
export default function BoutiquePage() {
  const { can } = usePermissions();
  const workspaceId = useSessionStore((s) => s.activeWorkspace?.id);
  const estProprietaire = useSessionStore((s) => s.activeWorkspace?.is_owner ?? false);
  const peutGerer = estProprietaire || can("workspace.apps.manage");

  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<AppEntree[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codeDemande, setCodeDemande] = useState<AppEntree | null>(null);
  const [code, setCode] = useState("");

  const chercher = useCallback(
    async (terme: string) => {
      if (!workspaceId) return;
      try {
        setResultats(await appsApi.boutique(Number(workspaceId), terme || undefined));
      } catch {
        setResultats([]);
      }
    },
    [workspaceId]
  );

  useEffect(() => {
    // Débounce : chaque frappe interroge le serveur, qui seul sait ce qu'un
    // identifiant exact doit révéler.
    const t = setTimeout(() => void chercher(recherche), 250);
    return () => clearTimeout(t);
  }, [recherche, chercher]);

  async function activer(app: AppEntree, avecCode?: string) {
    if (!workspaceId) return;
    setBusy(true);
    setErreur(null);
    try {
      await appsApi.activer(Number(workspaceId), app.id, avecCode);
      setToast(`${app.name} activée.`);
      setCodeDemande(null);
      setCode("");
      await chercher(recherche);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Activation impossible.";
      // 402 → l'application demande un code : on ouvre le champ plutôt que
      // d'afficher un refus que l'utilisateur ne saurait pas lever.
      if (/code d'activation/i.test(message) && !avecCode) {
        setCodeDemande(app);
      } else {
        setErreur(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-[900px] mx-auto">
      <Link
        href="/apps"
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowBackOutlined style={{ fontSize: 15 }} /> Applications
      </Link>

      <h1 className="font-display text-headline-md text-on-surface">Boutique</h1>
      <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
        Cherchez une application par son nom. Certaines, réservées à une organisation,
        n&apos;apparaissent qu&apos;en saisissant leur identifiant exact.
      </p>

      <div className="relative mt-5">
        <SearchOutlined
          style={{ fontSize: 18 }}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline"
        />
        <input
          autoFocus
          aria-label="Rechercher dans la boutique"
          className={`${CHAMP} w-full pl-10`}
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Nom de l'application, ou son identifiant complet…"
        />
      </div>

      {erreur && (
        <p className="mt-3 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      {resultats === null && <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>}
      {resultats?.length === 0 && (
        <p className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center text-body-sm text-on-surface-variant">
          {recherche.trim()
            ? "Aucune application ne correspond. Si elle est réservée à votre organisation, saisissez son identifiant complet."
            : "Aucune application disponible."}
        </p>
      )}

      <div className="mt-5 space-y-3">
        {(resultats ?? []).map((app) => (
          <article
            key={app.id}
            className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
          >
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-body-md font-medium text-on-surface">{app.name}</p>
                {app.description && (
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">{app.description}</p>
                )}
                <p className="mt-1 flex flex-wrap items-center gap-x-3 text-label-md text-outline">
                  <span>{MODE_LABELS[app.mode_activation] ?? app.mode_activation}</span>
                  {app.prix != null && (
                    <span>
                      {app.prix} {app.devise ?? ""}
                      {app.mode_activation === "SOUSCRIPTION" ? " / mois" : ""}
                    </span>
                  )}
                  {app.visibilite === "UUID" && <span>Réservée</span>}
                </p>
              </div>
              {app.activee ? (
                <span className="inline-flex flex-none items-center gap-1 text-body-sm font-medium text-secondary">
                  <CheckCircleOutlined style={{ fontSize: 16 }} />
                  Déjà active
                </span>
              ) : (
                peutGerer && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => activer(app)}
                    className="h-9 flex-none rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
                  >
                    {app.mode_activation === "GRATUIT" ? "Activer" : "J'ai un code"}
                  </button>
                )
              )}
            </div>

            {codeDemande?.id === app.id && (
              <div className="mt-3 rounded-xl border border-outline-soft bg-surface-container-low/50 p-3">
                <p className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                  <KeyOutlined style={{ fontSize: 15 }} />
                  Cette application demande un code d&apos;activation.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    autoFocus
                    aria-label="Code d'activation"
                    className={`${CHAMP} min-w-[200px] flex-1 font-mono uppercase`}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && activer(app, code)}
                    placeholder="XXXXXXXXXXXX"
                  />
                  <button
                    type="button"
                    disabled={busy || !code.trim()}
                    onClick={() => activer(app, code.trim())}
                    className="h-10 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
                  >
                    Valider
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCodeDemande(null);
                      setCode("");
                    }}
                    className="h-10 rounded-lg px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
