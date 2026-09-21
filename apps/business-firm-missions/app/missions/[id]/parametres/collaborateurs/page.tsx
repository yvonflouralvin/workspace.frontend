"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AddOutlined, ArrowBackOutlined, EditOutlined, PersonRemoveOutlined } from "@mui/icons-material";
import { Avatar } from "@repo/ui/Avatar";
import { Checkbox } from "@repo/ui/Checkbox";
import { FormDrawer } from "@repo/ui/FormDrawer";
import { useConfirmSuppression } from "@repo/ui/hooks/useConfirmSuppression";
import { Toast } from "@repo/ui/Toast";
import {
  addEquipeMission,
  listDroits,
  listMembresMission,
  removeEquipeMission,
  updateEquipeMission,
  type Droit,
  type MembreMission,
} from "@/lib/bfm-missions-api";
import { PaletteMembres } from "@/components/SelecteurMembre";
import type { Membre } from "@/lib/membres-api";
import { useMission } from "../../mission-context";

/** Les droits d'une personne : ce qu'elle peut faire sur la mission, en plus de voir et de travailler sur
 *  les tâches qui lui sont assignées (démarrer, terminer, commenter) — cela, tout membre le peut. */
function DroitsDrawer({
  nom,
  initial,
  catalogue,
  submitLabel,
  onSubmit,
  onClose,
}: {
  nom: string;
  initial: Droit[];
  catalogue: { cle: Droit; libelle: string }[];
  submitLabel: string;
  onSubmit: (droits: Droit[]) => Promise<void>;
  onClose: () => void;
}) {
  const [droits, setDroits] = useState<Set<Droit>>(new Set(initial));
  const basculer = (d: Droit, v: boolean) =>
    setDroits((cur) => {
      const suite = new Set(cur);
      if (v) suite.add(d);
      else suite.delete(d);
      return suite;
    });

  return (
    <FormDrawer
      title={`Droits de ${nom}`}
      submitLabel={submitLabel}
      onClose={onClose}
      onSubmit={() => onSubmit(catalogue.map((c) => c.cle).filter((c) => droits.has(c)))}
    >
      <p className="text-body-sm text-on-surface-variant">
        Ce que {nom} peut faire sur cette mission. Sans aucun droit, la personne voit la mission et travaille sur les
        tâches qui lui sont assignées : elle les démarre, les termine et y laisse des commentaires.
      </p>
      <div className="rounded-xl border border-outline-soft divide-y divide-hairline px-3">
        {catalogue.map((c) => (
          <Checkbox key={c.cle} checked={droits.has(c.cle)} onChange={(v) => basculer(c.cle, v)} label={c.libelle} />
        ))}
      </div>
      {catalogue.length === 0 && <p className="text-body-sm text-error">La liste des droits n&apos;a pas pu être chargée.</p>}
    </FormDrawer>
  );
}

export default function CollaborateursPage() {
  const { missionId, mission, membres } = useMission();
  const [rows, setRows] = useState<MembreMission[] | null>(null);
  const [catalogue, setCatalogue] = useState<{ cle: Droit; libelle: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [palette, setPalette] = useState(false);
  // Le collaborateur en cours d'ajout (choisi dans la palette, ses droits restent à fixer) ou de modification.
  const [droits, setDroits] = useState<{ membre: Membre; initial: Droit[]; existant: boolean } | null>(null);
  const { confirmer, dialogue } = useConfirmSuppression();
  const complet = mission.mes_droits?.complet ?? false;

  const reload = useCallback(
    () => listMembresMission(missionId).then(setRows).catch(() => setRows([])),
    [missionId],
  );
  useEffect(() => {
    void reload();
  }, [reload]);
  useEffect(() => {
    listDroits().then(setCatalogue).catch(() => {});
  }, []);

  const nomDe = (r: MembreMission) =>
    r.user_name ?? membres.find((m) => m.id === r.user_id)?.name ?? `Utilisateur #${r.user_id}`;
  const libelleDe = (d: Droit) => catalogue.find((c) => c.cle === d)?.libelle ?? d;

  async function run(fn: () => Promise<unknown>, message: string) {
    setError(null);
    try {
      await fn();
      await reload();
      setToast(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
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
            Les personnes qui travaillent sur cette mission, et ce que chacune peut y faire.
            {!complet && " Seul le responsable de la mission compose l'équipe."}
          </p>
        </div>
        {complet && (
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="inline-flex items-center justify-center gap-1.5 h-[38px] px-4 flex-none rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container transition-colors whitespace-nowrap"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Ajouter
          </button>
        )}
      </div>

      {error && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
        {rows === null && <p className="px-4 py-3 text-body-sm text-on-surface-variant">Chargement…</p>}
        {rows?.length === 0 && (
          <p className="px-4 py-3 text-body-sm text-on-surface-variant">Aucun collaborateur pour l&apos;instant.</p>
        )}
        {rows?.map((row) => {
          const nom = nomDe(row);
          return (
            <div key={row.user_id} className="flex items-start gap-3 px-4 py-3 border-b border-hairline last:border-b-0">
              <span className="mt-0.5"><Avatar name={nom} size={30} /></span>
              <div className="flex-1 min-w-0">
                <p className="flex items-center gap-2 text-body-md font-medium text-on-surface">
                  <span className="truncate">{nom}</span>
                  {mission.responsable_user_id === row.user_id && (
                    <span className="flex-none rounded-full bg-surface-container px-2 py-0.5 text-label-sm font-semibold text-on-surface-variant">
                      Responsable
                    </span>
                  )}
                  {mission.created_by === row.user_id && mission.responsable_user_id !== row.user_id && (
                    <span className="flex-none rounded-full bg-surface-container px-2 py-0.5 text-label-sm font-semibold text-on-surface-variant">
                      Créateur
                    </span>
                  )}
                </p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {row.complet ? (
                    <span className="text-label-md text-outline">Tous les droits</span>
                  ) : row.droits.length === 0 ? (
                    <span className="text-label-md text-outline">Lecture, et ses propres tâches</span>
                  ) : (
                    row.droits.map((d) => (
                      <span key={d} className="rounded-full bg-primary/10 px-2 py-0.5 text-label-sm font-medium text-primary">
                        {libelleDe(d)}
                      </span>
                    ))
                  )}
                </p>
              </div>
              {complet && !row.complet && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setDroits({ membre: { id: row.user_id, name: nom }, initial: row.droits, existant: true })
                    }
                    aria-label={`Modifier les droits de ${nom}`}
                    title="Modifier les droits"
                    className="w-8 h-8 flex-none flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                  >
                    <EditOutlined style={{ fontSize: 17 }} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      confirmer({
                        title: `Retirer ${nom} ?`,
                        message: "Cette personne ne sera plus affectée à la mission et ne la verra plus. Ses tâches restent en place.",
                        confirmLabel: "Retirer",
                        action: () => run(() => removeEquipeMission(missionId, row.user_id), "Collaborateur retiré."),
                      })
                    }
                    aria-label={`Retirer ${nom}`}
                    title="Retirer de la mission"
                    className="w-8 h-8 flex-none flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
                  >
                    <PersonRemoveOutlined style={{ fontSize: 17 }} />
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {palette && (
        <PaletteMembres
          titre="Ajouter un collaborateur"
          membres={membres}
          exclus={(rows ?? []).map((r) => r.user_id)}
          onChoisir={(m) => {
            setPalette(false);
            setDroits({ membre: m, initial: [], existant: false });
          }}
          onFermer={() => setPalette(false)}
        />
      )}

      {droits && (
        <DroitsDrawer
          key={droits.membre.id}
          nom={droits.membre.name}
          initial={droits.initial}
          catalogue={catalogue}
          submitLabel={droits.existant ? "Enregistrer" : "Ajouter à la mission"}
          onClose={() => setDroits(null)}
          onSubmit={async (choisis) => {
            const { membre, existant } = droits;
            if (existant) await updateEquipeMission(missionId, membre.id, choisis);
            else await addEquipeMission(missionId, membre.id, choisis);
            setDroits(null);
            await reload();
            setToast(existant ? "Droits mis à jour." : `${membre.name} ajouté à la mission.`);
          }}
        />
      )}

      {dialogue}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
