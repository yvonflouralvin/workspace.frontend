"use client";

import { VueTaches } from "@/components/VueTaches";
import { useMission } from "../../../mission-context";
import { usePhase } from "../phase-context";

export default function TachesPhasePage() {
  const { missionId, mission, membres, phases, reload } = useMission();
  const { phase, taches } = usePhase();
  return (
    <VueTaches
      missionId={missionId}
      mission={mission}
      membres={membres}
      taches={taches}
      phases={phases}
      phaseFixe={phase}
      reload={reload}
    />
  );
}
