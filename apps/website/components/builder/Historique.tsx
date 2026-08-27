"use client";

import { useCallback, useEffect, useState } from "react";
import { HistoryOutlined, RestoreOutlined } from "@mui/icons-material";
import { Modal } from "@repo/ui/Modal";

import { api, type Version } from "@/app/lib/api";

/** L'historique des versions publiées d'une page.
 *
 *  Une version est un instantané FIGÉ, créé à chaque publication. Restaurer ne
 *  publie pas : cela ramène l'ancien contenu dans le BROUILLON, et il faudra
 *  publier à nouveau. C'est ce qui permet de regarder à quoi ressemblait une
 *  version, de la reprendre, et de changer d'avis — sans que le public voie
 *  quoi que ce soit entre-temps.
 */
export function Historique({
  pageId,
  peutEditer,
  onRestaure,
  onFermer,
}: {
  pageId: number;
  peutEditer: boolean;
  onRestaure: () => void;
  onFermer: () => void;
}) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const charger = useCallback(async () => {
    try {
      setVersions(await api.versions(pageId));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Historique indisponible.");
      setVersions([]);
    }
  }, [pageId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function restaurer(version: Version) {
    setBusy(version.id);
    setErreur(null);
    try {
      await api.restaurer(pageId, version.id);
      onRestaure();
      onFermer();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Restauration impossible.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal title="Historique des versions" onClose={onFermer} width="max-w-[38rem]">
      <div className="space-y-3">
        <p className="text-body-sm text-on-surface-variant">
          Chaque publication fige une version. Restaurer ramène son contenu dans le brouillon —
          rien n&apos;est publié tant que vous ne publiez pas.
        </p>

        {erreur && (
          <p className="rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {versions === null ? (
          <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        ) : versions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-outline-soft px-3 py-6 text-center text-body-sm text-on-surface-variant">
            Cette page n&apos;a jamais été publiée : il n&apos;y a rien à restaurer.
          </p>
        ) : (
          <ul className="divide-y divide-hairline rounded-xl border border-outline-soft">
            {versions.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-body-sm text-on-surface">
                    Version {v.numero}
                    {v.est_en_ligne && (
                      <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-label-sm text-secondary">
                        en ligne
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-label-md text-outline">
                    {new Date(v.created_at).toLocaleString("fr-FR")}
                    {v.resume ? ` · ${v.resume}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  disabled={!peutEditer || busy !== null}
                  title={peutEditer ? undefined : "Vous n'avez pas le droit de modifier."}
                  onClick={() => void restaurer(v)}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-outline-soft px-2.5 text-label-md text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
                >
                  <RestoreOutlined style={{ fontSize: 16 }} />
                  {busy === v.id ? "…" : "Restaurer"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

export { HistoryOutlined };
