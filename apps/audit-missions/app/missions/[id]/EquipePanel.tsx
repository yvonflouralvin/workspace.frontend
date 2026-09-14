"use client";

import { useEffect, useMemo, useState } from "react";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { listEquipe, addEquipe, removeEquipe, type EquipeMembre, type WorkspaceMember } from "@/lib/audit-api";
import { PersonOutlined } from "@mui/icons-material";

export function EquipePanel({
  missionId,
  canManage,
  members,
  onToast,
}: {
  missionId: number;
  canManage: boolean;
  members: WorkspaceMember[];
  onToast: (message: string) => void;
}) {
  const [equipe, setEquipe] = useState<EquipeMembre[] | null>(null);

  function reload() {
    listEquipe(missionId).then(setEquipe);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

  const options = useMemo(
    () => members.map((m) => ({ id: m.user.id, label: m.user.username || m.user.email })),
    [members],
  );

  async function onChange(ids: (string | number)[]) {
    if (!equipe) return;
    const current = new Set(equipe.map((e) => e.user_id));
    const next = new Set(ids as number[]);

    for (const uid of next) {
      if (!current.has(uid)) {
        try {
          await addEquipe(missionId, uid);
        } catch {
          onToast("Erreur lors de l'ajout.");
        }
      }
    }
    for (const uid of current) {
      if (!next.has(uid)) {
        try {
          await removeEquipe(missionId, uid);
        } catch {
          onToast("Erreur lors du retrait.");
        }
      }
    }
    reload();
  }

  if (equipe === null) {
    return <p className="text-body-md text-on-surface-variant">Chargement…</p>;
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div>
          <span className="block text-label-sm uppercase text-outline mb-1.5">Membres de l&rsquo;équipe</span>
          <MultiSelect
            options={options}
            selectedIds={equipe.map((e) => e.user_id)}
            onChange={onChange}
            placeholder="Rechercher une personne du workspace…"
            emptyLabel="Aucun membre trouvé."
          />
        </div>
      )}

      {!canManage && equipe.length === 0 && (
        <p className="text-body-md text-on-surface-variant">Aucun membre affecté à cette mission.</p>
      )}

      {!canManage && equipe.length > 0 && (
        <ul className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline">
          {equipe.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-3">
              <PersonOutlined style={{ fontSize: 18 }} className="text-outline" />
              <span className="text-body-md text-on-surface">{e.user_name ?? `#${e.user_id}`}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
