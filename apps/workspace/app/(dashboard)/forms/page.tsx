"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AddOutlined,
  AssignmentTurnedInOutlined,
  DescriptionOutlined,
  FolderOpenOutlined,
  PictureAsPdfOutlined,
} from "@mui/icons-material";
import { Pagination } from "@repo/ui/Pagination";
import { PaletteRecherche, type EntreePalette } from "@repo/ui/PaletteRecherche";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { formsApi, type MesEnvois } from "@/app/lib/forms-api";
import { catalogue, type EntreeCatalogue } from "@/app/lib/catalogue-formulaires";

const TAILLE = 20;

const TEINTE_APPROBATION: Record<string, string> = {
  EN_ATTENTE: "bg-surface-container text-on-surface-variant",
  APPROUVEE: "bg-secondary/15 text-secondary",
  REFUSEE: "bg-error-container/60 text-error",
};

const LIBELLE_APPROBATION: Record<string, string> = {
  EN_ATTENTE: "En attente",
  APPROUVEE: "Approuvée",
  REFUSEE: "Refusée",
};

function date(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Ce que J'AI envoyé.
 *
 *  La page répondait à trois questions à la fois, en onglets : ce que je
 *  conçois, ce qu'on m'a partagé, ce que je peux remplir. Trois métiers
 *  différents sur un même écran, et aucun des trois chez lui.
 *
 *  Elle n'en garde qu'une, celle de tout le monde : « qu'est-ce que j'ai
 *  envoyé, et où ça en est ». Remplir un nouveau formulaire se fait par la
 *  palette — le geste de la recherche globale, qu'on connaît déjà. Concevoir
 *  est un métier à part, et vit sur sa page.
 */
export default function MesEnvoisPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const peutCreer = can("projects.formulaires.creer");

  const [envois, setEnvois] = useState<MesEnvois | null>(null);
  const [page, setPage] = useState(1);
  const [erreur, setErreur] = useState<string | null>(null);

  const [palette, setPalette] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [entrees, setEntrees] = useState<EntreeCatalogue[]>([]);
  const [chargement, setChargement] = useState(false);

  const [creation, setCreation] = useState(false);
  const [titre, setTitre] = useState("");
  const [busy, setBusy] = useState(false);

  const charger = useCallback(async () => {
    try {
      setEnvois(await formsApi.mesEnvois({ page, taille: TAILLE }));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Liste indisponible.");
      setEnvois({ items: [], total: 0, page: 1, taille: TAILLE });
    }
  }, [page]);

  useEffect(() => {
    void charger();
  }, [charger]);

  // Le catalogue se recharge à la frappe, comme la recherche globale : la liste
  // dépend des droits et de ce qui est publié, pas d'un instantané figé à
  // l'ouverture.
  useEffect(() => {
    if (!palette) return;
    setChargement(true);
    const t = setTimeout(() => {
      catalogue(recherche)
        .then(setEntrees)
        .catch(() => setEntrees([]))
        .finally(() => setChargement(false));
    }, 250);
    return () => clearTimeout(t);
  }, [palette, recherche]);

  async function creer() {
    if (!titre.trim()) return;
    setBusy(true);
    setErreur(null);
    try {
      const forme = await formsApi.creer(titre.trim());
      router.push(`/forms/${forme.id}`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
      setBusy(false);
    }
  }

  const total = envois?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / TAILLE));

  return (
    <div className="mx-auto max-w-[1024px] p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-sm text-on-surface">Formulaires</h1>
          <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
            Ce que vous avez envoyé, et où en est chaque demande.
          </p>
        </div>
        <div className="flex flex-none flex-wrap gap-2">
          <Link
            href="/forms/miens"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            <FolderOpenOutlined style={{ fontSize: 17 }} />
            Mes formulaires
          </Link>
          <button
            type="button"
            onClick={() => {
              setRecherche("");
              setPalette(true);
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Nouveau
          </button>
          {peutCreer && (
            <button
              type="button"
              onClick={() => setCreation((v) => !v)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
            >
              Créer
            </button>
          )}
        </div>
      </div>

      {creation && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-3">
          <input
            autoFocus
            className="h-9 min-w-[260px] flex-1 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && creer()}
            placeholder="Titre du formulaire…"
          />
          <button
            type="button"
            disabled={busy || !titre.trim()}
            onClick={creer}
            className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
          >
            Créer
          </button>
          <button
            type="button"
            onClick={() => setCreation(false)}
            className="h-9 rounded-lg px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container"
          >
            Annuler
          </button>
        </div>
      )}

      {erreur && (
        <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      {envois === null ? (
        <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
      ) : envois.items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-12 text-center">
          <DescriptionOutlined style={{ fontSize: 30 }} className="text-outline" />
          <p className="mt-2 text-body-md text-on-surface">Vous n&apos;avez encore rien envoyé.</p>
          <p className="mx-auto mt-1 max-w-[52ch] text-body-sm text-on-surface-variant">
            « Nouveau » ouvre la liste de ce que vous pouvez remplir.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
            {envois.items.map((envoi) => (
              <div
                key={envoi.soumission_id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-container-low"
              >
                <Link
                  href={`/forms/${envoi.formulaire_id}/repondre`}
                  className="min-w-0 flex-1"
                >
                  <span className="block truncate text-body-md font-medium text-on-surface">
                    {envoi.formulaire_titre}
                  </span>
                  <span className="block text-label-md text-outline">
                    Envoyé le {date(envoi.envoye_le)}
                  </span>
                </Link>
                <span className="w-[110px] flex-none text-center">
                  {envoi.approbation_statut ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-label-md ${
                        TEINTE_APPROBATION[envoi.approbation_statut]
                      }`}
                    >
                      {LIBELLE_APPROBATION[envoi.approbation_statut]}
                    </span>
                  ) : (
                    <span className="text-label-md text-outline-variant">—</span>
                  )}
                </span>
                {envoi.jeton_recu && (
                  <a
                    href={formsApi.recuUrl(envoi.jeton_recu)}
                    aria-label={`Télécharger ${envoi.formulaire_titre} en PDF`}
                    title="Télécharger cette réponse en PDF"
                    className="flex-none text-outline transition-colors hover:text-primary"
                  >
                    <PictureAsPdfOutlined style={{ fontSize: 17 }} />
                  </a>
                )}
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div className="mt-4 flex justify-center">
              <Pagination page={page} pages={pages} onChange={setPage} />
            </div>
          )}
        </>
      )}

      {palette && (
        <PaletteRecherche
          titre="Remplir un formulaire"
          placeholder="Quel formulaire voulez-vous remplir ?"
          recherche={recherche}
          onRecherche={setRecherche}
          chargement={chargement}
          vide="Aucun formulaire ne vous attend."
          entrees={entrees.map(
            (e): EntreePalette => ({
              cle: e.cle,
              titre: e.titre,
              description: e.description,
              detail: e.apres,
              icone:
                e.source === "APPROBATION" ? (
                  <AssignmentTurnedInOutlined style={{ fontSize: 18 }} />
                ) : (
                  <DescriptionOutlined style={{ fontSize: 18 }} />
                ),
            })
          )}
          onChoisir={(choix) => {
            const entree = entrees.find((e) => e.cle === choix.cle);
            if (!entree) return;
            setPalette(false);
            // Un circuit vit dans une autre application : on ouvre à côté
            // plutôt que d'éjecter l'utilisateur de sa liste.
            if (entree.href.startsWith("http")) window.open(entree.href, "_blank", "noreferrer");
            else router.push(entree.href);
          }}
          onFermer={() => setPalette(false)}
        />
      )}
    </div>
  );
}
