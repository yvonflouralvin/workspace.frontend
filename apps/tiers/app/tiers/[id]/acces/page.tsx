"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSessionStore } from "@repo/auth/store/session.store";
import { MultiSelect } from "@repo/ui/MultiSelect";
import { Toast } from "@repo/ui/Toast";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getTiers,
  getAcces,
  setAcces,
  listMembers,
  type TiersDetail,
  type Acces,
  type WorkspaceMember,
} from "@/lib/tiers-api";
import { ArrowBackOutlined, LockOutlined } from "@mui/icons-material";

function displayName(m: WorkspaceMember): string {
  return m.user.username || m.user.email;
}

export default function AccesTiersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const workspaceId = useSessionStore((s) => s.activeWorkspace?.id);

  const [tiers, setTiers] = useState<TiersDetail | null>(null);
  const [acces, setAccesState] = useState<Acces | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([getTiers(Number(id)), getAcces(Number(id)), listMembers(workspaceId)])
      .then(([t, a, m]) => {
        setTiers(t);
        setAccesState(a);
        setSelected(a.visible_user_ids);
        setMembers(m);
      })
      .catch(() => setError("Impossible de charger les droits d'accès."))
      .finally(() => setLoading(false));
  }, [id, workspaceId]);

  const membreOptions = useMemo(
    () =>
      members
        .filter((m) => m.user.id !== acces?.created_by)
        .map((m) => ({ id: m.user.id, label: displayName(m) })),
    [members, acces],
  );

  const createur = members.find((m) => m.user.id === acces?.created_by);

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await setAcces(Number(id), selected);
      setAccesState(updated);
      setSelected(updated.visible_user_ids);
      setToast("Droits d'accès enregistrés.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 text-body-md text-on-surface-variant">Chargement…</div>
      </DashboardShell>
    );
  }
  if (error || !tiers || !acces) {
    return (
      <DashboardShell>
        <div className="p-4 md:p-8 text-body-md text-error">{error ?? "Introuvable."}</div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[640px] mx-auto">
        <Link
          href={`/tiers/${id}`}
          className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors mb-4"
        >
          <ArrowBackOutlined style={{ fontSize: 15 }} />
          {tiers.nom}
        </Link>

        <div className="flex items-center gap-2.5 mb-1.5">
          <LockOutlined style={{ fontSize: 22 }} className="text-outline" />
          <h1 className="font-display text-headline-md text-on-surface">Droits d&rsquo;accès</h1>
        </div>
        <p className="text-body-md text-on-surface-variant mb-6">
          Par défaut, toute personne autorisée à voir les tiers peut consulter cette fiche.
          Ajoutez des personnes ci-dessous pour <strong>restreindre</strong> l&rsquo;accès au
          créateur et à cette liste uniquement.
        </p>

        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5 space-y-5">
          <div>
            <span className="block text-label-sm uppercase text-outline mb-1.5">
              Créé par
            </span>
            <p className="text-body-md text-on-surface">
              {createur ? displayName(createur) : "Inconnu"}
              <span className="ml-2 text-label-sm text-outline">Toujours autorisé</span>
            </p>
          </div>

          <div>
            <span className="block text-label-sm uppercase text-outline mb-1.5">
              Personnes autorisées en plus
            </span>
            <MultiSelect
              options={membreOptions}
              selectedIds={selected}
              onChange={(ids) => setSelected(ids as number[])}
              placeholder="Rechercher une personne du workspace…"
              emptyLabel="Aucun membre trouvé."
            />
            <p className="text-label-md text-outline mt-1.5">
              {selected.length === 0
                ? "Aucune restriction : tout le monde peut voir cette fiche."
                : `${selected.length} personne${selected.length > 1 ? "s" : ""} autorisée${selected.length > 1 ? "s" : ""} en plus du créateur.`}
            </p>
          </div>
        </div>

        {saveError && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2 mt-4">
            {saveError}
          </p>
        )}

        <div className="flex items-center justify-end gap-2.5 mt-5">
          <button
            type="button"
            onClick={() => router.push(`/tiers/${id}`)}
            className="h-11 md:h-[38px] px-4 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="h-11 md:h-[38px] px-5 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
