"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AddOutlined,
  AssignmentOutlined,
  EditOutlined,
  InsightsOutlined,
  SearchOutlined,
  SendOutlined,
} from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import {
  ACCES_LABELS,
  STATUT_LABELS,
  formsApi,
  type FormulaireResume,
} from "@/app/lib/forms-api";

type Onglet = "miens" | "partages" | "a_remplir";

const ONGLETS: { cle: Onglet; libelle: string; vide: string }[] = [
  {
    cle: "miens",
    libelle: "Mes formulaires",
    vide: "Vous n'avez encore conçu aucun formulaire.",
  },
  {
    cle: "partages",
    libelle: "Partagés avec moi",
    vide: "Personne ne vous a encore donné accès à ses résultats.",
  },
  {
    cle: "a_remplir",
    libelle: "Répondre",
    vide: "Aucun formulaire ne vous attend pour l'instant.",
  },
];

const CHAMP =
  "h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

const TEINTE_STATUT: Record<string, string> = {
  BROUILLON: "bg-surface-container text-on-surface-variant",
  PUBLIE: "bg-secondary/15 text-secondary",
  CLOS: "bg-surface-container text-outline",
};

export default function FormulairesPage() {
  const router = useRouter();
  const [onglet, setOnglet] = useState<Onglet>("miens");
  const [recherche, setRecherche] = useState("");
  const [liste, setListe] = useState<FormulaireResume[] | null>(null);
  const [titre, setTitre] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
    return (liste ?? []).filter((f) => f.titre.toLowerCase().includes(q));
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
    <div className="p-4 md:p-8 max-w-[1152px] mx-auto">
      <h1 className="font-display text-headline-sm text-on-surface">Formulaires</h1>
      <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
        Posez des questions, partagez le formulaire — au workspace ou par un lien que
        n&apos;importe qui peut ouvrir sans compte — et dépouillez les réponses.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          className={`${CHAMP} flex-1 min-w-[260px]`}
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && creer()}
          placeholder="Titre d'un nouveau formulaire…"
        />
        <button
          type="button"
          disabled={busy || !titre.trim()}
          onClick={creer}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
        >
          <AddOutlined style={{ fontSize: 16 }} />
          Créer
        </button>
      </div>

      {erreur && (
        <p className="mt-3 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-lg border border-outline-soft overflow-hidden">
          {ONGLETS.map((o) => (
            <button
              key={o.cle}
              type="button"
              aria-pressed={onglet === o.cle}
              onClick={() => setOnglet(o.cle)}
              className={`h-8 px-3 text-body-sm border-l border-outline-soft first:border-l-0 transition-colors ${
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
            className={`${CHAMP} pl-8 w-[240px]`}
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un formulaire…"
          />
        </span>
      </div>

      {liste === null && (
        <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
      )}
      {liste !== null && filtres.length === 0 && (
        <p className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-8 text-center text-body-sm text-on-surface-variant">
          {recherche.trim() ? "Aucun formulaire ne correspond." : courant.vide}
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtres.map((forme) => (
          <article
            key={forme.id}
            className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
          >
            <div className="flex items-start gap-2">
              <span className="flex-none pt-0.5 text-outline">
                <AssignmentOutlined style={{ fontSize: 18 }} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-body-md font-medium text-on-surface">{forme.titre}</p>
                {forme.description && (
                  <p className="mt-0.5 line-clamp-2 text-body-sm text-on-surface-variant">
                    {forme.description}
                  </p>
                )}
              </div>
              <span
                className={`flex-none rounded-full px-2 py-0.5 text-label-md font-semibold ${
                  TEINTE_STATUT[forme.statut] ?? ""
                }`}
              >
                {STATUT_LABELS[forme.statut] ?? forme.statut}
              </span>
            </div>

            <p className="mt-2 flex flex-wrap items-center gap-x-3 text-label-md text-outline">
              <span>{forme.nb_questions} question{forme.nb_questions > 1 ? "s" : ""}</span>
              <span>
                {forme.nb_soumissions} réponse{forme.nb_soumissions > 1 ? "s" : ""}
              </span>
              <span>{ACCES_LABELS[forme.acces] ?? forme.acces}</span>
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {forme.peut_modifier && (
                <Link
                  href={`/forms/${forme.id}`}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-outline-soft text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  <EditOutlined style={{ fontSize: 15 }} />
                  Modifier
                </Link>
              )}
              {forme.peut_voir_resultats && (
                <Link
                  href={`/forms/${forme.id}/resultats`}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-outline-soft text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors"
                >
                  <InsightsOutlined style={{ fontSize: 15 }} />
                  Résultats
                </Link>
              )}
              {forme.peut_repondre && (
                <Link
                  href={`/forms/${forme.id}/repondre`}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container transition-colors"
                >
                  <SendOutlined style={{ fontSize: 15 }} />
                  Répondre
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
