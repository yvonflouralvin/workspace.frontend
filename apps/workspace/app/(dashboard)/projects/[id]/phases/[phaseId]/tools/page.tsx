"use client";

import Link from "next/link";
import { ArrowBackOutlined } from "@mui/icons-material";
import { SettingRow } from "@repo/ui/SettingRow";
import { useProject } from "../../../project-context";
import { usePhase } from "../phase-context";
import { PHASE_TOOLS } from "../phase-sections";

export default function PhaseToolsPage() {
  const { phase, queue } = usePhase();
  // Activer un outil relève du propriétaire du projet (le backend l'impose aussi).
  const { isOwner: canManage } = useProject();
  const tools = phase.tools ?? {};

  function setTool(key: string, value: boolean | string, off: boolean | string) {
    const next = { ...tools };
    // L'absence de clé est le seul état « désactivé » — pas deux façons de dire non.
    if (value === off) delete next[key];
    else next[key] = value;
    queue({ tools: next });
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
        {PHASE_TOOLS.map((tool) => {
          const active = tool.kind === "toggle" ? tools[tool.key] === true : tools[tool.key] !== undefined;
          return (
            <SettingRow
              key={tool.key}
              name={tool.label}
              description={tool.description}
              type={tool.kind === "toggle" ? "toggle" : "single_choice"}
              value={
                tool.kind === "toggle"
                  ? active
                  : ((tools[tool.key] as string | undefined) ?? tool.off)
              }
              options={tool.kind === "choice" ? tool.options : undefined}
              state={active ? "ok" : "default"}
              disabled={!canManage}
              onChange={(next) =>
                tool.kind === "toggle"
                  ? setTool(tool.key, Boolean(next), false)
                  : setTool(tool.key, String(next || tool.off), tool.off)
              }
            />
          );
        })}
      </div>

      {!canManage && (
        <p className="text-body-sm text-on-surface-variant">
          Seul le propriétaire du projet peut activer un outil.
        </p>
      )}
    </div>
  );
}
