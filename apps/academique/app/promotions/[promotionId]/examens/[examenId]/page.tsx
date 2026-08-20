"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowBackOutlined } from "@mui/icons-material";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { api, type FeuillePresence } from "@/app/lib/api";
import { BOUTON, BOUTON_PLAT, Bilan, Carte, Erreur, Kpi, Vide } from "@/components/Bloc";
import { usePromotion } from "../../promotion-context";

const STATUTS = [
  { cle: "PRESENT", libelle: "Présent" },
  { cle: "ABSENT", libelle: "Absent" },
  { cle: "EXCLU", libelle: "Exclu" },
];

/** La feuille d'appel d'une épreuve.
 *
 *  **« Non pointé » n'est pas « absent ».** C'est l'absence de ligne, pas un
 *  statut : le distinguer est ce qui permet à un étudiant de contester. L'écran
 *  laisse donc une quatrième case vide, et compte séparément les pointés.
 */
export default function PresencesPage({
  params,
}: {
  params: Promise<{ examenId: string }>;
}) {
  const { examenId } = use(params);
  const id = Number(examenId);
  const { promotionId } = usePromotion();
  const { can } = usePermissions();
  const peutGerer = can("academique.examens.manage");

  const [feuille, setFeuille] = useState<FeuillePresence | null>(null);
  const [brouillon, setBrouillon] = useState<Record<number, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [bilan, setBilan] = useState<{ titre: string; ecarts: string[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const charger = useCallback(async () => {
    try {
      const lue = await api.feuillePresence(id);
      setFeuille(lue);
      setBrouillon(
        Object.fromEntries(lue.lignes.map((l) => [l.inscription_id, l.statut ?? ""]))
      );
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function enregistrer() {
    if (!feuille) return;
    setBusy(true);
    setErreur(null);
    try {
      const lignes = feuille.lignes
        .filter((l) => brouillon[l.inscription_id])
        .map((l) => ({ inscription_id: l.inscription_id, statut: brouillon[l.inscription_id] }));
      const resultat = await api.pointer(id, lignes);
      setBilan({ titre: `${resultat.crees} pointage(s) enregistré(s)`, ecarts: resultat.ignores });
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  function tousPresents() {
    if (!feuille) return;
    setBrouillon(Object.fromEntries(feuille.lignes.map((l) => [l.inscription_id, "PRESENT"])));
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/promotions/${promotionId}/examens`}
        className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowBackOutlined style={{ fontSize: 15 }} />
        Planning des examens
      </Link>

      <Erreur message={erreur} />
      {bilan && (
        <Bilan
          titre={bilan.titre}
          ecarts={bilan.ecarts}
          ton={bilan.ecarts.length ? "alerte" : "info"}
          onFermer={() => setBilan(null)}
        />
      )}

      {feuille === null ? (
        <p className="text-body-sm text-on-surface-variant">Chargement…</p>
      ) : (
        <>
          <div>
            <h2 className="font-display text-headline-sm text-on-surface">{feuille.titre}</h2>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">
              {new Date(feuille.date).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              · {feuille.heure_debut}–{feuille.heure_fin}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Kpi valeur={feuille.inscrits} libelle="inscrits" />
            {/* Pointés et présents sont deux nombres distincts : les confondre
                ferait passer un non-appelé pour un absent. */}
            <Kpi valeur={feuille.pointes} libelle="appelés" />
            <Kpi valeur={feuille.presents} libelle="présents" />
          </div>

          <Carte
            titre="Feuille d'appel"
            sousTitre="Laisser une ligne vide veut dire « pas encore appelé » — ce n'est pas une absence."
            action={
              peutGerer && (
                <button type="button" onClick={tousPresents} className={BOUTON_PLAT}>
                  Tout marquer présent
                </button>
              )
            }
          >
            {feuille.lignes.length === 0 ? (
              <Vide message="Personne n'est inscrit dans cette promotion." />
            ) : (
              <div className="divide-y divide-hairline">
                {feuille.lignes.map((l) => (
                  <div key={l.inscription_id} className="flex flex-wrap items-center gap-3 px-4 py-2">
                    <span className="w-[9rem] flex-none font-mono text-label-md text-outline">
                      {l.matricule}
                    </span>
                    <span className="min-w-0 flex-1 text-body-sm text-on-surface">
                      {l.nom_complet}
                    </span>
                    {l.pointe_le && (
                      <span className="flex-none text-label-md text-outline">
                        appelé à {new Date(l.pointe_le).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    <div className="flex flex-none gap-1">
                      {STATUTS.map((s) => (
                        <button
                          key={s.cle}
                          type="button"
                          disabled={!peutGerer}
                          onClick={() =>
                            setBrouillon((cur) => ({
                              ...cur,
                              [l.inscription_id]: cur[l.inscription_id] === s.cle ? "" : s.cle,
                            }))
                          }
                          className={`h-8 rounded-lg px-2.5 text-label-md font-medium transition-colors ${
                            brouillon[l.inscription_id] === s.cle
                              ? "bg-primary text-on-primary"
                              : "border border-outline-soft text-on-surface-variant hover:border-primary"
                          } disabled:opacity-50`}
                        >
                          {s.libelle}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Carte>

          {peutGerer && (
            <button type="button" disabled={busy} onClick={enregistrer} className={BOUTON}>
              Enregistrer l&apos;appel
            </button>
          )}
        </>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
