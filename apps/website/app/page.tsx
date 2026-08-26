"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AddOutlined,
  LanguageOutlined,
  OpenInNewOutlined,
  PendingOutlined,
} from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { SaisieRapide } from "@repo/ui/SaisieRapide";
import { usePermissions } from "@repo/auth/hooks/usePermissions";

import { DashboardShell } from "@/components/DashboardShell";
import { ETATS_SITE, api, type Site } from "@/app/lib/api";

const TEINTE: Record<Site["etat"], string> = {
  BROUILLON: "bg-surface-container text-on-surface-variant",
  EN_LIGNE: "bg-secondary/15 text-secondary",
  SUSPENDU: "bg-error-container/40 text-error",
};

/** La liste des sites de l'espace de travail.
 *
 *  Plusieurs sites par espace, et non un seul : un groupe a plusieurs marques,
 *  un institut a un site public et une vitrine interne.
 */
export default function SitesPage() {
  const { can } = usePermissions();
  const peutGerer = can("website.sites.manage");

  const [sites, setSites] = useState<Site[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [busy, setBusy] = useState(false);

  const charger = useCallback(async () => {
    try {
      setSites(await api.sites());
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setSites([]);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function creer(nom: string) {
    setBusy(true);
    setErreur(null);
    try {
      const site = await api.creerSite({ nom: nom.trim() });
      setOuvert(false);
      setToast(`« ${site.nom} » est créé. Sa page d'accueil vous attend.`);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[960px] p-4 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-sm text-on-surface">Sites</h1>
            <p className="mt-1 max-w-[68ch] text-body-sm text-on-surface-variant">
              Chaque site a ses pages, son thème et ses adresses. Ce que vous écrivez reste un
              brouillon jusqu&apos;à ce que vous publiiez.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOuvert(true)}
            disabled={!peutGerer}
            title={peutGerer ? undefined : "Vous n'avez pas le droit de créer un site."}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-label-lg text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <AddOutlined style={{ fontSize: 18 }} />
            Nouveau site
          </button>
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {sites === null ? (
          <p className="mt-8 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : sites.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-outline-soft p-8 text-center">
            <LanguageOutlined style={{ fontSize: 40 }} className="text-outline" />
            <p className="mt-2 text-title-sm text-on-surface">Aucun site pour l&apos;instant</p>
            <p className="mx-auto mt-1 max-w-[52ch] text-body-sm text-on-surface-variant">
              Créez-en un : il arrive avec une page d&apos;accueil vide et une adresse
              provisoire, le temps que vous branchiez votre propre nom de domaine.
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {sites.map((site) => (
              <li
                key={site.id}
                className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/sites/${site.id}`}
                    className="text-title-sm text-on-surface hover:text-primary"
                  >
                    {site.nom}
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-label-sm ${TEINTE[site.etat]}`}
                  >
                    {ETATS_SITE[site.etat]}
                  </span>
                </div>

                {site.adresse && (
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

                {site.pages_a_publier > 0 && (
                  <p className="mt-2 inline-flex items-center gap-1 text-body-sm text-on-surface-variant">
                    <PendingOutlined style={{ fontSize: 15 }} />
                    {site.pages_a_publier} page{site.pages_a_publier > 1 ? "s" : ""} en attente de
                    publication
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {ouvert && (
        <SaisieRapide
          titre="Nouveau site"
          intro="L'adresse provisoire du site est tirée de son nom. Vous brancherez votre propre nom de domaine plus tard."
          largeur="moyenne"
          champs={[
            { nom: "nom", libelle: "Nom du site", requis: true },
          ]}
          libelleValider="Créer"
          busy={busy}
          erreur={erreur}
          onValider={(valeurs) => void creer(valeurs.nom ?? "")}
          onFermer={() => setOuvert(false)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </DashboardShell>
  );
}
