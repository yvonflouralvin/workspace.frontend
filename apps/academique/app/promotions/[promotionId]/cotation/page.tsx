"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRightOutlined, LockOutlined } from "@mui/icons-material";
import { api, type Programme } from "@/app/lib/api";
import { Carte, Erreur, Pastille, Vide } from "@/components/Bloc";
import { usePromotion } from "../promotion-context";

/** La liste des cours à coter, avec l'état de chacun.
 *
 *  L'écran dit d'un coup d'œil ce qui reste à faire : combien de cotes sont
 *  posées, lesquelles sont remises au jury. Sans ce compte, il faut ouvrir les
 *  trente fiches pour savoir laquelle manque.
 */
export default function CotationPage() {
  const { promotionId, session } = usePromotion();
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [etats, setEtats] = useState<Record<number, { saisies: number; total: number; remise: boolean }>>({});
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const p = await api.programme(promotionId);
      setProgramme(p);
      setErreur(null);

      // Une fiche par élément : c'est la seule façon de connaître l'état de
      // chacun, et le compte est ce qui évite d'ouvrir trente écrans.
      const elements = p.unites.flatMap((u) => u.elements);
      const lus = await Promise.all(
        elements.map((e) =>
          api
            .ficheCotation(e.id, session)
            .then((f) => ({
              id: e.id,
              saisies: f.lignes.filter((l) => l.saisie).length,
              total: f.lignes.length,
              remise: f.remise_au_jury,
            }))
            .catch(() => ({ id: e.id, saisies: 0, total: 0, remise: false }))
        )
      );
      setEtats(Object.fromEntries(lus.map((l) => [l.id, l])));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [promotionId, session]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const unites = programme?.unites ?? [];
  const vide = programme !== null && unites.every((u) => u.elements.length === 0);

  return (
    <div className="space-y-4">
      <Erreur message={erreur} />

      {programme === null ? (
        <p className="text-body-sm text-on-surface-variant">Chargement…</p>
      ) : vide ? (
        <Carte>
          <Vide message="Cette promotion n'a pas encore de programme : il n'y a rien à coter.">
            <Link
              href={`/promotions/${promotionId}/programme`}
              className="text-body-sm font-semibold text-primary hover:underline"
            >
              Poser le programme
            </Link>
          </Vide>
        </Carte>
      ) : (
        unites
          .filter((u) => u.elements.length > 0)
          .map((unite) => (
            <Carte
              key={unite.id}
              titre={`${unite.code} — ${unite.intitule}`}
              sousTitre={`Période ${unite.periode} · ${unite.credits} crédits`}
            >
              <div className="divide-y divide-hairline">
                {unite.elements.map((element) => {
                  const etat = etats[element.id];
                  const complet = etat && etat.total > 0 && etat.saisies === etat.total;
                  return (
                    <Link
                      key={element.id}
                      href={`/promotions/${promotionId}/cotation/${element.id}`}
                      className="flex flex-wrap items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-container-low"
                    >
                      <span className="min-w-0 flex-1 text-body-sm text-on-surface">
                        {element.intitule}
                        <span className="ml-2 text-label-md text-outline">
                          {element.credits} cr
                        </span>
                      </span>
                      <span className="w-[12rem] flex-none truncate text-label-md text-on-surface-variant">
                        {element.titulaire_nom || "Titulaire non attribué"}
                      </span>
                      {etat && (
                        <Pastille ton={complet ? "ok" : etat.saisies ? "attente" : "neutre"}>
                          {etat.saisies}/{etat.total} coté{etat.saisies > 1 ? "s" : ""}
                        </Pastille>
                      )}
                      {etat?.remise && (
                        <Pastille ton="info" titre="Remise au jury : l'enseignant ne modifie plus">
                          <LockOutlined style={{ fontSize: 13 }} />
                          Au jury
                        </Pastille>
                      )}
                      <ChevronRightOutlined style={{ fontSize: 18 }} className="text-outline" />
                    </Link>
                  );
                })}
              </div>
            </Carte>
          ))
      )}
    </div>
  );
}
