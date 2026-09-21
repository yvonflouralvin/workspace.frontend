"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRightOutlined, GroupOutlined } from "@mui/icons-material";
import { listEquipeMission } from "@/lib/bfm-missions-api";
import { useMission } from "../mission-context";

interface EntreeParametre {
  key: string;
  /** Suffixe d'URL sous /missions/[id]/parametres. */
  path: string;
  label: string;
  description: string;
  icon: ReactNode;
  /** Ce qui s'affiche à droite avant le chevron — un compte, en général. */
  detail?: string;
}

// Ajouter un paramètre = une entrée ici + le dossier de route correspondant.
export default function ParametresPage() {
  const { missionId } = useMission();
  const [nbCollaborateurs, setNbCollaborateurs] = useState<number | null>(null);

  useEffect(() => {
    listEquipeMission(missionId).then((l) => setNbCollaborateurs(l.length));
  }, [missionId]);

  const entrees: EntreeParametre[] = [
    {
      key: "collaborateurs",
      path: "/collaborateurs",
      label: "Collaborateurs",
      description: "Les personnes affectées à cette mission.",
      icon: <GroupOutlined style={{ fontSize: 20 }} />,
      detail:
        nbCollaborateurs === null
          ? undefined
          : nbCollaborateurs === 0
            ? "Aucun"
            : String(nbCollaborateurs),
    },
  ];

  return (
    <div className="max-w-[820px] space-y-5">
      <div>
        <h2 className="font-display text-headline-sm text-on-surface">Paramètres de la mission</h2>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Choisissez ce que vous voulez régler.
        </p>
      </div>

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden divide-y divide-hairline">
        {entrees.map((e) => (
          <Link
            key={e.key}
            href={`/missions/${missionId}/parametres${e.path}`}
            className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-surface-container-low transition-colors"
          >
            <span className="w-9 h-9 flex-none rounded-[10px] bg-surface-container flex items-center justify-center text-on-surface-variant">
              {e.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body-md font-medium text-on-surface">{e.label}</span>
              <span className="block text-body-sm text-on-surface-variant">{e.description}</span>
            </span>
            {e.detail && <span className="text-body-sm text-outline tabular-nums">{e.detail}</span>}
            <ChevronRightOutlined style={{ fontSize: 18 }} className="text-outline flex-none" />
          </Link>
        ))}
      </div>
    </div>
  );
}
