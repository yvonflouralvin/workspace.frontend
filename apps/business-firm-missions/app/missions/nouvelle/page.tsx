"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { DashboardShell } from "@/components/DashboardShell";
import { createMission } from "@/lib/bfm-missions-api";
import { searchTiers } from "@/lib/tiers-api";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1";

interface TiersBrief { id: number; code: string; nom: string }

export default function NouvelleMissionPage() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [tiersId, setTiersId] = useState<number | null>(null);
  const [tiersLabel, setTiersLabel] = useState("");
  const [typeMission, setTypeMission] = useState("");
  const [departement, setDepartement] = useState("");
  const [budget, setBudget] = useState("");
  const [heuresPrevues, setHeuresPrevues] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const mission = await createMission({
        nom: nom.trim(),
        description: description.trim() || undefined,
        tiers_id: tiersId ?? undefined,
        type_mission: typeMission.trim() || undefined,
        departement: departement.trim() || undefined,
        budget: budget ? Number(budget) : undefined,
        heures_prevues: heuresPrevues ? Number(heuresPrevues) : undefined,
        start_date: dateDebut || undefined,
        due_date: dateFin || undefined,
      });
      router.push(`/missions/${mission.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[700px] mx-auto space-y-5">
        <div>
          <h1 className="font-display text-headline-lg text-on-surface">Nouvelle mission</h1>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            Les phases et les tâches se créent ensuite depuis la fiche de la mission.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-6 space-y-4">
          {error && <p className="text-body-sm text-error">{error}</p>}
          <div>
            <span className={LABEL}>Nom de la mission *</span>
            <input className={`${FIELD} w-full`} value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
          </div>
          <div>
            <span className={LABEL}>Objectif / description</span>
            <textarea className={`${FIELD} w-full`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <span className={LABEL}>Client concerné</span>
            <SearchSelect<TiersBrief>
              fetchOptions={(q) => searchTiers(q)}
              value={tiersId}
              onChange={(value, record) => {
                setTiersId(value as number | null);
                setTiersLabel(record ? `${record.code} — ${record.nom}` : "");
              }}
              getOptionLabel={(t) => `${t.code} — ${t.nom}`}
              initialLabel={tiersLabel}
              placeholder="Rechercher un client…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={LABEL}>Type de mission</span>
              <input className={`${FIELD} w-full`} value={typeMission} onChange={(e) => setTypeMission(e.target.value)} placeholder="Conseil, fiscal, administratif…" />
            </div>
            <div>
              <span className={LABEL}>Département responsable</span>
              <input className={`${FIELD} w-full`} value={departement} onChange={(e) => setDepartement(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={LABEL}>Budget</span>
              <input className={`${FIELD} w-full`} type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
            </div>
            <div>
              <span className={LABEL}>Heures prévues</span>
              <input className={`${FIELD} w-full`} type="number" value={heuresPrevues} onChange={(e) => setHeuresPrevues(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={LABEL}>Date de début</span>
              <input className={`${FIELD} w-full`} type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div>
              <span className={LABEL}>Date de clôture prévue</span>
              <input className={`${FIELD} w-full`} type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => router.push("/missions")} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors">
              {saving ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}
