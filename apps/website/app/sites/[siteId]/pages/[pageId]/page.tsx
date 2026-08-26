"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowBackOutlined,
  HistoryOutlined,
  CloudUploadOutlined,
  DesktopWindowsOutlined,
  PhoneIphoneOutlined,
  RedoOutlined,
  TabletMacOutlined,
  UndoOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { arbreVide } from "@repo/site-widgets/arbre";
import type { Cible } from "@repo/site-widgets/types";

import { Arborescence } from "@/components/builder/Arborescence";
import { Historique } from "@/components/builder/Historique";
import { Bibliotheque } from "@/components/builder/Bibliotheque";
import { Canvas } from "@/components/builder/Canvas";
import { Inspecteur } from "@/components/builder/Inspecteur";
import { Palette } from "@/components/builder/Palette";
import { useBuilder } from "@/components/builder/store";
import {
  ConflitRevision,
  api,
  urlMediaEditeur,
  type Media,
  type PageDetail,
  type PageSite,
  type Site,
} from "@/app/lib/api";

/** Le délai d'inactivité au bout duquel le brouillon part au serveur.
 *
 *  Assez long pour qu'une phrase tapée ne produise pas une requête par lettre,
 *  assez court pour qu'un onglet fermé par accident ne coûte qu'une phrase. */
const DELAI_AUTO = 1200;

const ZONES: { cle: "page" | "entete" | "pied"; libelle: string; aide: string }[] = [
  { cle: "page", libelle: "Page", aide: "Le contenu de cette page seulement" },
  { cle: "entete", libelle: "En-tête", aide: "Partagé par toutes les pages du site" },
  { cle: "pied", libelle: "Pied", aide: "Partagé par toutes les pages du site" },
];

const APPAREILS: { cle: Cible; libelle: string; Icone: typeof DesktopWindowsOutlined }[] = [
  { cle: "bureau", libelle: "Bureau", Icone: DesktopWindowsOutlined },
  { cle: "tablette", libelle: "Tablette", Icone: TabletMacOutlined },
  { cle: "mobile", libelle: "Mobile", Icone: PhoneIphoneOutlined },
];

/** L'éditeur, plein écran.
 *
 *  Il sort volontairement de la coquille applicative : la barre latérale et
 *  l'en-tête de la plateforme mangeraient la largeur qui sert justement à
 *  juger la mise en page. On y revient par un lien explicite.
 */
export default function BuilderPage() {
  const params = useParams<{ siteId: string; pageId: string }>();
  const siteId = Number(params.siteId);
  const pageId = Number(params.pageId);

  const { can } = usePermissions();
  const peutEditer = can("website.pages.editer");
  const peutPublier = can("website.publier");

  const {
    arbre,
    cible,
    sale,
    enregistrement,
    messageErreur,
    passe,
    futur,
    charger: chargerArbre,
    annuler,
    refaire,
    viser,
    marquerEnregistre,
    marquerEnregistrement,
  } = useBuilder();

  const [site, setSite] = useState<Site | null>(null);
  const [page, setPage] = useState<PageDetail | null>(null);
  const [pages, setPages] = useState<PageSite[]>([]);
  const [medias, setMedias] = useState<Media[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [conflit, setConflit] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Le choix en attente de la bibliothèque : la modale ne sait pas OÙ poser
   *  l'image, c'est l'inspecteur qui le lui dit en confiant une fonction. */
  const [poser, setPoser] = useState<((media: Media) => void) | null>(null);

  /** Ce qu'on édite : la page, l'en-tête du site, ou son pied.
   *
   *  Le même canevas, le même inspecteur, la même palette — seule la source de
   *  l'arbre change. En-tête et pied appartiennent au SITE : les éditer depuis
   *  un écran à part obligerait à y refaire tout le constructeur, et à tenir
   *  deux éditeurs d'accord pour toujours. */
  const [zone, setZone] = useState<"page" | "entete" | "pied">("page");
  const [historique, setHistorique] = useState(false);

  const charger = useCallback(async () => {
    try {
      const [s, p, liste, m] = await Promise.all([
        api.site(siteId),
        api.page(pageId),
        api.pages(siteId),
        api.medias(siteId),
      ]);
      setSite(s);
      setPage(p);
      setPages(liste);
      setMedias(m);
      chargerArbre(
        zone === "page"
          ? p.arbre_brouillon
          : zone === "entete"
            ? (s.entete_brouillon ?? arbreVide())
            : (s.pied_brouillon ?? arbreVide()),
        p.revision,
      );
      setConflit(false);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [chargerArbre, pageId, siteId, zone]);

  useEffect(() => {
    void charger();
  }, [charger]);

  // ── Enregistrement automatique ───────────────────────────────────────────
  //
  // La sauvegarde suit l'arbre, pas les gestes : n'importe quelle modification
  // — frappe, glissière, suppression — rend `sale` vrai, et le compte à rebours
  // repart. Une sauvegarde par geste multiplierait les écritures sans rien
  // garantir de plus.
  const enregistrerRef = useRef<() => void>(() => {});

  const enregistrer = useCallback(async () => {
    const etat = useBuilder.getState();
    if (!etat.sale || conflit || !peutEditer) return;
    marquerEnregistrement("en_cours");
    try {
      // L'en-tête et le pied vivent sur le SITE, pas sur la page — et n'ont
      // donc pas de verrou de révision : ils ne sont pas édités à deux mains
      // sur une même ligne, et leur inventer un verrou obligerait à en poser un
      // sur chaque champ du site.
      if (zone !== "page") {
        const champ = zone === "entete" ? "entete_brouillon" : "pied_brouillon";
        const majSite = await api.modifierSite(siteId, { [champ]: etat.arbre });
        setSite(majSite);
        marquerEnregistre(etat.revision);
        return;
      }
      const reponse = await api.enregistrerBrouillon(pageId, etat.arbre, etat.revision);
      marquerEnregistre(reponse.revision);
    } catch (e) {
      if (e instanceof ConflitRevision) {
        setConflit(true);
        marquerEnregistrement("erreur", e.message);
        return;
      }
      marquerEnregistrement(
        "erreur",
        e instanceof Error ? e.message : "Enregistrement impossible.",
      );
    }
  }, [conflit, marquerEnregistre, marquerEnregistrement, pageId, peutEditer, siteId, zone]);

  enregistrerRef.current = () => void enregistrer();

  useEffect(() => {
    if (!sale || conflit) return;
    const minuterie = setTimeout(() => enregistrerRef.current(), DELAI_AUTO);
    return () => clearTimeout(minuterie);
  }, [arbre, sale, conflit]);

  // Fermer l'onglet avec des modifications non parties reste possible — mais
  // pas silencieux.
  useEffect(() => {
    if (!sale) return;
    function avant(evenement: BeforeUnloadEvent) {
      evenement.preventDefault();
      evenement.returnValue = "";
    }
    window.addEventListener("beforeunload", avant);
    return () => window.removeEventListener("beforeunload", avant);
  }, [sale]);

  // ── Raccourcis ───────────────────────────────────────────────────────────
  useEffect(() => {
    function auClavier(evenement: KeyboardEvent) {
      const modificateur = evenement.metaKey || evenement.ctrlKey;
      if (!modificateur) return;
      const touche = evenement.key.toLowerCase();
      if (touche === "z") {
        evenement.preventDefault();
        if (evenement.shiftKey) refaire();
        else annuler();
      } else if (touche === "s") {
        evenement.preventDefault();
        enregistrerRef.current();
      }
    }
    window.addEventListener("keydown", auClavier);
    return () => window.removeEventListener("keydown", auClavier);
  }, [annuler, refaire]);

  /** Basculer de zone ENREGISTRE d'abord.
   *
   *  Le contenu de la zone quittée n'est plus à l'écran : le perdre serait
   *  invisible, et se découvrirait à la publication. */
  async function changerZone(suivante: "page" | "entete" | "pied") {
    if (suivante === zone) return;
    await enregistrer();
    setZone(suivante);
  }

  async function apercu() {
    setBusy(true);
    try {
      // Enregistrer d'abord : l'aperçu lit le BROUILLON côté serveur, pas la
      // mémoire du navigateur. Sans ça, on ouvrirait l'avant-dernier état.
      await enregistrer();
      const lien = await api.apercu(pageId);
      window.open(lien.url, "_blank", "noopener");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Aperçu impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function publier() {
    setBusy(true);
    try {
      await enregistrer();
      await api.publierPage(pageId);
      setToast("Page publiée.");
      const liste = await api.pages(siteId);
      setPages(liste);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Publication impossible.");
    } finally {
      setBusy(false);
    }
  }

  const etatSauvegarde = conflit
    ? "Conflit"
    : enregistrement === "en_cours"
      ? "Enregistrement…"
      : enregistrement === "erreur"
        ? "Échec"
        : sale
          ? "Modifications non enregistrées"
          : "Enregistré";

  const navigation = pages.map((p) => ({ chemin: p.chemin, titre: p.titre }));

  return (
    <div className="flex h-screen flex-col bg-surface">
      {/* ── Barre supérieure ── */}
      <header className="flex flex-none flex-wrap items-center gap-2 border-b border-outline-soft bg-surface-container-lowest px-3 py-2">
        <Link
          href={`/sites/${siteId}`}
          className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} />
          {site?.nom ?? "Site"}
        </Link>

        <span className="mx-1 h-5 w-px bg-outline-soft" />

        <span className="min-w-0 truncate text-body-md text-on-surface">
          {page?.titre ?? "…"}
          <span className="ml-1.5 text-label-md text-outline">{page?.chemin}</span>
        </span>

        {/* En-tête et pied sont partagés par TOUTES les pages. Le rappeler ici,
            au moment de basculer, évite la surprise d'une modification qui
            apparaît sur des pages qu'on n'a pas ouvertes. */}
        <span className="flex rounded-lg border border-outline-soft p-0.5">
          {ZONES.map((z) => (
            <button
              key={z.cle}
              type="button"
              title={z.aide}
              aria-pressed={zone === z.cle}
              onClick={() => void changerZone(z.cle)}
              className={`h-7 rounded-md px-2.5 text-label-md transition-colors ${
                zone === z.cle
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {z.libelle}
            </button>
          ))}
        </span>

        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            aria-label="Annuler"
            title="Annuler (Ctrl+Z)"
            disabled={!passe.length}
            onClick={annuler}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-30"
          >
            <UndoOutlined style={{ fontSize: 18 }} />
          </button>
          <button
            type="button"
            aria-label="Refaire"
            title="Refaire (Ctrl+Maj+Z)"
            disabled={!futur.length}
            onClick={refaire}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-30"
          >
            <RedoOutlined style={{ fontSize: 18 }} />
          </button>

          <span className="mx-1 h-5 w-px bg-outline-soft" />

          <span className="flex rounded-lg border border-outline-soft p-0.5">
            {APPAREILS.map(({ cle, libelle, Icone }) => (
              <button
                key={cle}
                type="button"
                title={libelle}
                aria-label={libelle}
                aria-pressed={cible === cle}
                onClick={() => viser(cle)}
                className={`inline-flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
                  cible === cle
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <Icone style={{ fontSize: 17 }} />
              </button>
            ))}
          </span>

          <span className="mx-1 h-5 w-px bg-outline-soft" />

          <span
            className={`mr-1 text-label-md ${
              conflit || enregistrement === "erreur" ? "text-error" : "text-outline"
            }`}
          >
            {etatSauvegarde}
          </span>

          <button
            type="button"
            disabled={zone !== "page"}
            title={
              zone === "page"
                ? "Historique des versions"
                : "L'historique porte sur les pages, pas sur l'en-tête ni le pied."
            }
            aria-label="Historique des versions"
            onClick={() => setHistorique(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-30"
          >
            <HistoryOutlined style={{ fontSize: 18 }} />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void apercu()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-outline-soft px-2.5 text-label-lg text-on-surface transition-colors hover:bg-surface-container disabled:opacity-40"
          >
            <VisibilityOutlined style={{ fontSize: 17 }} />
            Aperçu
          </button>
          <button
            type="button"
            disabled={busy || !peutPublier}
            title={peutPublier ? undefined : "Vous n'avez pas le droit de publier."}
            onClick={() => void publier()}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-label-lg text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <CloudUploadOutlined style={{ fontSize: 17 }} />
            Publier
          </button>
        </span>
      </header>

      {(erreur || messageErreur) && !conflit && (
        <p className="flex-none bg-error-container/40 px-3 py-1.5 text-body-sm text-error">
          {erreur ?? messageErreur}
        </p>
      )}

      {conflit && (
        <div className="flex flex-none flex-wrap items-center gap-2 bg-error-container/40 px-3 py-1.5 text-body-sm text-error">
          <span>
            Cette page a été modifiée ailleurs — dans un autre onglet, ou par quelqu&apos;un
            d&apos;autre. Vos modifications ne sont pas enregistrées.
          </span>
          <button
            type="button"
            onClick={() => void charger()}
            className="rounded-lg border border-error px-2 py-0.5 text-label-md"
          >
            Recharger la page distante
          </button>
        </div>
      )}

      {!peutEditer && (
        <p className="flex-none bg-surface-container px-3 py-1.5 text-body-sm text-on-surface-variant">
          Lecture seule : vous n&apos;avez pas le droit de modifier les pages de ce site.
        </p>
      )}

      {/* ── Les trois colonnes ── */}
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-[248px] flex-none flex-col overflow-y-auto border-r border-outline-soft bg-surface-container-lowest">
          <Palette
            onSansSection={() =>
              setErreur("Ajoutez d'abord une section : un bloc se pose dans une colonne.")
            }
          />
          <Arborescence />
        </aside>

        {page && site ? (
          <Canvas
            theme={site.theme_brouillon}
            // On n'affiche l'en-tête et le pied QUE quand on édite la page :
            // sinon la zone éditée apparaîtrait deux fois sur le canevas.
            entete={zone === "page" ? site.entete_brouillon : null}
            pied={zone === "page" ? site.pied_brouillon : null}
            titre={page.titre}
            pages={navigation}
          />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center text-body-sm text-on-surface-variant">
            Chargement…
          </div>
        )}

        <aside className="w-[300px] flex-none overflow-y-auto border-l border-outline-soft bg-surface-container-lowest">
          <Inspecteur
            medias={medias}
            pages={navigation}
            urlMedia={urlMediaEditeur}
            onOuvrirBibliotheque={(fn) => setPoser(() => fn)}
          />
        </aside>
      </div>

      {poser && (
        <Bibliotheque
          siteId={siteId}
          onChoisir={(media) => {
            poser(media);
            setMedias((liste) =>
              liste.some((m) => m.id === media.id) ? liste : [media, ...liste],
            );
            setPoser(null);
          }}
          onFermer={() => setPoser(null)}
        />
      )}

      {historique && page && (
        <Historique
          pageId={page.id}
          peutEditer={peutEditer}
          onRestaure={() => {
            setToast("Version restaurée dans le brouillon.");
            void charger();
          }}
          onFermer={() => setHistorique(false)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
