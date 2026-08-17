"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowBackOutlined, SendOutlined } from "@mui/icons-material";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import { api, type FicheCotation } from "@/app/lib/api";
import { BOUTON, BOUTON_PLAT, Bilan, Carte, Erreur, Pastille, Vide } from "@/components/Bloc";
import { usePromotion } from "../../promotion-context";

interface Brouillon {
  travaux: string;
  examen: string;
  nd: boolean;
}

/** La fiche de cotation d'un cours.
 *
 *  Trois états par étudiant, jamais deux : une cote, un **ND** (regardé, pas de
 *  cote), ou rien de saisi. Les confondre fait échouer quelqu'un qu'on a
 *  seulement oublié de coter — c'est la raison d'être du modèle, et l'écran doit
 *  la rendre visible.
 *
 *  L'écran ne DÉDUIT pas ses droits : la fiche dit `peut_saisir`, `peut_gerer`,
 *  `encodage_ouvert`. Un bouton actif qui échoue au clic est un refus muet.
 */
export default function FicheCotationPage({
  params,
}: {
  params: Promise<{ elementId: string }>;
}) {
  const { elementId } = use(params);
  const id = Number(elementId);
  const { promotionId, session } = usePromotion();

  const [fiche, setFiche] = useState<FicheCotation | null>(null);
  const [brouillons, setBrouillons] = useState<Record<number, Brouillon>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [bilan, setBilan] = useState<{ titre: string; ecarts: string[] } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [aRouvrir, setARouvrir] = useState(false);

  const charger = useCallback(async () => {
    try {
      const lue = await api.ficheCotation(id, session);
      setFiche(lue);
      setBrouillons(
        Object.fromEntries(
          lue.lignes.map((l) => [
            l.inscription_id,
            {
              travaux: l.note_travaux === null ? "" : String(l.note_travaux),
              examen: l.note_examen === null ? "" : String(l.note_examen),
              nd: l.non_delibere,
            },
          ])
        )
      );
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [id, session]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const modifiable = Boolean(fiche && (fiche.peut_gerer || (fiche.peut_saisir && fiche.encodage_ouvert)));

  const compte = useMemo(() => {
    const lignes = fiche?.lignes ?? [];
    return {
      total: lignes.length,
      saisies: lignes.filter((l) => l.saisie).length,
      manquantes: lignes.filter((l) => !l.saisie).length,
    };
  }, [fiche]);

  function poser(inscription: number, champ: keyof Brouillon, valeur: string | boolean) {
    setBrouillons((cur) => {
      const avant = cur[inscription] ?? { travaux: "", examen: "", nd: false };
      const apres = { ...avant, [champ]: valeur } as Brouillon;
      // Cocher ND vide les notes : le serveur refuse les deux ensemble, autant
      // que l'écran ne laisse pas composer un refus.
      if (champ === "nd" && valeur === true) {
        apres.travaux = "";
        apres.examen = "";
      }
      if ((champ === "travaux" || champ === "examen") && valeur !== "") apres.nd = false;
      return { ...cur, [inscription]: apres };
    });
  }

  async function enregistrer() {
    if (!fiche) return;
    setBusy(true);
    setErreur(null);
    try {
      const lignes = fiche.lignes
        .map((l) => {
          const b = brouillons[l.inscription_id];
          if (!b) return null;
          const vide = b.travaux === "" && b.examen === "" && !b.nd;
          if (vide && !l.saisie) return null; // rien à dire sur une cote jamais posée
          return {
            inscription_id: l.inscription_id,
            note_travaux: b.travaux === "" ? null : Number(b.travaux),
            note_examen: b.examen === "" ? null : Number(b.examen),
            non_delibere: b.nd,
          };
        })
        .filter(Boolean);

      const resultat = await api.saisirCotes(id, { session, lignes });
      setBilan({
        titre: `${resultat.ecrites} cote(s) enregistrée(s)${
          resultat.inchangees ? `, ${resultat.inchangees} inchangée(s)` : ""
        }`,
        ecarts: resultat.refusees,
      });
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function agir(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setErreur(null);
    try {
      await action();
      setToast(message);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/promotions/${promotionId}/cotation`}
        className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowBackOutlined style={{ fontSize: 15 }} />
        Cotation
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

      {fiche === null ? (
        <p className="text-body-sm text-on-surface-variant">Chargement…</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-display text-headline-sm text-on-surface">{fiche.intitule}</h2>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                {fiche.code_ue} — {fiche.intitule_ue} · {fiche.session_libelle}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* L'état des droits se LIT : c'est ce qui évite un bouton actif
                  qui échoue au clic. */}
              {!fiche.encodage_ouvert && !fiche.peut_gerer && (
                <Pastille ton="alerte">Encodage fermé</Pastille>
              )}
              {fiche.encodage_ouvert && <Pastille ton="ok">Encodage ouvert</Pastille>}
              {fiche.remise_au_jury && <Pastille ton="info">Remise au jury</Pastille>}
              <Pastille ton={compte.manquantes ? "attente" : "ok"}>
                {compte.saisies}/{compte.total} coté{compte.saisies > 1 ? "s" : ""}
              </Pastille>
            </div>
          </div>

          {!modifiable && (
            <p className="text-body-sm text-on-surface-variant">
              {fiche.peut_saisir
                ? "L'encodage est fermé sur cette promotion : vous ne pouvez que consulter."
                : "Vous n'avez pas la charge de ce cours : la fiche est en lecture seule."}
            </p>
          )}

          <Carte
            titre={`Barème : travaux /${fiche.bareme_travaux} + examen /${fiche.bareme_examen} = /${fiche.bareme_total}`}
          >
            {fiche.lignes.length === 0 ? (
              <Vide message="Personne n'est inscrit dans cette promotion." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[46rem] border-collapse">
                  <thead>
                    <tr className="bg-surface-row-alt text-label-sm uppercase text-outline">
                      <th className="px-4 py-2 text-left font-medium">Matricule</th>
                      <th className="px-2 py-2 text-left font-medium">Nom</th>
                      <th className="w-[6rem] px-2 py-2 text-center font-medium">Travaux</th>
                      <th className="w-[6rem] px-2 py-2 text-center font-medium">Examen</th>
                      <th className="w-[5rem] px-2 py-2 text-center font-medium">ND</th>
                      <th className="w-[6rem] px-4 py-2 text-right font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fiche.lignes.map((l) => {
                      const b = brouillons[l.inscription_id] ?? { travaux: "", examen: "", nd: false };
                      const fige = l.envoye_au_jury && !fiche.peut_gerer;
                      return (
                        <tr key={l.inscription_id} className="border-t border-hairline">
                          <td className="px-4 py-1.5 font-mono text-label-md text-outline">
                            {l.matricule}
                          </td>
                          <td className="px-2 py-1.5 text-body-sm text-on-surface">
                            {l.nom_complet}
                            {/* « Pas encore saisi » se voit : c'est ce qui
                                bloquera la délibération. */}
                            {!l.saisie && (
                              <span className="ml-2 text-label-md text-outline">non coté</span>
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              aria-label={`Travaux de ${l.nom_complet}`}
                              type="number"
                              min={0}
                              max={fiche.bareme_travaux}
                              step="0.25"
                              disabled={!modifiable || fige || b.nd}
                              value={b.travaux}
                              onChange={(e) => poser(l.inscription_id, "travaux", e.target.value)}
                              className="h-8 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-center text-body-sm tabular-nums text-on-surface outline-none focus:border-primary disabled:opacity-50"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              aria-label={`Examen de ${l.nom_complet}`}
                              type="number"
                              min={0}
                              max={fiche.bareme_examen}
                              step="0.25"
                              disabled={!modifiable || fige || b.nd}
                              value={b.examen}
                              onChange={(e) => poser(l.inscription_id, "examen", e.target.value)}
                              className="h-8 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-center text-body-sm tabular-nums text-on-surface outline-none focus:border-primary disabled:opacity-50"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <input
                              aria-label={`Non délibéré pour ${l.nom_complet}`}
                              type="checkbox"
                              disabled={!modifiable || fige}
                              checked={b.nd}
                              onChange={(e) => poser(l.inscription_id, "nd", e.target.checked)}
                            />
                          </td>
                          <td className="px-4 py-1.5 text-right text-body-sm tabular-nums text-on-surface">
                            {l.total_arrete !== null ? (
                              <span title="Total arrêté par un jury — ce n'est pas une somme de notes">
                                {l.total_arrete} <span className="text-outline">arrêté</span>
                              </span>
                            ) : l.non_delibere ? (
                              <span className="text-outline">ND</span>
                            ) : l.total === null ? (
                              <span className="text-outline">—</span>
                            ) : (
                              l.total
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Carte>

          {(modifiable || fiche.peut_gerer) && (
            <div className="flex flex-wrap items-center gap-2">
              {modifiable && (
                <button type="button" disabled={busy} onClick={enregistrer} className={BOUTON}>
                  Enregistrer les cotes
                </button>
              )}
              {modifiable && !fiche.remise_au_jury && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    agir(() => api.envoyerAuJury(id, session), "Fiche remise au jury.")
                  }
                  className={BOUTON_PLAT}
                >
                  <SendOutlined style={{ fontSize: 16 }} />
                  Envoyer au jury
                </button>
              )}
              {fiche.peut_gerer && fiche.remise_au_jury && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setARouvrir(true)}
                  className={BOUTON_PLAT}
                >
                  Rouvrir l&apos;encodage
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Rouvrir après le jury doit pouvoir s'expliquer : le motif est exigé par
          le serveur, l'écran le demande donc avant d'appeler. */}
      {aRouvrir && (
        <ConfirmDialog
          title="Rouvrir l'encodage de ce cours ?"
          message="Les cotes redeviendront modifiables par l'enseignant. Le motif est conservé dans le journal des cotes."
          confirmLabel="Rouvrir"
          onConfirm={() => {
            const motif = window.prompt("Motif de la réouverture ?");
            if (!motif) return;
            setARouvrir(false);
            void agir(
              () => api.rouvrirCotation(id, session, motif),
              "Encodage rouvert."
            );
          }}
          onCancel={() => setARouvrir(false)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
