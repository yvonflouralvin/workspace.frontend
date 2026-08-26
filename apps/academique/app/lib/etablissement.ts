"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type Annee, type Etablissement } from "@/app/lib/api";

/** L'établissement et l'année sur lesquels on travaille.
 *
 *  **Un workspace, un établissement.** Il n'y a donc rien à choisir : l'écran
 *  ne demande plus lequel, il le lit. L'ancienne liste déroulante posait une
 *  question dont la réponse était toujours la même, et laissait croire qu'un
 *  workspace pouvait en abriter plusieurs.
 *
 *  L'année, elle, se choisit — et son choix vit sur le SERVEUR (`/moi/annee`),
 *  parce qu'un agent le retrouve d'un poste à l'autre, et que le back-end s'en
 *  sert déjà pour répondre.
 */
export function useContexte() {
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  /** Les établissements en trop, s'il y en a. Le service refuse désormais d'en
   *  créer un second, mais une base peut en porter d'anciens : les ignorer en
   *  silence ferait disparaître des étudiants d'un registre sans explication. */
  const [surnombre, setSurnombre] = useState<Etablissement[]>([]);
  const [annee, setAnnee] = useState<Annee | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  /** Vrai dès que la question « ce workspace a-t-il un établissement ? » a une
   *  réponse. Sans lui, `etablissement === null` veut dire deux choses — « pas
   *  encore chargé » et « il n'y en a pas » — et l'écran annonce un espace vide
   *  le temps d'un aller-retour réseau. */
  const [pret, setPret] = useState(false);

  const rechargerEtablissement = useCallback(async () => {
    try {
      const liste = await api.etablissements();
      setEtablissement(liste[0] ?? null);
      setSurnombre(liste.slice(1));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    } finally {
      setPret(true);
    }
  }, []);

  useEffect(() => {
    void rechargerEtablissement();
  }, [rechargerEtablissement]);

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

  async function choisirAnnee(annee_id: number) {
    if (!etablissement) return;
    setAnnee(await api.choisirMonAnnee(etablissement.id, annee_id));
  }

  return {
    etablissement,
    surnombre,
    annee,
    pret,
    choisirAnnee,
    rechargerAnnee: () => rechargerAnnee(etablissement),
    rechargerEtablissement,
    erreur,
  };
}
