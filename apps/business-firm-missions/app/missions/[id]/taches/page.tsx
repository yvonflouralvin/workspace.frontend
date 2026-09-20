"use client";

import { VueTaches } from "@/components/VueTaches";
import { useMission } from "../mission-context";

/** Toutes les tâches de la mission, phases confondues — sans descendre phase par phase. */
export default function TachesMissionPage() {
  const { missionId, mission, membres, phases, taches, reload } = useMission();
  return (
    <VueTaches
      missionId={missionId}
      mission={mission}
      membres={membres}
      taches={taches}
      phases={phases}
      reload={reload}
    />
  );
}
