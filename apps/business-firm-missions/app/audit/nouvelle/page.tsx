"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { DashboardShell } from "@/components/DashboardShell";
import { createMissionAudit } from "@/lib/bfm-audit-api";
import { searchTiers } from "@/lib/tiers-api";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1";

interface TiersBrief { id: number; code: string; nom: string }

export default function NouvelleMissionAuditPage() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [tiersId, setTiersId] = useState<number | null>(null);
  const [tiersLabel, setTiersLabel] = useState("");
  const [typeAudit, setTypeAudit] = useState("");
  const [periodeDebut, setPeriodeDebut] = useState("");
  const [periodeFin, setPeriodeFin] = useState("");
  const [objectifs, setObjectifs] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const mission = await createMissionAudit({
        nom: nom.trim(),
        tiers_id: tiersId,
        type_audit: typeAudit.trim() || null,
        periode_debut: periodeDebut || null,
        periode_fin: periodeFin || null,
        objectifs: objectifs.trim() || null,
      });
      router.push(`/audit/${mission.id}`);
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
          <h1 className="font-display text-headline-lg text-on-surface">Nouvelle mission d&rsquo;audit</h1>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-6 space-y-4">
          {error && <p className="text-body-sm text-error">{error}</p>}
          <div>
            <span className={LABEL}>Nom *</span>
            <input className={`${FIELD} w-full`} value={nom} onChange={(e) => setNom(e.target.value)} required autoFocus />
          </div>
          <div>
            <span className={LABEL}>Client</span>
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
          <div>
            <span className={LABEL}>Type d&rsquo;audit</span>
            <input className={`${FIELD} w-full`} value={typeAudit} onChange={(e) => setTypeAudit(e.target.value)} placeholder="Financier, opérationnel, conformité…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className={LABEL}>Période — début</span>
              <input className={`${FIELD} w-full`} type="date" value={periodeDebut} onChange={(e) => setPeriodeDebut(e.target.value)} />
            </div>
            <div>
              <span className={LABEL}>Période — fin</span>
              <input className={`${FIELD} w-full`} type="date" value={periodeFin} onChange={(e) => setPeriodeFin(e.target.value)} />
            </div>
          </div>
          <div>
            <span className={LABEL}>Objectifs</span>
            <textarea className={`${FIELD} w-full`} rows={3} value={objectifs} onChange={(e) => setObjectifs(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => router.push("/audit")} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors">
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
