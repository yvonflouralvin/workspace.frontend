"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowBackOutlined, GroupsOutlined, TrendingFlatOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { useContexte } from "@/app/lib/etablissement";
import { api, type Inscription, type Passage, type Promotion } from "@/app/lib/api";

const CHAMP =
  "h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

const TEINTE: Record<string, string> = {
  INSCRIT: "bg-secondary/15 text-secondary",
  ABANDON: "bg-surface-container text-on-surface-variant",
  EXCLU: "bg-error-container/60 text-error",
  DIPLOME: "bg-tertiary/15 text-tertiary",
};

/** La liste de classe, et le passage d'année.
 *
 *  Deux gestes de rentrée au même endroit : voir qui est là, et faire monter
 *  tout le monde. Le rapport de passage NOMME celui qui reste — c'est ce qu'on
 *  risquerait de ne pas voir, et qui se découvrirait sinon à la rentrée.
 */
export default function PromotionPage({
  params,
}: {
  params: Promise<{ promotionId: string }>;
}) {
  const { promotionId } = use(params);
  const id = Number(promotionId);
  const { can } = usePermissions();
  const peutInscrire = can("academique.inscriptions.manage");
  const contexte = useContexte();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [classe, setClasse] = useState<Inscription[] | null>(null);
  const [toutes, setToutes] = useState(false);
  const [cible, setCible] = useState("");
  const [rapport, setRapport] = useState<Passage | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const charger = useCallback(async () => {
    try {
      setClasse(await api.listeDeClasse(id, toutes));
      if (contexte.etablissement) {
        setPromotions(await api.promotions(contexte.etablissement.id));
      }
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setClasse([]);
    }
  }, [id, toutes, contexte.etablissement]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const promotion = promotions.find((p) => p.id === id);
  // On ne propose que les promotions d'une AUTRE année : faire passer dans la
  // même année n'est pas un passage, et le serveur le refuse.
  const cibles = promotions.filter((p) => promotion && p.annee_id !== promotion.annee_id);

  async function passer() {
    if (!cible) return;
    setBusy(true);
    setErreur(null);
    try {
      setRapport(await api.passage(id, Number(cible)));
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Passage impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[960px] p-4 md:p-8">
        <Link
          href="/promotions"
          className="mb-4 inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
        >
          <ArrowBackOutlined style={{ fontSize: 15 }} />
          Promotions
        </Link>

        <h1 className="font-display text-headline-md text-on-surface">
          {promotion?.libelle ?? "Promotion"}
        </h1>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          {promotion ? `${promotion.unite_libelle} · ${promotion.annee_libelle}` : ""}
        </p>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {peutInscrire && (
          <section className="mt-5 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <h2 className="text-body-md font-semibold text-on-surface">Passage d&apos;année</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                aria-label="Promotion d'arrivée"
                className={CHAMP}
                value={cible}
                onChange={(e) => setCible(e.target.value)}
              >
                <option value="">Faire monter vers…</option>
                {cibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.libelle} — {p.annee_libelle}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy || !cible}
                onClick={passer}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
              >
                <TrendingFlatOutlined style={{ fontSize: 17 }} />
                Faire monter la classe
              </button>
            </div>

            {rapport && (
              <div className="mt-3 rounded-xl bg-surface-container-low p-3 text-body-sm">
                <p className="font-medium text-on-surface">
                  {rapport.inscrits} étudiant{rapport.inscrits > 1 ? "s" : ""} inscrit
                  {rapport.inscrits > 1 ? "s" : ""} dans la promotion suivante.
                </p>
                {rapport.ignores.length > 0 && (
                  <>
                    <p className="mt-1 text-on-surface-variant">
                      Restés derrière — {rapport.ignores.length} :
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {rapport.ignores.map((i, n) => (
                        <li key={n} className="text-label-md text-on-surface-variant">
                          <span className="text-on-surface">
                            {i.etudiant}
                            {i.matricule && ` (${i.matricule})`}
                          </span>{" "}
                          — {i.raison}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          <h2 className="text-body-md font-semibold text-on-surface">
            Liste de classe {classe && `— ${classe.length}`}
          </h2>
          <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <input
              type="checkbox"
              checked={toutes}
              onChange={(e) => setToutes(e.target.checked)}
            />
            Voir aussi les inscriptions closes
          </label>
        </div>

        {classe === null ? (
          <p className="mt-3 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : classe.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
            <GroupsOutlined style={{ fontSize: 28 }} className="text-outline" />
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Personne n&apos;est inscrit dans cette promotion.
            </p>
          </div>
        ) : (
          <div className="mt-3 divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
            {classe.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <Link
                  href={`/etudiants/${i.etudiant_id}`}
                  className="min-w-0 flex-1 text-body-sm text-on-surface hover:text-primary"
                >
                  {i.etudiant_nom}
                  <span className="ml-2 text-label-md text-outline">{i.etudiant_matricule}</span>
                </Link>
                <span
                  className={`flex-none rounded-full px-2 py-0.5 text-label-md ${TEINTE[i.statut]}`}
                >
                  {i.statut === "INSCRIT" ? "Inscrit" : i.statut.toLowerCase()}
                </span>
                {peutInscrire && i.statut === "INSCRIT" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      const motif = window.prompt("Motif de l'abandon ?");
                      if (!motif) return;
                      try {
                        await api.clore(i.id, "ABANDON", motif);
                        setToast("Inscription close.");
                        await charger();
                      } catch (e) {
                        setErreur(e instanceof Error ? e.message : "Action impossible.");
                      }
                    }}
                    className="flex-none text-label-md text-on-surface-variant transition-colors hover:text-error"
                  >
                    Clore
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
