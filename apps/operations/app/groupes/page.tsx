"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BoltOutlined,
  LocalGasStationOutlined,
  PowerSettingsNewOutlined,
  ReportProblemOutlined,
} from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import { SelecteurVue, type VueDef } from "@/components/SelecteurVue";
import { PanneauIncidents } from "@/components/notes/PanneauIncidents";
import { PanneauGroupes } from "@/components/groupes/PanneauGroupes";
import { PanneauUsages } from "@/components/groupes/PanneauUsages";
import { PanneauCarburant } from "@/components/groupes/PanneauCarburant";

const s = { fontSize: 18 };

const VUES: VueDef[] = [
  {
    cle: "groupes",
    libelle: "Groupes",
    description: "Le parc, et ce qui tourne en ce moment",
    icone: <BoltOutlined style={s} />,
  },
  {
    cle: "usages",
    libelle: "Utilisations",
    description: "Démarrages et arrêts, avec leur durée",
    icone: <PowerSettingsNewOutlined style={s} />,
  },
  {
    cle: "carburant",
    libelle: "Ravitaillement",
    description: "Le carburant qui entre en réserve et qui en sort",
    icone: <LocalGasStationOutlined style={s} />,
  },
  {
    cle: "incidents",
    libelle: "Notes & incidents",
    description: "Ce qui a été signalé sur les utilisations",
    icone: <ReportProblemOutlined style={s} />,
  },
];

/** Le menu « Groupes électrogènes ».
 *
 *  Même structure que Plannings et Salles : un sélecteur plutôt que quatre
 *  entrées de barre latérale. Operations accueillera d'autres sujets, et une
 *  barre qui listerait chaque écran de chaque menu deviendrait illisible. */
function Contenu() {
  const router = useRouter();
  const params = useSearchParams();
  const vue = params.get("vue") ?? "groupes";

  const changer = useCallback(
    (cle: string) => {
      router.replace(cle === "groupes" ? "/groupes" : `/groupes?vue=${cle}`, { scroll: false });
    },
    [router],
  );

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="px-4 pt-4 md:px-8 md:pt-8">
        <SelecteurVue vues={VUES} courante={vue} onChange={changer} />
      </div>

      {vue === "usages" ? (
        <PanneauUsages />
      ) : vue === "carburant" ? (
        <PanneauCarburant />
      ) : vue === "incidents" ? (
        <PanneauIncidents
          sujetType="USAGE_GROUPE"
          titre="Notes & incidents"
          description="Ce qui a été observé ou signalé pendant l'utilisation d'un groupe. Un incident reste ouvert tant que personne ne l'a clôturé."
        />
      ) : (
        <PanneauGroupes />
      )}
    </div>
  );
}

export default function GroupesPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<div className="p-8 text-body-sm text-on-surface-variant">Chargement…</div>}>
        <Contenu />
      </Suspense>
    </DashboardShell>
  );
}
