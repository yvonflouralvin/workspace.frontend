"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AddOutlined, ArrowBackOutlined, AssignmentOutlined } from "@mui/icons-material";
import { SearchField } from "@repo/ui/SearchField";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import {
  ACCES_LABELS,
  STATUT_LABELS,
  formsApi,
  type FormulaireResume,
} from "@/app/lib/forms-api";

const TEINTE_STATUT: Record<string, string> = {
  BROUILLON: "bg-surface-container text-on-surface-variant",
  PUBLIE: "bg-secondary/15 text-secondary",
  CLOS: "bg-surface-container text-outline",
};

/** Les formulaires que je CONÇOIS — et ceux dont on m'a ouvert les résultats.
 *
 *  Séparé de « mes envois » parce que ce sont deux métiers : ici on écrit des
 *  questions et on dépouille, là-bas on répond. Les mêler dans une même liste
 *  obligeait à lire une pastille pour savoir de quoi parlait chaque ligne.
 */
export default function MesFormulairesPage() {
  const router = useRouter();
  const { can } = usePermissions();
  const peutCreer = can("projects.formulaires.creer");
  const [recherche, setRecherche] = useState("");
  const [liste, setListe] = useState<FormulaireResume[] | null>(null);
  const [titre, setTitre] = useState("");
  const [creation, setCreation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      // Ce que je conçois ET ce qu'on m'a partagé : deux portées côté serveur,
      // mais une seule question — « les formulaires dont je m'occupe ».
      const [miens, partages] = await Promise.all([
        formsApi.lister({ portee: "miens" }),
        formsApi.lister({ portee: "partages" }).catch(() => [] as FormulaireResume[]),
      ]);
      setListe([...miens, ...partages]);
    } catch {
      setListe([]);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return liste ?? [];
    return (liste ?? []).filter(
      (f) =>
        f.titre.toLowerCase().includes(q) || (f.description ?? "").toLowerCase().includes(q)
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

  return (
    <div className="mx-auto max-w-[1024px] p-4 md:p-8">
      <Link
        href="/forms"
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowBackOutlined style={{ fontSize: 15 }} />
        Mes envois
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-sm text-on-surface">Mes formulaires</h1>
          <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
            Ceux que vous concevez, et ceux dont on vous a ouvert les résultats.
          </p>
        </div>
        {peutCreer && (
          <button
            type="button"
            onClick={() => setCreation((v) => !v)}
            className="inline-flex h-9 flex-none items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Créer
          </button>
        )}
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
        <p className="mt-3 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {erreur}
        </p>
      )}

      <div className="mt-5">
        <SearchField
          value={recherche}
          onChange={setRecherche}
          placeholder="Rechercher un formulaire…"
          className="w-full sm:w-[280px]"
        />
      </div>

      {liste === null && <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>}
      {liste !== null && filtres.length === 0 && (
        <p className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-8 text-center text-body-sm text-on-surface-variant">
          {recherche.trim()
            ? "Aucun formulaire ne correspond."
            : "Vous n'avez encore conçu aucun formulaire."}
        </p>
      )}

      {filtres.length > 0 && (
        <div className="mt-5 divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
          {filtres.map((forme) => (
            <Link
              key={forme.id}
              href={forme.peut_modifier ? `/forms/${forme.id}` : `/forms/${forme.id}/resultats`}
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
