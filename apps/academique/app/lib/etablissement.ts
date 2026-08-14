"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Annee, type Etablissement } from "@/app/lib/api";

/** L'établissement et l'année sur lesquels on travaille.
 *
 *  Tous les écrans en dépendent, et aucun ne devrait redemander les deux à
 *  chaque navigation. Le choix d'établissement vit dans le navigateur — c'est
 *  une préférence d'écran ; celui de l'année vit sur le SERVEUR (`/moi/annee`),
 *  parce qu'un agent le retrouve d'un poste à l'autre, et que le back-end s'en
 *  sert déjà pour répondre.
 */
const CLE = "academique.etablissement";

export function useContexte() {
  const [etablissements, setEtablissements] = useState<Etablissement[] | null>(null);
  const [etablissement, setEtablissementEtat] = useState<Etablissement | null>(null);
  const [annee, setAnnee] = useState<Annee | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    api
      .etablissements()
      .then((liste) => {
        setEtablissements(liste);
        const memorise = Number(
          typeof window !== "undefined" ? window.localStorage.getItem(CLE) : 0
        );
        setEtablissementEtat(liste.find((e) => e.id === memorise) ?? liste[0] ?? null);
      })
      .catch((e) => {
        setErreur(e instanceof Error ? e.message : "Chargement impossible.");
        setEtablissements([]);
      });
  }, []);

  const rechargerAnnee = useCallback(async (etab: Etablissement | null) => {
    if (!etab) return;
    try {
      setAnnee(await api.monAnnee(etab.id));
    } catch {
      // Aucune année ouverte : ce n'est pas une panne, c'est un état de
      // l'établissement. Les écrans le disent à leur façon.
      setAnnee(null);
    }
  }, []);

  useEffect(() => {
    void rechargerAnnee(etablissement);
  }, [etablissement, rechargerAnnee]);

  function setEtablissement(etab: Etablissement) {
    window.localStorage.setItem(CLE, String(etab.id));
    setEtablissementEtat(etab);
  }

  async function choisirAnnee(annee_id: number) {
    if (!etablissement) return;
    setAnnee(await api.choisirMonAnnee(etablissement.id, annee_id));
  }

  return {
    etablissements,
    etablissement,
    setEtablissement,
    annee,
    choisirAnnee,
    rechargerAnnee: () => rechargerAnnee(etablissement),
    erreur,
  };
}
