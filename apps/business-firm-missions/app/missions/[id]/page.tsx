"use client";

import { useEffect, useState } from "react";
import {
  updateMission,
  STATUT_MISSION_LABELS,
  PRIORITE_LABELS,
  peut,
} from "@/lib/bfm-missions-api";
import { ChampMembre } from "@/components/SelecteurMembre";
import { useMission } from "./mission-context";
import { DateValue, LABEL, MetaRow, NumberValue, TextValue } from "./ui";

export default function ApercuMissionPage() {
  const { mission, setMission, membres } = useMission();
  // Les informations générales ne se modifient qu'avec le droit qui va avec ; le responsable, lui, ne se
  // change que par le responsable.
  const modifiable = peut(mission, "mission.modifier");
  const complet = mission.mes_droits?.complet ?? false;
  const [description, setDescription] = useState(mission.description ?? "");
  const [etatDesc, setEtatDesc] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setDescription(mission.description ?? ""), [mission.id, mission.description]);

  async function patch(fields: Record<string, unknown>) {
    setError(null);
    try {
      setMission(await updateMission(mission.id, fields));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    }
  }

  async function enregistrerDescription() {
    const nv = description.trim() || null;
    if (nv === (mission.description ?? null)) return;
    setEtatDesc("saving");
    await patch({ description: nv });
    setEtatDesc("saved");
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
      <div>
        {error && <p className="mb-3 text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex items-center justify-between gap-4 mb-2">
          <p className={LABEL}>Objectif / description</p>
          {etatDesc !== "idle" && (
            <span className="text-label-md text-on-surface-variant">
              {etatDesc === "saving" ? "Enregistrement…" : "Enregistré"}
            </span>
          )}
        </div>
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
          <textarea
            className="w-full min-h-[16rem] p-4 bg-transparent text-body-md text-on-surface outline-none resize-y"
            placeholder="Décrivez l'objectif de la mission…"
            value={description}
            readOnly={!modifiable}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={enregistrerDescription}
          />
        </div>
      </div>

      <aside className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
        <MetaRow label="Statut">
          <select
            value={mission.statut}
            disabled={!modifiable}
            onChange={(e) => patch({ statut: e.target.value })}
            className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm font-semibold text-on-surface outline-none focus:border-primary disabled:opacity-60"
          >
            {Object.entries(STATUT_MISSION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </MetaRow>
        <MetaRow label="Type de mission">
          <TextValue value={mission.type_mission} onSave={(v) => patch({ type_mission: v })} placeholder="Conseil, fiscal…" disabled={!modifiable} />
        </MetaRow>
        <MetaRow label="Département">
          <TextValue value={mission.departement} onSave={(v) => patch({ departement: v })} disabled={!modifiable} />
        </MetaRow>
        <MetaRow label="Priorité">
          <select
            value={mission.priorite}
            disabled={!modifiable}
            onChange={(e) => patch({ priorite: e.target.value })}
            className="h-8 rounded-lg border border-outline-soft bg-surface-container-lowest px-2 text-body-sm text-on-surface outline-none focus:border-primary disabled:opacity-60"
          >
            {Object.entries(PRIORITE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </MetaRow>
        <MetaRow label="Responsable">
          <ChampMembre
            valeur={mission.responsable_user_id}
            membres={membres}
            placeholder="Choisir…"
            disabled={!complet}
            onChange={(id) => patch({ responsable_user_id: id })}
          />
        </MetaRow>
        <MetaRow label="Début">
          <DateValue value={mission.start_date} onSave={(v) => patch({ start_date: v })} disabled={!modifiable} />
        </MetaRow>
        <MetaRow label="Échéance">
          <DateValue value={mission.due_date} onSave={(v) => patch({ due_date: v })} disabled={!modifiable} />
        </MetaRow>
        <MetaRow label="Budget">
          <NumberValue value={mission.budget} onSave={(v) => patch({ budget: v })} disabled={!modifiable} />
        </MetaRow>
        <MetaRow label="Heures prévues">
          <NumberValue value={mission.heures_prevues} onSave={(v) => patch({ heures_prevues: v })} step="0.5" disabled={!modifiable} />
        </MetaRow>
        <MetaRow label="Code">
          <span className="font-mono text-body-sm text-on-surface" title="Non modifiable">{mission.code}</span>
        </MetaRow>
      </aside>
    </div>
  );
}
