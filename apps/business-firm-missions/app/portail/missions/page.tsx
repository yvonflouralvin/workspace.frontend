"use client";

import { useEffect, useState } from "react";
import { CarteMissionPortail } from "@/components/CarteMissionPortail";
import { listMissionsPortail, type PortailMission } from "@/lib/bfm-portail-api";

export default function MissionsPortailPage() {
  const [missions, setMissions] = useState<PortailMission[] | null>(null);
  useEffect(() => {
    listMissionsPortail().then(setMissions).catch(() => setMissions([]));
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-headline-md text-on-surface">Vos missions</h1>
      {missions === null && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}
      {missions !== null && missions.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">Aucune mission pour le moment.</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {(missions ?? []).map((m) => (
          <CarteMissionPortail key={m.id} mission={m} />
        ))}
      </div>
    </div>
  );
}
