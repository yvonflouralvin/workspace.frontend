"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AddOutlined,
  AssignmentOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import {
  ACCES_LABELS,
  STATUT_LABELS,
  formsApi,
  type FormulaireResume,
} from "@/app/lib/forms-api";

type Onglet = "miens" | "partages" | "a_remplir";

const ONGLETS: { cle: Onglet; libelle: string; vide: string }[] = [
  { cle: "miens", libelle: "Mes formulaires", vide: "Vous n'avez encore conçu aucun formulaire." },
  {
    cle: "partages",
    libelle: "Partagés avec moi",
    vide: "Personne ne vous a encore donné accès à ses résultats.",
  },
  { cle: "a_remplir", libelle: "Répondre", vide: "Aucun formulaire ne vous attend pour l'instant." },
];

const CHAMP =
  "h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

const TEINTE_STATUT: Record<string, string> = {
  BROUILLON: "bg-surface-container text-on-surface-variant",
  PUBLIE: "bg-secondary/15 text-secondary",
  CLOS: "bg-surface-container text-outline",
};

/** La liste des formulaires.
 *
 *  En LIGNES et non en cartes : on vient y chercher un formulaire précis, pas
 *  contempler une galerie. Une ligne tient sur une hauteur, se balaie à l'œil,
 *  et vingt formulaires restent lisibles sans faire défiler trois écrans.
 *
 *  Un clic mène au FORMULAIRE, pas à son éditeur : le geste courant est de le
 *  remplir. Concevoir et dépouiller sont des liens, en bas de sa page.
 */
export default function FormulairesPage() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<Onglet>("miens");
  const [recherche, setRecherche] = useState("");
  const [liste, setListe] = useState<FormulaireResume[] | null>(null);
  const [titre, setTitre] = useState("");
  const [creation, setCreation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setListe(await formsApi.lister({ portee: onglet }));
    } catch {
      setListe([]);
    }
  }, [onglet]);

  useEffect(() => {
    void charger();
  }, [charger]);

  // La recherche s'applique à l'écran : la liste d'un workspace tient en
  // mémoire, et un aller-retour par frappe n'apporterait rien.
  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return liste ?? [];
    return (liste ?? []).filter(
      (f) =>
        f.titre.toLowerCase().includes(q) ||
        (f.description ?? "").toLowerCase().includes(q)
    );
  }, [liste, recherche]);

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

  const courant = ONGLETS.find((o) => o.cle === onglet)!;

  return (
    <div className="p-4 md:p-8 max-w-[1024px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-sm text-on-surface">Formulaires</h1>
          <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
            Posez des questions, partagez le formulaire — au workspace ou par un lien que
            n&apos;importe qui peut ouvrir sans compte — et dépouillez les réponses.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreation((v) => !v)}
          className="inline-flex h-9 flex-none items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container"
        >
          <AddOutlined style={{ fontSize: 16 }} />
          Créer
        </button>
      </div>

      {creation && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-3">
          <input
            autoFocus
            className={`${CHAMP} min-w-[260px] flex-1`}
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
        <p className="mt-3 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex overflow-hidden rounded-lg border border-outline-soft">
          {ONGLETS.map((o) => (
            <button
              key={o.cle}
              type="button"
              aria-pressed={onglet === o.cle}
              onClick={() => setOnglet(o.cle)}
              className={`h-8 border-l border-outline-soft px-3 text-body-sm transition-colors first:border-l-0 ${
                onglet === o.cle
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {o.libelle}
            </button>
          ))}
        </span>
        <span className="relative ml-auto">
          <SearchOutlined
            style={{ fontSize: 16 }}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            aria-label="Rechercher un formulaire"
            className={`${CHAMP} w-[260px] pl-8`}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un formulaire…"
          />
        </span>
      </div>

      {liste === null && <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>}
      {liste !== null && filtres.length === 0 && (
        <p className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-8 text-center text-body-sm text-on-surface-variant">
          {recherche.trim() ? "Aucun formulaire ne correspond." : courant.vide}
        </p>
      )}

      {filtres.length > 0 && (
        <div className="mt-5 divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
          {filtres.map((forme) => (
            <Link
              key={forme.id}
              href={`/forms/${forme.id}/repondre`}
              className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-container-low"
            >
              <span className="flex-none text-outline">
                <AssignmentOutlined style={{ fontSize: 18 }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-md font-medium text-on-surface">
                  {forme.titre}
                </span>
                {forme.description && (
                  <span className="block truncate text-label-md text-on-surface-variant">
                    {forme.description}
                  </span>
                )}
              </span>
              <span className="flex-none text-label-md text-outline">
                {forme.nb_questions} question{forme.nb_questions > 1 ? "s" : ""}
              </span>
              <span className="w-[110px] flex-none text-right text-label-md text-outline">
                {forme.nb_soumissions} réponse{forme.nb_soumissions > 1 ? "s" : ""}
              </span>
              <span className="w-[150px] flex-none truncate text-right text-label-md text-outline">
                {ACCES_LABELS[forme.acces] ?? forme.acces}
              </span>
              <span
                className={`w-[80px] flex-none rounded-full px-2 py-0.5 text-center text-label-md font-semibold ${
                  TEINTE_STATUT[forme.statut] ?? ""
                }`}
              >
                {STATUT_LABELS[forme.statut] ?? forme.statut}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
