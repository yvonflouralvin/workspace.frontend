"use client";

import { useState } from "react";
import { AddOutlined } from "@mui/icons-material";
import { JalonDrawer } from "@/components/projects/JalonDrawer";
import { JalonsTimeline } from "@/components/projects/JalonsTimeline";
import { retientLaPhase } from "@/app/lib/jalons-api";
import { useProject } from "../project-context";

export default function JalonsPage() {
  const { projectId, jalons, phases, reloadJalons, canManage } = useProject();
  const [drawer, setDrawer] = useState(false);

  const retiennent = jalons.filter(retientLaPhase).length;

  return (
    <div className="max-w-[820px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-[52ch] text-body-sm text-on-surface-variant">
          Un jalon est un point où l&apos;on ne produit rien : on vérifie et on décide. Les
          gates bloquantes retiennent la phase tant qu&apos;aucune décision n&apos;a été rendue.
        </p>
        {canManage && (
          <button
            onClick={() => setDrawer(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Nouveau jalon
          </button>
        )}
      </div>

      {retiennent > 0 && (
        <p className="text-body-sm text-on-surface-variant">
          <span className="font-semibold text-error">
            {retiennent} jalon{retiennent > 1 ? "s" : ""} bloquant{retiennent > 1 ? "s" : ""}
          </span>{" "}
          {retiennent > 1 ? "attendent" : "attend"} une décision.
        </p>
      )}

      {jalons.length === 0 ? (
        <p className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-6 text-center text-body-sm text-on-surface-variant">
          Aucun jalon sur ce projet.
        </p>
      ) : (
        <JalonsTimeline jalons={jalons} phases={phases} projectId={projectId} />
      )}

      {drawer && (
        <JalonDrawer
          jalon={null}
          onClose={() => setDrawer(false)}
          onSaved={async () => {
            await reloadJalons();
            setDrawer(false);
          }}
        />
      )}
    </div>
  );
}
