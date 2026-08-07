"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  EventOutlined,
  GroupsOutlined,
  PlaceOutlined,
  QueryStatsOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { SelecteurVue, type VueDef } from "@/components/SelecteurVue";
import { PanneauListePlannings } from "@/components/vues/PanneauListePlannings";
import { PanneauRessources } from "@/components/vues/PanneauRessources";
import { PanneauSites } from "@/components/vues/PanneauSites";
import { PanneauCharge } from "@/components/vues/PanneauCharge";
import { PanneauChevauchements } from "@/components/vues/PanneauChevauchements";

const s = { fontSize: 18 };

const VUES: VueDef[] = [
  {
    cle: "plannings",
    libelle: "Plannings",
    description: "Les calendriers d'affectation et leurs créneaux",
    icone: <EventOutlined style={s} />,
  },
  {
    cle: "ressources",
    libelle: "Ressources",
    description: "Qui l'on affecte — importés des RH ou saisis ici",
    icone: <GroupsOutlined style={s} />,
  },
  {
    cle: "sites",
    libelle: "Sites",
    description: "Où l'on intervient",
    icone: <PlaceOutlined style={s} />,
  },
  {
    cle: "charge",
    libelle: "Charge",
    description: "Prestations et heures par ressource",
    icone: <QueryStatsOutlined style={s} />,
  },
  {
    cle: "chevauchements",
    libelle: "Chevauchements",
    description: "Ce qui a été maintenu malgré un conflit",
    icone: <WarningAmberOutlined style={s} />,
  },
];

/** Le menu « Plannings » : l'affectation de ressources à des sites.
 *
 *  Cinq écrans pour un même sujet, choisis par un sélecteur plutôt que par cinq
 *  entrées de barre latérale. Operations accueillera d'autres menus — Salles,
 *  et le reste des opérations — et une barre qui listerait chaque écran de
 *  chaque menu deviendrait vite illisible.
 *
 *  La vue courante vit dans l'URL (`?vue=`) : un écran se partage, et le retour
 *  arrière du navigateur fait ce qu'on attend de lui. */
function Contenu() {
  const router = useRouter();
  const params = useSearchParams();
  const vue = params.get("vue") ?? "plannings";

  const changer = useCallback(
    (cle: string) => {
      router.replace(cle === "plannings" ? "/plannings" : `/plannings?vue=${cle}`, {
        scroll: false,
      });
    },
    [router],
  );

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="px-4 pt-4 md:px-8 md:pt-8">
        <SelecteurVue vues={VUES} courante={vue} onChange={changer} />
      </div>

      {vue === "ressources" ? (
        <PanneauRessources />
      ) : vue === "sites" ? (
        <PanneauSites />
      ) : vue === "charge" ? (
        <PanneauCharge />
      ) : vue === "chevauchements" ? (
        <PanneauChevauchements />
      ) : (
        <PanneauListePlannings />
      )}
    </div>
  );
}

export default function PlanningsPage() {
  return (
    <DashboardShell>
      {/* `useSearchParams` impose une frontière de Suspense au prérendu. */}
      <Suspense fallback={<div className="p-8 text-body-sm text-on-surface-variant">Chargement…</div>}>
        <Contenu />
      </Suspense>
    </DashboardShell>
  );
}
