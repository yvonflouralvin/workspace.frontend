"use client";

import Link from "next/link";
import { ArrowBackOutlined } from "@mui/icons-material";
import { SettingRow } from "@repo/ui/SettingRow";
import { usePhase } from "../phase-context";
import { PHASE_TOOLS } from "../phase-sections";

export default function PhaseToolsPage() {
  const { phase, queue, canManage } = usePhase();
  const enabled = phase.tools ?? [];

  function toggle(key: string, next: boolean) {
    const tools = next ? [...new Set([...enabled, key])] : enabled.filter((t) => t !== key);
    queue({ tools });
  }

  return (
    <div className="max-w-[820px] space-y-5">
      <Link
        href={`/projects/${phase.project_id}/phases/${phase.id}`}
        className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
      >
        <ArrowBackOutlined style={{ fontSize: 15 }} /> Aperçu de la phase
      </Link>

      <div>
        <h2 className="font-display text-headline-sm text-on-surface">Outils de la phase</h2>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          Une phase n&apos;ouvre que ce dont elle a besoin. Activer un outil ajoute ses
          onglets à cette phase — les autres phases du projet ne changent pas.
        </p>
      </div>

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
        {PHASE_TOOLS.map((tool) => (
          <SettingRow
            key={tool.key}
            name={tool.label}
            description={tool.description}
            type="toggle"
            value={enabled.includes(tool.key)}
            state={enabled.includes(tool.key) ? "ok" : "default"}
            disabled={!canManage}
            onChange={(next) => toggle(tool.key, Boolean(next))}
          />
        ))}
      </div>

      {!canManage && (
        <p className="text-body-sm text-on-surface-variant">
          Seuls les gestionnaires du projet peuvent activer un outil.
        </p>
      )}
    </div>
  );
}
