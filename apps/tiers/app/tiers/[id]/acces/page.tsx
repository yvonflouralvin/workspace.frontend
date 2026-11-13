"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSessionStore } from "@repo/auth/store/session.store";
import { PartageFiche } from "@repo/ui/PartageFiche";
import { Toast } from "@repo/ui/Toast";
import { DashboardShell } from "@/components/DashboardShell";
import {
  getTiers,
  getAcces,
  setAcces,
  listMembers,
  listGroups,
  type TiersDetail,
  type Acces,
  type Grant,
  type WorkspaceMember,
  type WorkspaceGroup,
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
  const [groups, setGroups] = useState<WorkspaceGroup[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([getTiers(Number(id)), getAcces(Number(id)), listMembers(workspaceId), listGroups(workspaceId)])
      .then(([t, a, m, gr]) => {
        setTiers(t);
        setAccesState(a);
        setGrants(a.grants);
        setMembers(m);
        setGroups(gr);
      })
      .catch(() => setError("Impossible de charger les droits d'accès."))
      .finally(() => setLoading(false));
  }, [id, workspaceId]);

  const membreOptions = useMemo(
    () => members.map((m) => ({ id: m.user.id, label: displayName(m) })),
    [members],
  );

  const groupeOptions = useMemo(() => groups.map((g) => ({ id: g.id, label: g.name })), [groups]);

  const createur = members.find((m) => m.user.id === acces?.created_by);

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await setAcces(Number(id), grants);
      setAccesState(updated);
      setGrants(updated.grants);
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
          Par défaut, seul le créateur peut consulter cette fiche — avoir accès au module
          Tiers ne donne pas accès à chaque client qui s&rsquo;y trouve. Ajoutez des personnes
          ou des groupes ci-dessous, puis cliquez sur une ligne pour limiter ce qu&rsquo;elle peut
          ouvrir (informations générales, contacts…). Si une personne cumule plusieurs accès
          (le sien, celui d&rsquo;un groupe), c&rsquo;est le plus large des deux qui s&rsquo;applique.
        </p>

        <PartageFiche
          grants={grants}
          onChange={setGrants}
          personnes={membreOptions}
          groupes={groupeOptions}
          sections={acces.available_sections}
          createurId={acces.created_by}
          createurLabel={createur ? displayName(createur) : undefined}
        />

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
