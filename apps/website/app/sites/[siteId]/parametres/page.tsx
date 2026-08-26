"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowBackOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { THEME_DEFAUT } from "@repo/site-widgets/theme";
import type { Theme } from "@repo/site-widgets/types";

import { DashboardShell } from "@/components/DashboardShell";
import { Domaines } from "@/components/Domaines";
import { ChampCouleur } from "@/components/builder/champs/Controles";
import { api, type Site } from "@/app/lib/api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

const COULEURS: { cle: keyof Theme; libelle: string; aide: string }[] = [
  { cle: "primaire", libelle: "Couleur principale", aide: "Boutons, liens, accents." },
  { cle: "secondaire", libelle: "Couleur secondaire", aide: "En-tête, pied de page." },
  { cle: "fond", libelle: "Fond", aide: "Le fond des pages." },
  { cle: "texte", libelle: "Texte", aide: "Le texte courant." },
  { cle: "texte_doux", libelle: "Texte secondaire", aide: "Légendes, mentions." },
];

const POLICES = [
  { valeur: THEME_DEFAUT.police_texte, libelle: "Inter (défaut)" },
  { valeur: "Georgia, 'Times New Roman', serif", libelle: "Georgia — serif" },
  { valeur: "'Trebuchet MS', system-ui, sans-serif", libelle: "Trebuchet" },
  { valeur: "'Courier New', ui-monospace, monospace", libelle: "Courier — chasse fixe" },
];

/** Les réglages du site : son identité et son thème.
 *
 *  Le thème est ici et non dans l'éditeur parce qu'il vaut pour TOUTES les
 *  pages : le régler depuis une page donnerait l'impression de ne toucher que
 *  celle-là. Comme le reste, il s'écrit dans le brouillon et n'atteint le
 *  public qu'à la publication.
 *
 *  L'adresse (`slug`) ne se modifie pas : elle est devenue un nom d'hôte, et
 *  des liens extérieurs pointent dessus. Le renommage viendra avec la gestion
 *  des domaines, qui saura poser une redirection.
 */
export default function ParametresPage() {
  const params = useParams<{ siteId: string }>();
  const siteId = Number(params.siteId);
  const router = useRouter();
  const { can } = usePermissions();
  const peutGerer = can("website.sites.manage");

  const [site, setSite] = useState<Site | null>(null);
  const [nom, setNom] = useState("");
  const [langue, setLangue] = useState("fr");
  const [theme, setTheme] = useState<Theme>(THEME_DEFAUT);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmer, setConfirmer] = useState(false);

  const charger = useCallback(async () => {
    try {
      const s = await api.site(siteId);
      setSite(s);
      setNom(s.nom);
      setLangue(s.langue);
      setTheme({ ...THEME_DEFAUT, ...(s.theme_brouillon ?? {}) });
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [siteId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function enregistrer() {
    setBusy(true);
    setErreur(null);
    try {
      const s = await api.modifierSite(siteId, {
        nom: nom.trim(),
        langue: langue.trim() || "fr",
        theme_brouillon: theme,
      });
      setSite(s);
      setToast("Enregistré. Publiez pour que le public le voie.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function supprimer() {
    setBusy(true);
    try {
      await api.supprimerSite(siteId);
      router.push("/");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible.");
      setBusy(false);
      setConfirmer(false);
    }
  }

  function poser<K extends keyof Theme>(cle: K, valeur: Theme[K]) {
    setTheme((t) => ({ ...t, [cle]: valeur }));
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[760px] p-4 md:p-8">
        <Link
          href={`/sites/${siteId}`}
          className="inline-flex items-center gap-1 text-body-sm text-on-surface-variant hover:text-primary"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} />
          Retour au site
        </Link>

        <h1 className="mt-2 font-display text-headline-sm text-on-surface">Paramètres</h1>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        <section className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <h2 className="text-body-md font-semibold text-on-surface">Identité</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-label-md text-on-surface-variant">Nom du site</span>
              <input
                className={CHAMP}
                value={nom}
                disabled={!peutGerer}
                onChange={(e) => setNom(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-label-md text-on-surface-variant">
                Langue (code ISO)
              </span>
              <input
                className={CHAMP}
                value={langue}
                disabled={!peutGerer}
                onChange={(e) => setLangue(e.target.value)}
              />
            </label>
          </div>
          <p className="mt-3 text-body-sm text-on-surface-variant">
            Adresse provisoire :{" "}
            <span className="text-on-surface">
              {site?.adresse?.replace(/^https?:\/\//, "") ?? "…"}
            </span>{" "}
            — elle est fixe, parce que des liens pointent dessus. Votre propre nom de domaine se
            branchera à côté.
          </p>
        </section>

        <Domaines siteId={siteId} peutGerer={peutGerer} />

        <section className="mt-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <h2 className="text-body-md font-semibold text-on-surface">Thème</h2>
          <p className="mt-0.5 text-label-md text-outline">
            Vaut pour toutes les pages du site.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {COULEURS.map(({ cle, libelle, aide }) => (
              <div key={cle}>
                <span className="mb-1 block text-label-md text-on-surface-variant">{libelle}</span>
                <ChampCouleur
                  valeur={String(theme[cle] ?? "")}
                  onChange={(v) => poser(cle, v as Theme[typeof cle])}
                />
                <span className="mt-0.5 block text-label-sm text-outline">{aide}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-label-md text-on-surface-variant">
                Police des titres
              </span>
              <select
                className={CHAMP}
                value={theme.police_titre ?? THEME_DEFAUT.police_titre}
                disabled={!peutGerer}
                onChange={(e) => poser("police_titre", e.target.value)}
              >
                {POLICES.map((p) => (
                  <option key={p.libelle} value={p.valeur}>
                    {p.libelle}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-label-md text-on-surface-variant">
                Police du texte
              </span>
              <select
                className={CHAMP}
                value={theme.police_texte ?? THEME_DEFAUT.police_texte}
                disabled={!peutGerer}
                onChange={(e) => poser("police_texte", e.target.value)}
              >
                {POLICES.map((p) => (
                  <option key={p.libelle} value={p.valeur}>
                    {p.libelle}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-label-md text-on-surface-variant">
                Arrondi des angles (px)
              </span>
              <input
                type="number"
                min={0}
                max={40}
                className={CHAMP}
                value={theme.rayon ?? THEME_DEFAUT.rayon}
                disabled={!peutGerer}
                onChange={(e) => poser("rayon", Number(e.target.value))}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-label-md text-on-surface-variant">
                Largeur du contenu (px)
              </span>
              <input
                type="number"
                min={640}
                max={1600}
                step={20}
                className={CHAMP}
                value={theme.largeur_contenu ?? THEME_DEFAUT.largeur_contenu}
                disabled={!peutGerer}
                onChange={(e) => poser("largeur_contenu", Number(e.target.value))}
              />
            </label>
          </div>

          <div
            className="mt-4 rounded-xl border border-outline-soft p-4"
            style={{ background: theme.fond, color: theme.texte }}
          >
            <p style={{ fontFamily: theme.police_titre, fontSize: 22, fontWeight: 700 }}>
              Un titre dans votre thème
            </p>
            <p style={{ fontFamily: theme.police_texte, color: theme.texte_doux, marginTop: 4 }}>
              Et le texte qui l&apos;accompagne, tel qu&apos;un visiteur le lira.
            </p>
            <span
              className="mt-3 inline-block px-3 py-1.5 text-sm font-semibold"
              style={{
                background: theme.primaire,
                color: "#fff",
                borderRadius: `${theme.rayon ?? 12}px`,
              }}
            >
              Un bouton
            </span>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={busy || !peutGerer}
            onClick={() => void enregistrer()}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-label-lg text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Enregistrer
          </button>
          <button
            type="button"
            disabled={busy || !peutGerer}
            onClick={() => setConfirmer(true)}
            className="inline-flex h-9 items-center rounded-lg border border-error px-4 text-label-lg text-error transition-colors hover:bg-error-container/30 disabled:opacity-40"
          >
            Supprimer le site
          </button>
        </div>
      </div>

      {confirmer && (
        <ConfirmDialog
          title={`Supprimer « ${site?.nom ?? "ce site"} » ?`}
          message="Les pages, les versions publiées, les médias et l'adresse disparaissent. Le site cesse immédiatement d'être accessible."
          confirmLabel="Supprimer définitivement"
          busy={busy}
          onCancel={() => setConfirmer(false)}
          onConfirm={() => void supprimer()}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </DashboardShell>
  );
}
