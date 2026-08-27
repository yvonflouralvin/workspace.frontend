"use client";

import { FileDownloadOutlined } from "@mui/icons-material";
import { DropdownMenu } from "@repo/ui/DropdownMenu";

import type { FiltresExec } from "@/components/FiltresExecutions";

/** Emporter le registre.
 *
 *  **Deux granularités**, parce que deux questions se posent : le résumé
 *  répond à « qu'a-t-on passé, quand, avec combien d'anomalies », le détail à
 *  « quel était l'index du compteur chaque semaine ». Un résumé qui annonce
 *  « 2 anomalies » sans dire lesquelles n'aide personne à les corriger ; un
 *  détail qui multiplie les lignes par le nombre de points rend illisible un
 *  simple pointage de rondes.
 *
 *  L'export suit les FILTRES affichés, pas la page : un CSV tronqué à vingt
 *  lignes serait un piège.
 */
export function ExportExecutions({
  base,
  filtres,
  avecRecherche = true,
}: {
  /** `/api/executions/export` ou `/api/process/<ref>/executions/export`. */
  base: string;
  filtres: FiltresExec;
  avecRecherche?: boolean;
}) {
  function telecharger(granularite: "resume" | "detail") {
    const params = new URLSearchParams({ granularite });
    if (avecRecherche && filtres.q) params.set("q", filtres.q);
    if (filtres.statut !== "tous") params.set("statut", filtres.statut);
    if (filtres.du) params.set("du", filtres.du);
    if (filtres.au) params.set("au", filtres.au);
    // Une navigation et non un `fetch` : le navigateur suit le
    // `Content-Disposition` et enregistre le fichier lui-même.
    window.location.href = `${base}?${params}`;
  }

  return (
    <DropdownMenu
      label="Exporter"
      icon={<FileDownloadOutlined style={{ fontSize: 16 }} />}
      items={[
        {
          key: "resume",
          label: "Résumé — une ligne par exécution",
          onClick: () => telecharger("resume"),
        },
        {
          key: "detail",
          label: "Détail — une ligne par point relevé",
          onClick: () => telecharger("detail"),
        },
      ]}
    />
  );
}
