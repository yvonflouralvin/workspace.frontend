"use client";

import { useEffect, useState } from "react";
import { useSessionStore } from "@repo/auth/store/session.store";
import { PartageFiche } from "@repo/ui/PartageFiche";
import { Toast } from "@repo/ui/Toast";
import {
  getPartage,
  setPartage,
  type GrantPartage,
  type Partage,
} from "@/lib/tiers-api";
import { listGroupesWorkspace, listMembresWorkspace } from "@/lib/membres-api";

/** Qui, en dehors du créateur, peut ouvrir cette fiche.
 *
 *  Le besoin vient du cabinet : une fiche créée par un collaborateur était
 *  invisible de ses collègues, et le mécanisme existait côté `tiers` sans
 *  qu'aucun écran d'ici ne le règle — il fallait passer par le module Tiers,
 *  que l'équipe n'a pas dans son lanceur.
 *
 *  L'éditeur est partagé avec ce module (`@repo/ui/PartageFiche`) : seul le
 *  chemin des appels change d'une app à l'autre, pas l'écran.
 */
export function PartagePanel({ tiersId }: { tiersId: number }) {
  const workspaceId = useSessionStore((s) => s.activeWorkspace?.id);
  const [partage, setPartageState] = useState<Partage | null>(null);
  const [grants, setGrants] = useState<GrantPartage[]>([]);
  const [personnes, setPersonnes] = useState<{ id: number; label: string }[]>([]);
  const [groupes, setGroupes] = useState<{ id: number; label: string }[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enregistre, setEnregistre] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      getPartage(tiersId),
      listMembresWorkspace(workspaceId),
      listGroupesWorkspace(workspaceId),
    ])
      .then(([p, membres, grs]) => {
        setPartageState(p);
        setGrants(p.grants);
        setPersonnes(membres.map((m) => ({ id: m.id, label: m.name })));
        setGroupes(grs.map((g) => ({ id: g.id, label: g.name })));
      })
      // Le service refuse en 403 à qui n'a pas `tiers.tiers.manage`, et son
      // corps dit « Forbidden ». L'onglet n'est pas offert dans ce cas, mais
      // un échec réseau tombe ici aussi : on le dit en français.
      .catch(() => setErreur("Impossible de charger le partage de cette fiche."));
  }, [tiersId, workspaceId]);

  async function enregistrer() {
    setEnregistre(true);
    setEchec(null);
    try {
      const maj = await setPartage(tiersId, grants);
      setPartageState(maj);
      setGrants(maj.grants);
      setToast("Partage enregistré.");
    } catch (err) {
      setEchec(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setEnregistre(false);
    }
  }

  if (erreur) return <p className="text-body-md text-error">{erreur}</p>;
  if (!partage) return <p className="text-body-md text-on-surface-variant">Chargement…</p>;

  const createur = personnes.find((p) => p.id === partage.created_by);

  return (
    <div className="space-y-4 max-w-[640px]">
      <p className="text-body-md text-on-surface-variant">
        Par défaut, seul le créateur ouvre cette fiche — avoir accès aux clients ne donne pas
        accès à chacun d&rsquo;eux. Ajoutez des personnes ou des groupes, puis cliquez sur une
        ligne pour limiter ce qu&rsquo;elle peut ouvrir. Si quelqu&rsquo;un cumule plusieurs
        accès (le sien et celui d&rsquo;un groupe), c&rsquo;est le plus large qui s&rsquo;applique.
      </p>

      <PartageFiche
        grants={grants}
        onChange={setGrants}
        personnes={personnes}
        groupes={groupes}
        sections={partage.available_sections}
        createurId={partage.created_by}
        createurLabel={createur?.label}
      />

      <div className="flex items-center justify-end gap-3">
        {echec && <span className="text-body-sm text-error">{echec}</span>}
        <button
          type="button"
          onClick={enregistrer}
          disabled={enregistre}
          className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
        >
          {enregistre ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
