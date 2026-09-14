"use client";

import { useState } from "react";
import { AddOutlined, ArrowBackOutlined, LanguageOutlined } from "@mui/icons-material";
import { Modal } from "@repo/ui/Modal";
import { THEMES_SITE, type ThemeSite } from "@repo/site-widgets/themes";
import { api, type Site } from "@/app/lib/api";

type Etape = "choix" | "nom";

/** Créer un site : vierge, ou depuis un thème.
 *
 *  Même logique que le tiroir de sections du constructeur (`ChoixSection`) —
 *  une seule porte, deux réponses — mais un cran plus haut : ici on choisit
 *  un SITE entier, pas une section. Un thème pose ses pages, son menu, ses
 *  images et le publie directement ; le site vierge garde le comportement
 *  d'origine (une page d'accueil vide).
 */
export function NouveauSiteModal({
  onFerme,
  onCree,
}: {
  onFerme: () => void;
  onCree: (site: Site) => void;
}) {
  const [etape, setEtape] = useState<Etape>("choix");
  const [theme, setTheme] = useState<ThemeSite | null>(null);
  const [nom, setNom] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function choisir(t: ThemeSite | null) {
    setTheme(t);
    setErreur(null);
    setEtape("nom");
  }

  async function creer() {
    const valeur = nom.trim();
    if (!valeur) return;
    setBusy(true);
    setErreur(null);
    try {
      const site = theme
        ? await api.creerSiteDepuisTheme({ themeCle: theme.cle, nom: valeur })
        : await api.creerSite({ nom: valeur });
      onCree(site);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Nouveau site"
      onClose={() => !busy && onFerme()}
      width="max-w-[52rem]"
    >
      {etape === "choix" ? (
        <div className="space-y-4">
          <p className="text-body-sm text-on-surface-variant">
            Partez d&apos;une page blanche, ou d&apos;un thème déjà écrit — pages, navigation et
            images incluses. Tout reste à retoucher après coup, comme n&apos;importe quel bloc du
            constructeur.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => choisir(null)}
              className="group rounded-xl border border-outline-soft p-3 text-left transition-colors hover:border-primary"
            >
              <span className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container">
                <AddOutlined style={{ fontSize: 28 }} className="text-outline" />
              </span>
              <span className="mt-2.5 block text-body-sm font-medium text-on-surface">Site vierge</span>
              <span className="mt-0.5 block text-label-sm text-outline">
                Une page d&apos;accueil vide, à construire pas à pas.
              </span>
            </button>

            {THEMES_SITE.map((t) => (
              <button
                key={t.cle}
                type="button"
                onClick={() => choisir(t)}
                className="group rounded-xl border border-outline-soft p-3 text-left transition-colors hover:border-primary"
              >
                <ApercuTheme theme={t} />
                <span className="mt-2.5 block text-body-sm font-medium text-on-surface">{t.nom}</span>
                <span className="mt-0.5 block text-label-sm text-outline">{t.secteur}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void creer();
          }}
          className="space-y-4"
        >
          <button
            type="button"
            onClick={() => setEtape("choix")}
            disabled={busy}
            className="inline-flex items-center gap-1 text-label-lg text-on-surface-variant hover:text-primary disabled:opacity-40"
          >
            <ArrowBackOutlined style={{ fontSize: 16 }} />
            {theme ? theme.nom : "Site vierge"}
          </button>

          {erreur && (
            <p className="rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">{erreur}</p>
          )}

          <label className="block">
            <span className="mb-1 block text-label-lg text-on-surface-variant">Nom du site</span>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              autoFocus
              required
              disabled={busy}
              placeholder={theme ? theme.nom : "Mon site"}
              className="h-10 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-md text-on-surface outline-none focus:border-primary disabled:opacity-60"
            />
            <span className="mt-1 block text-label-sm text-outline">
              L&apos;adresse provisoire du site est tirée de son nom. Vous brancherez votre propre
              nom de domaine plus tard.
            </span>
          </label>

          {theme && (
            <p className="rounded-lg bg-surface-container px-3 py-2 text-body-sm text-on-surface-variant">
              {theme.pages.length} pages seront créées avec leurs images, et le site sera publié
              directement — comptez une bonne minute.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="submit"
              disabled={busy || !nom.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-label-lg text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {busy && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
              )}
              {busy ? "Création en cours…" : "Créer le site"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function ApercuTheme({ theme }: { theme: ThemeSite }) {
  return (
    <span
      className="flex h-24 flex-col overflow-hidden rounded-lg border border-outline-soft"
      style={{ backgroundColor: theme.apercu.fond }}
    >
      <span className="flex items-center gap-1.5 px-2.5 py-2" style={{ backgroundColor: theme.apercu.primaire }}>
        <LanguageOutlined style={{ fontSize: 12 }} className="text-white/90" />
        <span className="h-1 w-10 rounded-full bg-white/70" />
        <span className="ml-auto flex gap-1">
          <span className="h-1 w-3 rounded-full bg-white/50" />
          <span className="h-1 w-3 rounded-full bg-white/50" />
        </span>
      </span>
      <span className="flex flex-1 flex-col items-center justify-center gap-1.5 px-3">
        <span
          className="h-1.5 w-3/5 rounded-full"
          style={{ backgroundColor: theme.apercu.secondaire, fontFamily: theme.apercu.policeSerif ? "Georgia, serif" : undefined }}
        />
        <span className="h-1 w-2/5 rounded-full opacity-40" style={{ backgroundColor: theme.apercu.secondaire }} />
      </span>
    </span>
  );
}
