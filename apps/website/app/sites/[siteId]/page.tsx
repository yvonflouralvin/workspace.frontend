"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AddOutlined,
  ArrowBackOutlined,
  CloudUploadOutlined,
  DeleteOutlineOutlined,
  HomeOutlined,
  OpenInNewOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  SettingsOutlined,
} from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { SaisieRapide } from "@repo/ui/SaisieRapide";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { usePermissions } from "@repo/auth/hooks/usePermissions";

import { DashboardShell } from "@/components/DashboardShell";
import { ETATS_SITE, api, type PageSite, type Site } from "@/app/lib/api";

/** Le tableau de bord d'un site : ses pages, son adresse, sa mise en ligne.
 *
 *  La publication est ici et non dans l'éditeur : publier engage LE SITE —
 *  toutes les pages modifiées d'un coup — alors que l'éditeur ne connaît que
 *  la page ouverte. Publier page par page depuis l'éditeur laisserait des
 *  liens pointer vers des pages qui n'existent pas encore en ligne.
 */
export default function SitePage() {
  const params = useParams<{ siteId: string }>();
  const siteId = Number(params.siteId);
  const { can } = usePermissions();
  const peutEditer = can("website.pages.editer");
  const peutPublier = can("website.publier");
  const peutGerer = can("website.sites.manage");

  const [site, setSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<PageSite[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [aSupprimer, setASupprimer] = useState<PageSite | null>(null);

  const charger = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([api.site(siteId), api.pages(siteId)]);
      setSite(s);
      setPages(p);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setPages([]);
    }
  }, [siteId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function agir(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setErreur(null);
    try {
      await action();
      setToast(message);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function creerPage(valeurs: Record<string, string>) {
    const titre = (valeurs.titre ?? "").trim();
    if (!titre) return;
    setBusy(true);
    setErreur(null);
    try {
      await api.creerPage(siteId, { titre, chemin: (valeurs.chemin ?? "").trim() || null });
      setOuvert(false);
      setToast("Page créée.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  const enAttente = site?.pages_a_publier ?? 0;

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[960px] p-4 md:p-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} />
          Tous les sites
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-sm text-on-surface">
              {site?.nom ?? "…"}
            </h1>
            {site?.adresse && (
              <a
                href={site.adresse}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary"
              >
                {site.adresse.replace(/^https?:\/\//, "")}
                <OpenInNewOutlined style={{ fontSize: 14 }} />
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/sites/${siteId}/ventes`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-label-lg text-on-surface transition-colors hover:bg-surface-container"
            >
              Ventes
            </Link>
            <Link
              href={`/sites/${siteId}/boutique`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-label-lg text-on-surface transition-colors hover:bg-surface-container"
            >
              Boutique
            </Link>
            <Link
              href={`/sites/${siteId}/medias`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-label-lg text-on-surface transition-colors hover:bg-surface-container"
            >
              Médias
            </Link>
            <Link
              href={`/sites/${siteId}/parametres`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-label-lg text-on-surface transition-colors hover:bg-surface-container"
            >
              <SettingsOutlined style={{ fontSize: 18 }} />
              Paramètres
            </Link>
            {site?.etat === "EN_LIGNE" && peutGerer && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void agir(() => api.suspendreSite(siteId), "Site suspendu.")}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-label-lg text-on-surface transition-colors hover:bg-surface-container disabled:opacity-40"
              >
                <PauseCircleOutlined style={{ fontSize: 18 }} />
                Suspendre
              </button>
            )}
            {site?.etat === "SUSPENDU" && peutGerer && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void agir(() => api.reprendreSite(siteId), "Site remis en ligne.")}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-label-lg text-on-surface transition-colors hover:bg-surface-container disabled:opacity-40"
              >
                <PlayCircleOutlined style={{ fontSize: 18 }} />
                Reprendre
              </button>
            )}
            <button
              type="button"
              disabled={busy || !peutPublier}
              title={peutPublier ? undefined : "Vous n'avez pas le droit de publier."}
              onClick={() =>
                void agir(
                  () => api.publierSite(siteId),
                  site?.etat === "EN_LIGNE" ? "Modifications publiées." : "Site mis en ligne.",
                )
              }
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-label-lg text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <CloudUploadOutlined style={{ fontSize: 18 }} />
              {site?.etat === "EN_LIGNE" ? "Publier les modifications" : "Mettre en ligne"}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-body-sm text-on-surface-variant">
          <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm">
            {site ? ETATS_SITE[site.etat] : "…"}
          </span>
          {enAttente > 0 ? (
            <span>
              {enAttente} page{enAttente > 1 ? "s" : ""} modifiée{enAttente > 1 ? "s" : ""} depuis
              la dernière publication.
            </span>
          ) : site?.etat === "EN_LIGNE" ? (
            <span>Tout ce qui est écrit est en ligne.</span>
          ) : (
            <span>Rien n&apos;est encore public.</span>
          )}
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <h2 className="text-title-sm text-on-surface">Pages</h2>
          <button
            type="button"
            disabled={!peutEditer}
            onClick={() => setOuvert(true)}
            title={peutEditer ? undefined : "Vous n'avez pas le droit d'ajouter une page."}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-label-lg text-on-surface transition-colors hover:bg-surface-container disabled:opacity-40"
          >
            <AddOutlined style={{ fontSize: 18 }} />
            Nouvelle page
          </button>
        </div>

        {pages === null ? (
          <p className="mt-4 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : (
          <ul className="mt-3 divide-y divide-hairline rounded-2xl border border-outline-soft bg-surface-container-lowest">
            {pages.map((page) => (
              <li key={page.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <Link
                  href={`/sites/${siteId}/pages/${page.id}`}
                  className="min-w-0 flex-1"
                >
                  <span className="flex items-center gap-1.5 text-body-md text-on-surface hover:text-primary">
                    {page.est_accueil && (
                      <HomeOutlined style={{ fontSize: 16 }} className="text-outline" />
                    )}
                    <span className="truncate">{page.titre}</span>
                  </span>
                  <span className="block truncate text-label-md text-outline">{page.chemin}</span>
                </Link>

                {page.a_des_modifications ? (
                  <span className="shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                    modifiée
                  </span>
                ) : page.version_publiee_id ? (
                  <span className="shrink-0 rounded-full bg-secondary/15 px-2 py-0.5 text-label-sm text-secondary">
                    en ligne
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                    brouillon
                  </span>
                )}

                {peutEditer && !page.est_accueil && (
                  <button
                    type="button"
                    aria-label={`Supprimer ${page.titre}`}
                    onClick={() => setASupprimer(page)}
                    className="shrink-0 text-outline transition-colors hover:text-error"
                  >
                    <DeleteOutlineOutlined style={{ fontSize: 18 }} />
                  </button>
                )}
              </li>
            ))}
            {pages.length === 0 && (
              <li className="px-4 py-6 text-body-sm text-on-surface-variant">
                Aucune page. Le site en reçoit normalement une à sa création.
              </li>
            )}
          </ul>
        )}
      </div>

      {ouvert && (
        <SaisieRapide
          titre="Nouvelle page"
          intro="Le chemin se déduit du titre si vous le laissez vide."
          largeur="moyenne"
          champs={[
            { nom: "titre", libelle: "Titre", requis: true },
            { nom: "chemin", libelle: "Chemin (ex. /a-propos)", aide: "Facultatif" },
          ]}
          libelleValider="Créer"
          busy={busy}
          erreur={erreur}
          onValider={(valeurs) => void creerPage(valeurs)}
          onFermer={() => setOuvert(false)}
        />
      )}

      {aSupprimer && (
        <ConfirmDialog
          title={`Supprimer « ${aSupprimer.titre} » ?`}
          message="La page et son historique de versions disparaissent. Si elle était en ligne, son adresse renverra une page introuvable."
          confirmLabel="Supprimer"
          busy={busy}
          onCancel={() => setASupprimer(null)}
          onConfirm={() => {
            const cible = aSupprimer;
            setASupprimer(null);
            void agir(() => api.supprimerPage(cible.id), "Page supprimée.");
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </DashboardShell>
  );
}
