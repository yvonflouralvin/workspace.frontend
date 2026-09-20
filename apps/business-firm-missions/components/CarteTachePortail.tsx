"use client";

import Link from "next/link";
import { ChevronRightOutlined } from "@mui/icons-material";
import { dateFr, enRetard } from "@/lib/format";
import type { PortailTache } from "@/lib/bfm-portail-api";
import { StatutTachePill } from "@/app/missions/[id]/ui";

/** Une tâche que le cabinet attend du client — une ligne, un lien. */
export function LigneTachePortail({ tache }: { tache: PortailTache }) {
  const retard = enRetard(tache.due_date, tache.statut === "TERMINEE");
  return (
    <Link
      href={`/portail/taches/${tache.id}`}
      className="flex items-center gap-3 px-4 py-3 border-b border-hairline last:border-b-0 hover:bg-surface-container-low transition-colors"
    >
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-body-md font-medium ${
            tache.statut === "TERMINEE" ? "text-outline line-through" : "text-on-surface"
          }`}
        >
          {tache.titre}
        </span>
        <span className="block truncate text-label-md text-outline">
          {[tache.mission_nom, tache.phase_nom].filter(Boolean).join(" · ")}
        </span>
      </span>
      {tache.due_date && (
        <span className={`hidden sm:block flex-none text-label-md ${retard ? "font-semibold text-error" : "text-on-surface-variant"}`}>
          {retard ? "En retard · " : "Pour le "}
          {dateFr(tache.due_date)}
        </span>
      )}
      <span className="flex-none">
        <StatutTachePill statut={tache.statut} />
      </span>
      <ChevronRightOutlined style={{ fontSize: 18 }} className="flex-none text-outline" />
    </Link>
  );
}
