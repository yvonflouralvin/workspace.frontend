"use client";

import { useMemo } from "react";
import { WarningAmberOutlined } from "@mui/icons-material";
import { DataList, type DataListColumn } from "@repo/ui/DataList";
import { heureCourte, type Reservation } from "@/lib/operations-api";

/** La journée en liste, triée par heure d'arrivée — l'autre lecture d'« qu'est-ce
 *  qui se passe aujourd'hui ? » que la frise ne donne pas d'un coup d'œil : une
 *  frise répond « qui est libre à telle heure », une liste répond « dans quel
 *  ordre j'accueille ces gens ». Même filtre qu'elle (une réservation refusée
 *  n'occupe rien, elle ne figure dans aucune des deux vues).
 */
export function ListeSalles({
  reservations,
  onReservation,
}: {
  reservations: Reservation[];
  onReservation?: (r: Reservation) => void;
}) {
  const lignes = useMemo(
    () =>
      reservations
        .filter((r) => r.statut !== "REFUSEE")
        .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime()),
    [reservations],
  );

  const colonnes: DataListColumn<Reservation>[] = [
    {
      key: "heure",
      header: "Heure",
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          {r.en_chevauchement && (
            <WarningAmberOutlined style={{ fontSize: 14 }} className="text-error" />
          )}
          {heureCourte(r.debut)}–{heureCourte(r.fin)}
        </span>
      ),
    },
    {
      key: "titre",
      header: "Titre",
      render: (r) => (
        <span>
          {r.objet ?? "Sans objet précisé"}
          {r.statut === "DEMANDEE" && (
            <span className="ml-2 rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
              en attente
            </span>
          )}
        </span>
      ),
    },
    {
      key: "ressource",
      header: "Ressource demandée",
      render: (r) => (
        <span>
          {r.salle ?? "—"}
          {r.capacite ? (
            <span className="ml-1.5 text-label-md text-on-surface-variant">
              {r.capacite} places
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "demandeur",
      header: "Demandé par",
      render: (r) => r.demandeur ?? "—",
    },
  ];

  return (
    <DataList
      items={lignes}
      columns={colonnes}
      getRowKey={(r) => r.id}
      onRowClick={onReservation}
      emptyMessage="Aucune activité ce jour-là."
      pageSize={50}
    />
  );
}
