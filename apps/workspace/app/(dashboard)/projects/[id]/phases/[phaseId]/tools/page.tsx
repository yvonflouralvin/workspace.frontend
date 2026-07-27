"use client";

import Link from "next/link";
import { ArrowBackOutlined } from "@mui/icons-material";
import { SettingRow } from "@repo/ui/SettingRow";
import { Switch } from "@repo/ui/Switch";
import { CATEGORIE_LABELS, outilActif, paramsTableau } from "@/app/lib/projects-api";
import { useProject } from "../../../project-context";
import { usePhase } from "../phase-context";
import { PHASE_TOOLS } from "../phase-sections";

export default function PhaseToolsPage() {
  const { phase, queue } = usePhase();
  // Activer un outil relève du propriétaire du projet (le backend l'impose aussi).
  const { isOwner: canManage, etats } = useProject();
  const tools = phase.tools ?? {};
  const tableau = paramsTableau(phase);
  // Une limite ne s'applique qu'au travail EN COURS — le backend refuse le
  // reste, autant ne proposer que les états concernés.
  const limitables = etats.filter((e) => e.categorie_canonique === "en_cours");

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
          const active = outilActif(phase, tool.key);
          if (tool.kind === "module") {
            return (
              <SettingRow
                key={tool.key}
                name={tool.label}
                description={tool.description}
                type="toggle"
                value={active}
                state={active ? "ok" : "default"}
                disabled={!canManage}
                onChange={(next) =>
                  queue({ tools: { ...tools, [tool.key]: { ...tableau, actif: Boolean(next) } } })
                }
              />
            );
          }
          return (
            <SettingRow
              key={tool.key}
              name={tool.label}
              description={tool.description}
              type={tool.kind === "toggle" ? "toggle" : "single_choice"}
              value={tool.kind === "toggle" ? active : ((tools[tool.key] as string | undefined) ?? tool.off)}
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

      {tableau.actif && (
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 space-y-3">
          <div>
            <h3 className="text-body-md font-semibold text-on-surface">Limites de travail simultané</h3>
            <p className="mt-0.5 text-body-sm text-on-surface-variant">
              Limiter le nombre d&apos;éléments menés de front dans un état pousse à finir
              avant de commencer. Une limite ne se pose que sur du travail en cours —
              limiter « à faire » briderait l&apos;alimentation, limiter « terminé »
              bloquerait la sortie.
            </p>
          </div>

          {limitables.length === 0 && (
            <p className="text-label-md text-outline">
              Aucun état de catégorie « {CATEGORIE_LABELS.en_cours} » dans ce projet.
            </p>
          )}

          {limitables.map((etat) => (
            <div key={etat.id} className="flex items-center justify-between gap-3">
              <span className="text-body-sm text-on-surface">{etat.libelle}</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                disabled={!canManage}
                value={tableau.limites_wip[String(etat.id)] ?? ""}
                placeholder="Aucune"
                onChange={(e) => {
                  const brut = e.target.value.trim();
                  const limites = { ...tableau.limites_wip };
                  // Vider le champ retire la limite : « aucune » n'est pas zéro.
                  if (!brut) delete limites[String(etat.id)];
                  else limites[String(etat.id)] = Math.max(1, Number(brut));
                  queue({ tools: { ...tools, tableau: { ...tableau, limites_wip: limites } } });
                }}
                className="w-24 h-9 px-2 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors disabled:opacity-60"
              />
            </div>
          ))}

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-hairline">
            <span className="min-w-0">
              <span className="block text-body-sm text-on-surface">Autoriser le dépassement</span>
              <span className="block text-label-md text-outline">
                Avec justification obligatoire, conservée avec son auteur et son horodatage.
              </span>
            </span>
            <Switch
              checked={tableau.autoriser_depassement}
              disabled={!canManage}
              label="Autoriser le dépassement"
              onChange={(next) =>
                queue({ tools: { ...tools, tableau: { ...tableau, autoriser_depassement: next } } })
              }
            />
          </div>
        </div>
      )}

      {!canManage && (
        <p className="text-body-sm text-on-surface-variant">
          Seul le propriétaire du projet peut activer un outil.
        </p>
      )}
    </div>
  );
}
