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
  listGroups,
  type TiersDetail,
  type Acces,
  type Grant,
  type WorkspaceMember,
  type WorkspaceGroup,
} from "@/lib/tiers-api";
import {
  ArrowBackOutlined,
  ExpandMoreOutlined,
  LockOutlined,
  CloseOutlined,
  GroupsOutlined,
} from "@mui/icons-material";

function displayName(m: WorkspaceMember): string {
  return m.user.username || m.user.email;
}

/** Une personne et un groupe peuvent partager le même id numérique côté auth
 *  — la clé d'un grant doit donc porter son type, pas juste l'id cible. */
function grantKey(g: Grant): string {
  return g.user_id !== null ? `u:${g.user_id}` : `g:${g.groupe_id}`;
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
  const [expanded, setExpanded] = useState<string | null>(null);
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
    () =>
      members
        .filter((m) => m.user.id !== acces?.created_by)
        .map((m) => ({ id: m.user.id, label: displayName(m) })),
    [members, acces],
  );

  const groupeOptions = useMemo(() => groups.map((g) => ({ id: g.id, label: g.name })), [groups]);

  const createur = members.find((m) => m.user.id === acces?.created_by);

  function grantLabel(g: Grant): string {
    if (g.user_id !== null) {
      const m = members.find((mb) => mb.user.id === g.user_id);
      return m ? displayName(m) : `Utilisateur #${g.user_id}`;
    }
    const gr = groups.find((gp) => gp.id === g.groupe_id);
    return gr ? gr.name : `Groupe #${g.groupe_id}`;
  }

  function onMembersChange(ids: (string | number)[]) {
    const idSet = new Set(ids as number[]);
    const kept = grants.filter((g) => g.groupe_id !== null || idSet.has(g.user_id as number));
    const added = (ids as number[])
      .filter((uid) => !grants.some((g) => g.user_id === uid))
      .map((uid) => ({ user_id: uid, groupe_id: null, sections: [] as string[] }));
    setGrants([...kept, ...added]);
  }

  function onGroupsChange(ids: (string | number)[]) {
    const idSet = new Set(ids as number[]);
    const kept = grants.filter((g) => g.user_id !== null || idSet.has(g.groupe_id as number));
    const added = (ids as number[])
      .filter((gid) => !grants.some((g) => g.groupe_id === gid))
      .map((gid) => ({ user_id: null, groupe_id: gid, sections: [] as string[] }));
    setGrants([...kept, ...added]);
  }

  function removeGrant(g: Grant) {
    const key = grantKey(g);
    setGrants((gs) => gs.filter((x) => grantKey(x) !== key));
    if (expanded === key) setExpanded(null);
  }

  function toggleSection(g: Grant, sectionKey: string) {
    const key = grantKey(g);
    const available = acces?.available_sections.map((s) => s.key) ?? [];
    setGrants((gs) =>
      gs.map((x) => {
        if (grantKey(x) !== key) return x;
        const current = x.sections.length === 0 ? available : x.sections;
        const next = current.includes(sectionKey)
          ? current.filter((k) => k !== sectionKey)
          : [...current, sectionKey];
        return { ...x, sections: next };
      }),
    );
  }

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

  const availableSections = acces.available_sections;

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

        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-5 space-y-5">
          <div>
            <span className="block text-label-sm uppercase text-outline mb-1.5">Créé par</span>
            <p className="text-body-md text-on-surface">
              {createur ? displayName(createur) : "Inconnu"}
              <span className="ml-2 text-label-sm text-outline">Accès complet</span>
            </p>
          </div>

          <div>
            <span className="block text-label-sm uppercase text-outline mb-1.5">
              Ajouter une personne
            </span>
            <MultiSelect
              options={membreOptions}
              selectedIds={grants.filter((g) => g.user_id !== null).map((g) => g.user_id as number)}
              onChange={onMembersChange}
              placeholder="Rechercher une personne du workspace…"
              emptyLabel="Aucun membre trouvé."
            />
          </div>

          <div>
            <span className="block text-label-sm uppercase text-outline mb-1.5">
              Ajouter un groupe
            </span>
            <MultiSelect
              options={groupeOptions}
              selectedIds={grants.filter((g) => g.groupe_id !== null).map((g) => g.groupe_id as number)}
              onChange={onGroupsChange}
              placeholder="Rechercher un groupe du workspace…"
              emptyLabel="Aucun groupe trouvé."
            />
          </div>

          {grants.length > 0 && (
            <div>
              <span className="block text-label-sm uppercase text-outline mb-1.5">
                Autorisés
              </span>
              <ul className="rounded-xl border border-outline-soft divide-y divide-hairline overflow-hidden">
                {grants.map((g) => {
                  const key = grantKey(g);
                  const isFull = g.sections.length === 0;
                  const isOpen = expanded === key;
                  return (
                    <li key={key} className="bg-surface-container-lowest">
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : key)}
                          className="flex flex-1 items-center gap-2 min-w-0 text-left"
                        >
                          <ExpandMoreOutlined
                            style={{ fontSize: 18 }}
                            className={`shrink-0 text-outline transition-transform ${isOpen ? "rotate-180" : ""}`}
                          />
                          {g.groupe_id !== null && (
                            <GroupsOutlined style={{ fontSize: 15 }} className="shrink-0 text-outline" />
                          )}
                          <span className="text-body-md text-on-surface truncate">{grantLabel(g)}</span>
                          <span className="text-label-md text-outline shrink-0">
                            {isFull
                              ? "Accès complet"
                              : `${g.sections.length}/${availableSections.length} section${availableSections.length > 1 ? "s" : ""}`}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGrant(g)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low transition-colors"
                          aria-label="Retirer"
                        >
                          <CloseOutlined style={{ fontSize: 15 }} />
                        </button>
                      </div>
                      {isOpen && (
                        <div className="px-3 pb-3 pl-9 space-y-1.5">
                          {availableSections.map((s) => {
                            const checked = isFull || g.sections.includes(s.key);
                            return (
                              <label
                                key={s.key}
                                className="flex items-center gap-2 text-body-sm text-on-surface cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleSection(g, s.key)}
                                  className="rounded border-outline-soft accent-primary"
                                />
                                {s.label}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
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
