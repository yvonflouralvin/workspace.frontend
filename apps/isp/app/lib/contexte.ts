"use client";

import { useEffect, useState } from "react";
import { academia, type UniteAcademique } from "@/app/lib/api";

/** Le département et l'année sur lesquels on travaille — lus dans Academia.
 *
 *  L'ISP ne tient pas ce référentiel : elle le demande. Le recopier ici en
 *  ferait un second, qui divergerait dès la première réorganisation.
 */
const CLE = "isp.unite";

export function useContexte() {
  const [unites, setUnites] = useState<UniteAcademique[]>([]);
  const [unite, setUniteEtat] = useState<UniteAcademique | null>(null);
  const [annee, setAnnee] = useState<{ id: number; libelle: string } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    academia
      .etablissements()
      .then(async (etabs) => {
        const etab = etabs[0];
        if (!etab) {
          setErreur("Aucun établissement dans Academia : créez-le d'abord.");
          return;
        }
        const [liste, a] = await Promise.all([
          academia.unites(etab.id),
          academia.annee(etab.id).catch(() => null),
        ]);
        // Seules les unités qui inscrivent portent des travaux : proposer une
        // faculté ferait chercher des mémoires là où il n'y a pas d'étudiants.
        const inscriptibles = liste.filter((u) => u.peut_inscrire);
        setUnites(inscriptibles);
        setAnnee(a);
        const memorise = Number(
          typeof window !== "undefined" ? window.localStorage.getItem(CLE) : 0
        );
        setUniteEtat(inscriptibles.find((u) => u.id === memorise) ?? inscriptibles[0] ?? null);
      })
      .catch((e) =>
        setErreur(
          e instanceof Error
            ? `Academia : ${e.message}`
            : "Le service académique n'a pas répondu."
        )
      );
  }, []);

  function setUnite(u: UniteAcademique) {
    window.localStorage.setItem(CLE, String(u.id));
    setUniteEtat(u);
  }

  return { unites, unite, setUnite, annee, erreur };
}
