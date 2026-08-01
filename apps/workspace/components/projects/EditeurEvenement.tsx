"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CloseOutlined } from "@mui/icons-material";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { useSessionStore } from "@repo/auth/store/session.store";
import { listMembers } from "@/app/lib/api";
import type { Member } from "@/app/lib/types";
import { projectsApi, type Evenement, type Project } from "@/app/lib/projects-api";

const CHAMP =
  "h-9 w-full px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";
const LABEL = "block text-label-sm uppercase text-outline mb-1.5";

/** `datetime-local` attend une heure LOCALE sans fuseau ; l'API parle ISO UTC.
 *  Passer l'un pour l'autre décale silencieusement tous les rendez-vous. */
function versChamp(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function depuisChamp(valeur: string): string {
  return new Date(valeur).toISOString();
}

export function EditeurEvenement({
  evenementId,
  jour,
  onClose,
  onEnregistre,
}: {
  /** `null` pour un nouveau rendez-vous. */
  evenementId: number | null;
  jour: Date;
  onClose: () => void;
  onEnregistre: (message: string) => Promise<void> | void;
}) {
  const workspaceId = useSessionStore((s) => s.activeWorkspace?.id);

  const debutParDefaut = useMemo(() => {
    const d = new Date(jour);
    // Prochaine heure ronde : personne ne pose un rendez-vous à 14 h 37.
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d;
  }, [jour]);

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [lieu, setLieu] = useState("");
  const [debut, setDebut] = useState(() => versChamp(debutParDefaut));
  const [fin, setFin] = useState(() => versChamp(new Date(debutParDefaut.getTime() + 3600_000)));
  const [journeeEntiere, setJourneeEntiere] = useState(false);
  const [visibilite, setVisibilite] = useState<"workspace" | "participants">("workspace");
  const [projetId, setProjetId] = useState<number | null>(null);
  const [participants, setParticipants] = useState<number[]>([]);
  const [peutModifier, setPeutModifier] = useState(true);

  const [membres, setMembres] = useState<Member[]>([]);
  const [projets, setProjets] = useState<Project[]>([]);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [aSupprimer, setASupprimer] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    listMembers(Number(workspaceId), { limit: 200 })
      .then((r) => setMembres(r.members))
      .catch(() => {});
    projectsApi.listProjects().then(setProjets).catch(() => {});
  }, [workspaceId]);

  useEffect(() => {
    if (evenementId == null) return;
    projectsApi
      .getEvenement(evenementId)
      .then((e) => {
        setTitre(e.titre);
        setDescription(e.description ?? "");
        setLieu(e.lieu ?? "");
        setDebut(versChamp(new Date(e.debut_le)));
        setFin(versChamp(new Date(e.fin_le)));
        setJourneeEntiere(e.journee_entiere);
        setVisibilite(e.visibilite);
        setProjetId(e.projet_id);
        setParticipants(e.participant_ids);
        setPeutModifier(e.peut_modifier);
      })
      .catch(() => setErreur("Rendez-vous introuvable."));
  }, [evenementId]);

  const nomDe = useCallback(
    (userId: number) => membres.find((m) => m.user.id === userId)?.user.username ?? `#${userId}`,
    [membres]
  );

  async function enregistrer() {
    if (!titre.trim()) return;
    setBusy(true);
    setErreur(null);
    // Une journée entière court de minuit à minuit : sinon « toute la journée »
    // signifierait « de 9 h à 10 h, mais affiché en haut ».
    const corps: Partial<Evenement> & { titre: string; debut_le: string; fin_le: string } = {
      titre: titre.trim(),
      description: description.trim() || null,
      lieu: lieu.trim() || null,
      debut_le: journeeEntiere
        ? new Date(new Date(debut).setHours(0, 0, 0, 0)).toISOString()
        : depuisChamp(debut),
      fin_le: journeeEntiere
        ? new Date(new Date(fin).setHours(23, 59, 0, 0)).toISOString()
        : depuisChamp(fin),
      journee_entiere: journeeEntiere,
      visibilite,
      projet_id: projetId,
      participant_ids: participants,
    };
    try {
      if (evenementId == null) await projectsApi.createEvenement(corps);
      else await projectsApi.updateEvenement(evenementId, corps);
      await onEnregistre(evenementId == null ? "Rendez-vous ajouté." : "Rendez-vous mis à jour.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function supprimer() {
    if (evenementId == null) return;
    setBusy(true);
    try {
      await projectsApi.deleteEvenement(evenementId);
      await onEnregistre("Rendez-vous supprimé.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setASupprimer(false);
      setBusy(false);
    }
  }

  const libres = membres.filter((m) => !participants.includes(m.user.id));

  return (
    <RightDrawer
      title={evenementId == null ? "Nouveau rendez-vous" : "Rendez-vous"}
      onClose={onClose}
      width="md:w-[460px] md:max-w-[92vw]"
      footer={
        <div className="flex w-full items-center gap-2">
          {evenementId != null && peutModifier && (
            <button
              type="button"
              onClick={() => setASupprimer(true)}
              className="h-9 px-3 rounded-lg border border-outline-soft text-body-sm font-semibold text-error hover:bg-error-container/30 transition-colors"
            >
              Supprimer
            </button>
          )}
          <span className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Fermer
          </button>
          {peutModifier && (
            <button
              type="button"
              disabled={busy || !titre.trim()}
              onClick={enregistrer}
              className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container disabled:opacity-50 transition-colors"
            >
              Enregistrer
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {!peutModifier && (
          <p className="rounded-lg bg-surface-container px-3 py-2 text-body-sm text-on-surface-variant">
            Ce rendez-vous a été posé par quelqu&apos;un d&apos;autre : vous le consultez.
          </p>
        )}

        <div>
          <label className={LABEL}>Titre</label>
          <input
            className={CHAMP}
            value={titre}
            disabled={!peutModifier}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Point hebdomadaire, revue de sprint…"
          />
        </div>

        <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={journeeEntiere}
            disabled={!peutModifier}
            onChange={(e) => setJourneeEntiere(e.target.checked)}
          />
          Toute la journée
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Début</label>
            <input
              type={journeeEntiere ? "date" : "datetime-local"}
              className={CHAMP}
              disabled={!peutModifier}
              value={journeeEntiere ? debut.slice(0, 10) : debut}
              onChange={(e) => {
                const v = journeeEntiere ? `${e.target.value}T00:00` : e.target.value;
                setDebut(v);
                // La fin suit le début tant qu'elle le précède : sinon le
                // formulaire part en refus serveur pour une évidence.
                if (new Date(fin) < new Date(v)) {
                  setFin(journeeEntiere ? v : versChamp(new Date(new Date(v).getTime() + 3600_000)));
                }
              }}
            />
          </div>
          <div>
            <label className={LABEL}>Fin</label>
            <input
              type={journeeEntiere ? "date" : "datetime-local"}
              className={CHAMP}
              disabled={!peutModifier}
              value={journeeEntiere ? fin.slice(0, 10) : fin}
              onChange={(e) =>
                setFin(journeeEntiere ? `${e.target.value}T23:59` : e.target.value)
              }
            />
          </div>
        </div>

        <div>
          <label className={LABEL}>Lieu</label>
          <input
            className={CHAMP}
            value={lieu}
            disabled={!peutModifier}
            onChange={(e) => setLieu(e.target.value)}
            placeholder="Salle, visio, adresse…"
          />
        </div>

        <div>
          <label className={LABEL}>Participants</label>
          {participants.length > 0 && (
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {participants.map((userId) => (
                <span
                  key={userId}
                  className="inline-flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-label-md text-on-surface-variant"
                >
                  {nomDe(userId)}
                  {peutModifier && (
                    <button
                      type="button"
                      aria-label={`Retirer ${nomDe(userId)}`}
                      onClick={() => setParticipants((p) => p.filter((u) => u !== userId))}
                      className="text-outline hover:text-error transition-colors"
                    >
                      <CloseOutlined style={{ fontSize: 13 }} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          )}
          <SearchSelect<{ id: number; nom: string }>
            value={null}
            disabled={!peutModifier || !libres.length}
            placeholder="Rechercher un membre…"
            // La recherche filtre la liste DÉJÀ chargée : le workspace tient en
            // mémoire, et un aller-retour par frappe n'apporterait rien.
            fetchOptions={async (q) =>
              libres
                .filter((m) => m.user.username.toLowerCase().includes(q.toLowerCase()))
                .map((m) => ({ id: m.user.id, nom: m.user.username }))
            }
            getOptionLabel={(o) => o.nom}
            onChange={(valeur) => {
              const id = Number(valeur);
              if (id) setParticipants((p) => (p.includes(id) ? p : [...p, id]));
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>Visibilité</label>
            <select
              className={CHAMP}
              value={visibilite}
              disabled={!peutModifier}
              onChange={(e) => setVisibilite(e.target.value as "workspace" | "participants")}
            >
              <option value="workspace">Tout le workspace</option>
              <option value="participants">Participants seulement</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Projet</label>
            <select
              className={CHAMP}
              value={projetId ?? ""}
              disabled={!peutModifier}
              onChange={(e) => setProjetId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Aucun</option>
              {projets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL}>Notes</label>
          <textarea
            rows={4}
            className="w-full resize-none rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
            value={description}
            disabled={!peutModifier}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ordre du jour, lien de visio…"
          />
        </div>

        {erreur && (
          <p className="rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}
      </div>

      {aSupprimer && (
        <ConfirmDialog
          title="Supprimer ce rendez-vous ?"
          message="Il disparaîtra de l'agenda de tous les participants."
          confirmLabel="Supprimer"
          onConfirm={supprimer}
          onCancel={() => setASupprimer(false)}
        />
      )}
    </RightDrawer>
  );
}
