"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AddOutlined, ArrowBackOutlined, PersonRemoveOutlined } from "@mui/icons-material";
import { Avatar } from "@repo/ui/Avatar";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import {
  addEquipeMission,
  listEquipeMission,
  removeEquipeMission,
  type EquipeMembre,
} from "@/lib/bfm-missions-api";
import { PaletteMembres } from "@/components/SelecteurMembre";
import { useMission } from "../../mission-context";

export default function CollaborateursPage() {
  const { missionId, mission, membres } = useMission();
  const [rows, setRows] = useState<EquipeMembre[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [palette, setPalette] = useState(false);
  const [aRetirer, setARetirer] = useState<EquipeMembre | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(
    () => listEquipeMission(missionId).then(setRows).catch(() => setRows([])),
    [missionId],
  );
  useEffect(() => {
    void reload();
  }, [reload]);

  const nomDe = (r: EquipeMembre) =>
    r.user_name ?? membres.find((m) => m.id === r.user_id)?.name ?? `Utilisateur #${r.user_id}`;

  async function run(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
      setToast(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[820px] space-y-5">
      <Link
        href={`/missions/${missionId}/parametres`}
        className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
      >
        <ArrowBackOutlined style={{ fontSize: 15 }} /> Paramètres
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-headline-sm text-on-surface">Collaborateurs</h2>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            Les personnes affectées à cette mission. Elles sont choisies parmi les membres du workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPalette(true)}
          className="inline-flex items-center justify-center gap-1.5 h-[38px] px-4 flex-none rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors whitespace-nowrap"
        >
          <AddOutlined style={{ fontSize: 16 }} />
          Ajouter
        </button>
      </div>

      {error && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
        {rows === null && <p className="px-4 py-3 text-body-sm text-on-surface-variant">Chargement…</p>}
        {rows?.length === 0 && (
          <p className="px-4 py-3 text-body-sm text-on-surface-variant">
            Aucun collaborateur pour l&apos;instant. Utilisez « Ajouter » pour affecter quelqu&apos;un.
          </p>
        )}
        {rows?.map((row) => (
          <div key={row.id} className="flex items-center gap-3 px-4 py-3 border-b border-hairline last:border-b-0">
            <Avatar name={nomDe(row)} size={30} />
            <p className="flex-1 min-w-0 text-body-md font-medium text-on-surface truncate">{nomDe(row)}</p>
            {mission.responsable_user_id === row.user_id && (
              <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-md font-semibold text-on-surface-variant">
                Responsable
              </span>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => setARetirer(row)}
              aria-label={`Retirer ${nomDe(row)}`}
              title="Retirer de la mission"
              className="w-8 h-8 flex-none flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error disabled:opacity-40 transition-colors"
            >
              <PersonRemoveOutlined style={{ fontSize: 17 }} />
            </button>
          </div>
        ))}
      </div>

      {palette && (
        <PaletteMembres
          titre="Ajouter un collaborateur"
          membres={membres}
          exclus={(rows ?? []).map((r) => r.user_id)}
          onChoisir={(m) => {
            setPalette(false);
            void run(() => addEquipeMission(missionId, m.id), `${m.name} ajouté à la mission.`);
          }}
          onFermer={() => setPalette(false)}
        />
      )}

      {aRetirer && (
        <ConfirmDialog
          title={`Retirer ${nomDe(aRetirer)} ?`}
          message="Cette personne ne sera plus affectée à la mission. Ses tâches restent en place."
          confirmLabel="Retirer"
          busy={busy}
          onConfirm={async () => {
            const cible = aRetirer;
            setARetirer(null);
            await run(() => removeEquipeMission(missionId, cible.user_id), "Collaborateur retiré.");
          }}
          onCancel={() => setARetirer(null)}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
