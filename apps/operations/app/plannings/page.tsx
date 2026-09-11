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
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { SelecteurVue, type VueDef } from "@/components/SelecteurVue";
import { PanneauListePlannings } from "@/components/vues/PanneauListePlannings";
import { PanneauRessources } from "@/components/vues/PanneauRessources";
import { PanneauSites } from "@/components/vues/PanneauSites";
import { PanneauCharge } from "@/components/vues/PanneauCharge";
import { PanneauChevauchements } from "@/components/vues/PanneauChevauchements";

const s = { fontSize: 18 };

// Chaque vue porte la permission qui la rend visible — même logique que
// `NAV_ITEMS` dans `DashboardShell` (cf. `entreesAutorisees`). Sans ce garde,
// un groupe cantonné à `operations.plannings.view` voyait quand même
// Ressources/Sites dans le sélecteur : l'API les refusait (403), mais
// l'option n'aurait jamais dû apparaître.
const VUES: (VueDef & { permission: string })[] = [
  {
    cle: "plannings",
    libelle: "Plannings",
    description: "Les calendriers d'affectation et leurs créneaux",
    icone: <EventOutlined style={s} />,
    permission: "operations.plannings.view",
  },
  {
    cle: "ressources",
    libelle: "Ressources",
    description: "Qui l'on affecte — importés des RH ou saisis ici",
    icone: <GroupsOutlined style={s} />,
    permission: "operations.ressources.view",
  },
  {
    cle: "sites",
    libelle: "Sites",
    description: "Où l'on intervient",
    icone: <PlaceOutlined style={s} />,
    permission: "operations.sites.view",
  },
  {
    cle: "charge",
    libelle: "Charge",
    description: "Prestations et heures par ressource",
    icone: <QueryStatsOutlined style={s} />,
    permission: "operations.plannings.view",
  },
  {
    cle: "chevauchements",
    libelle: "Chevauchements",
    description: "Ce qui a été maintenu malgré un conflit",
    icone: <WarningAmberOutlined style={s} />,
    permission: "operations.plannings.view",
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
  const { can } = usePermissions();
  const vuesAutorisees = VUES.filter((v) => can(v.permission));
  // Vue demandée par l'URL mais hors permissions (lien partagé, saisie manuelle) :
  // on retombe sur la première vue accessible plutôt que d'afficher un panneau
  // qui n'obtiendra qu'un 403 de l'API.
  const demandee = params.get("vue") ?? "plannings";
  const vue = vuesAutorisees.some((v) => v.cle === demandee)
    ? demandee
    : (vuesAutorisees[0]?.cle ?? demandee);

  const changer = useCallback(
    (cle: string) => {
      router.replace(cle === "plannings" ? "/plannings" : `/plannings?vue=${cle}`, {
        scroll: false,
      });
    },
    [router],
  );

  if (vuesAutorisees.length === 0) {
    return (
      <div className="mx-auto max-w-[1200px] p-4 md:p-8">
        <p className="text-body-md text-on-surface-variant">
          Vous n&apos;avez accès à aucun écran de ce menu.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="px-4 pt-4 md:px-8 md:pt-8">
        <SelecteurVue vues={vuesAutorisees} courante={vue} onChange={changer} />
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
