"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AddOutlined,
  DeleteOutlineOutlined,
  EditOutlined,
  ErrorOutlineOutlined,
  HistoryOutlined,
  PlayArrowOutlined,
  SmartToyOutlined,
} from "@mui/icons-material";
import { FORM_CONTROL, FormField } from "@repo/ui/FormField";
import { FormDrawer } from "@repo/ui/FormDrawer";
import { Switch } from "@repo/ui/Switch";
import { useConfirmSuppression } from "@repo/ui/hooks/useConfirmSuppression";
import {
  creerCollaborateur,
  creerTache,
  lancerMission,
  listerCollaborateurs,
  listerMissions,
  listerRoles,
  lireMission,
  modifierCollaborateur,
  modifierTache,
  supprimerTache,
} from "../api/collaborateurs";
import { PROFILS, TACHES_SUGGEREES } from "../lib/metiers";
import { Markdown } from "../lib/markdown";
import type { Collaborateur, Mission, RoleCollaborateur, TacheRecurrente } from "../types";

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** « Contrôleur interne » → « controleur-interne ». Les accents d'abord : le
 *  service n'accepte que des lettres sans accent, et « contrôleur » amputé de
 *  son ô donnerait « contr-leur ». */
export function enCle(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Tant qu'une mission tourne, on redemande. Elle dure des dizaines de
 *  secondes : un écran qui ne bouge pas pendant ce temps donne l'impression
 *  que le bouton n'a rien fait. */
const RYTHME_SUIVI_MS = 3000;

export function quand(t: Pick<TacheRecurrente, "cadence" | "heure" | "jour">): string {
  if (t.cadence === "MANUELLE") return "À la demande";
  const heure = `${String(t.heure).padStart(2, "0")} h`;
  if (t.cadence === "HEBDOMADAIRE") return `Chaque ${JOURS[t.jour ?? 0]} à ${heure}`;
  return `Tous les jours à ${heure}`;
}

/** Ce qu'on affiche sous le nom d'un collaborateur. Les tâches ACTIVES
 *  seulement : une tâche en pause ne dit rien de ce qu'il fera. */
export function resumeDesTaches(taches: TacheRecurrente[]): string {
  const actives = taches.filter((t) => t.actif && t.cadence !== "MANUELLE");
  if (taches.length === 0) return "aucune tâche — il ne se réveillera jamais";
  if (actives.length === 0) return "aucune tâche active";
  if (actives.length === 1) return quand(actives[0]!).toLowerCase();
  return `${actives.length} tâches récurrentes`;
}

function dateCourte(valeur: string | null): string {
  if (!valeur) return "jamais";
  const d = new Date(valeur.endsWith("Z") ? valeur : `${valeur}Z`);
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

const TEINTE_STATUT: Record<Mission["statut"], string> = {
  EN_ATTENTE: "bg-surface-container text-on-surface-variant",
  EN_COURS: "bg-tertiary/10 text-tertiary",
  REUSSIE: "bg-secondary/10 text-secondary",
  ECHOUEE: "bg-error-container text-error",
};

const LIBELLE_STATUT: Record<Mission["statut"], string> = {
  EN_ATTENTE: "En attente",
  EN_COURS: "En cours…",
  REUSSIE: "Terminée",
  ECHOUEE: "Échec",
};

const ORIGINE: Record<Mission["declencheur"], string> = {
  PLANIFIE: "",
  MANUEL: " · lancé à la main",
  INBOX: " · demandé depuis la boîte",
};

export function CollaborateursAssistant({
  peutGerer,
  base,
}: {
  peutGerer: boolean;
  base?: string;
}) {
  const [collaborateurs, setCollaborateurs] = useState<Collaborateur[] | null>(null);
  const [roles, setRoles] = useState<RoleCollaborateur[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [ouvert, setOuvert] = useState<number | null>(null);

  const recharger = useCallback(async () => {
    try {
      setCollaborateurs(await listerCollaborateurs(base));
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Chargement impossible");
    }
  }, [base]);

  useEffect(() => {
    void recharger();
    listerRoles(base)
      .then(setRoles)
      .catch(() => setRoles([]));
  }, [recharger, base]);

  const libelleRole = (cle: string) => roles.find((r) => r.cle === cle)?.libelle ?? cle;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <p className="text-body-md text-on-surface-variant max-w-[62ch]">
          Un collaborateur a un <strong className="text-on-surface">profil</strong> — qui
          il est, comment il travaille — et autant de{" "}
          <strong className="text-on-surface">tâches récurrentes</strong> qu&apos;on veut :
          un relevé le matin, une clôture le soir. On peut aussi lui confier un travail
          ponctuel depuis la boîte de réception. Il a un compte, des groupes et des droits
          comme n&apos;importe quel membre — et il ne fait que lire.
        </p>
        {peutGerer && (
          <button
            type="button"
            onClick={() => setFormulaireOuvert(true)}
            className="flex-none inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-label-md text-on-primary shadow-button hover:bg-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 18 }} />
            Nouveau collaborateur
          </button>
        )}
      </div>

      {erreur && (
        <p className="mb-4 flex items-center gap-1.5 text-body-sm text-error">
          <ErrorOutlineOutlined style={{ fontSize: 16 }} />
          {erreur}
        </p>
      )}

      {collaborateurs === null ? (
        <p className="text-body-md text-on-surface-variant">Chargement…</p>
      ) : collaborateurs.length === 0 ? (
        <Vide peutGerer={peutGerer} onCreer={() => setFormulaireOuvert(true)} />
      ) : (
        <ul className="flex flex-col gap-3">
          {collaborateurs.map((c) => (
            <CarteCollaborateur
              key={c.id}
              collaborateur={c}
              role={libelleRole(c.role)}
              peutGerer={peutGerer}
              ouvert={ouvert === c.id}
              onBasculer={() => setOuvert(ouvert === c.id ? null : c.id)}
              onChange={recharger}
              base={base}
            />
          ))}
        </ul>
      )}

      {formulaireOuvert && (
        <FormulaireCollaborateur
          roles={roles}
          base={base}
          onClose={() => setFormulaireOuvert(false)}
          onCree={async () => {
            setFormulaireOuvert(false);
            await recharger();
          }}
        />
      )}
    </div>
  );
}

function Vide({ peutGerer, onCreer }: { peutGerer: boolean; onCreer: () => void }) {
  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-low p-6 text-center">
      <SmartToyOutlined style={{ fontSize: 32 }} className="text-outline" />
      <p className="mt-2 text-body-md text-on-surface">Aucun collaborateur pour le moment.</p>
      <p className="mt-1 text-body-sm text-on-surface-variant max-w-[52ch] mx-auto">
        Le plus simple pour commencer est un <strong>contrôleur interne</strong> : il ne
        touche à rien, il relève chaque semaine les incohérences — tiers sans contact,
        factures sans commande, projets sans responsable.
      </p>
      {peutGerer && (
        <button
          type="button"
          onClick={onCreer}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-label-md text-on-surface hover:bg-surface-container transition-colors"
        >
          <AddOutlined style={{ fontSize: 18 }} />
          Créer le premier
        </button>
      )}
    </div>
  );
}

function CarteCollaborateur({
  collaborateur,
  role,
  peutGerer,
  ouvert,
  onBasculer,
  onChange,
  base,
}: {
  collaborateur: Collaborateur;
  role: string;
  peutGerer: boolean;
  ouvert: boolean;
  onBasculer: () => void;
  onChange: () => Promise<void>;
  base?: string;
}) {
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [enVol, setEnVol] = useState<number | null>(null);
  const [souci, setSouci] = useState<string | null>(null);
  const [tacheEditee, setTacheEditee] = useState<TacheRecurrente | "nouvelle" | null>(null);
  const [profilEdite, setProfilEdite] = useState(false);
  const [ponctuelle, setPonctuelle] = useState(false);
  const { confirmer, dialogue } = useConfirmSuppression();

  const charger = useCallback(async () => {
    setMissions(await listerMissions(collaborateur.id, base));
  }, [collaborateur.id, base]);

  useEffect(() => {
    if (ouvert && missions === null) void charger().catch(() => setMissions([]));
  }, [ouvert, missions, charger]);

  // Une mission dure des dizaines de secondes. Sans ce suivi, le bouton
  // paraîtrait sans effet jusqu'au prochain rechargement de la page.
  useEffect(() => {
    if (enVol === null) return;
    const minuteur = setInterval(async () => {
      try {
        const mission = await lireMission(enVol, base);
        if (mission.statut === "REUSSIE" || mission.statut === "ECHOUEE") {
          setEnVol(null);
          await charger();
          await onChange();
        }
      } catch {
        setEnVol(null);
      }
    }, RYTHME_SUIVI_MS);
    return () => clearInterval(minuteur);
  }, [enVol, base, charger, onChange]);

  async function faireAgir(corps: { tache_id?: number; invite?: string }) {
    setSouci(null);
    try {
      const mission = await lancerMission(collaborateur.id, corps, base);
      setEnVol(mission.id);
      if (!ouvert) onBasculer();
      else await charger();
    } catch (err) {
      setSouci(err instanceof Error ? err.message : "Impossible de lancer la mission");
    }
  }

  async function basculerActif(actif: boolean) {
    setSouci(null);
    try {
      await modifierCollaborateur(collaborateur.id, { actif }, base);
      await onChange();
    } catch (err) {
      setSouci(err instanceof Error ? err.message : "Modification impossible");
    }
  }

  function retirerTache(tache: TacheRecurrente) {
    confirmer({
      title: `Supprimer « ${tache.nom} » ?`,
      message:
        "Les comptes rendus qu'elle a déjà produits sont conservés — seul le travail à venir disparaît.",
      action: async () => {
        try {
          await supprimerTache(collaborateur.id, tache.id, base);
          await onChange();
        } catch (err) {
          setSouci(err instanceof Error ? err.message : "Suppression impossible");
        }
      },
    });
  }

  const sansTache = collaborateur.taches.length === 0;

  return (
    <li className="rounded-2xl border border-outline-soft bg-surface-container-lowest">
      <div className="flex items-center gap-3 p-4">
        <span
          className={`flex-none grid place-items-center w-9 h-9 rounded-full ${
            collaborateur.actif ? "bg-primary/10 text-primary" : "bg-surface-container text-outline"
          }`}
        >
          <SmartToyOutlined style={{ fontSize: 20 }} />
        </span>

        <button
          type="button"
          onClick={onBasculer}
          className="flex-1 min-w-0 text-left"
          aria-expanded={ouvert}
        >
          <span className="block text-body-md text-on-surface truncate">
            {collaborateur.nom}
          </span>
          <span className="block text-body-sm text-on-surface-variant truncate">
            {role} · {resumeDesTaches(collaborateur.taches)}
          </span>
        </button>

        {enVol !== null && (
          <span className="flex-none text-label-sm text-tertiary">au travail…</span>
        )}

        {peutGerer && (
          <>
            <button
              type="button"
              onClick={() => setPonctuelle(true)}
              disabled={!collaborateur.actif || enVol !== null}
              className="flex-none inline-flex items-center gap-1 rounded-lg border border-outline-soft px-2.5 py-1.5 text-label-md text-on-surface hover:bg-surface-container disabled:opacity-40 transition-colors"
            >
              <PlayArrowOutlined style={{ fontSize: 16 }} />
              Lui demander
            </button>
            <Switch
              checked={collaborateur.actif}
              onChange={basculerActif}
              label={`Activer ${collaborateur.nom}`}
            />
          </>
        )}
      </div>

      {souci && <p className="px-4 pb-3 text-body-sm text-error">{souci}</p>}

      {ouvert && (
        <div className="border-t border-hairline px-4 py-4">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-label-sm uppercase text-outline">Son profil</p>
            {peutGerer && (
              <button
                type="button"
                onClick={() => setProfilEdite(true)}
                className="inline-flex items-center gap-1 text-label-md text-primary hover:opacity-70 transition-opacity"
              >
                <EditOutlined style={{ fontSize: 14 }} />
                Modifier
              </button>
            )}
          </div>
          <p className="text-body-sm text-on-surface-variant whitespace-pre-wrap mb-5">
            {collaborateur.profil || "— aucun profil : il travaillera comme un assistant quelconque."}
          </p>

          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-label-sm uppercase text-outline">Ses tâches récurrentes</p>
            {peutGerer && (
              <button
                type="button"
                onClick={() => setTacheEditee("nouvelle")}
                className="inline-flex items-center gap-1 text-label-md text-primary hover:opacity-70 transition-opacity"
              >
                <AddOutlined style={{ fontSize: 14 }} />
                Ajouter
              </button>
            )}
          </div>
          {sansTache ? (
            <p className="mb-5 rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
              Aucune tâche : <strong className="text-on-surface">il ne se réveillera
              jamais tout seul</strong>. Vous pouvez quand même lui demander quelque chose
              ponctuellement, ici ou depuis la boîte de réception.
            </p>
          ) : (
            <ul className="mb-5 flex flex-col gap-2">
              {collaborateur.taches.map((t) => (
                <LigneTache
                  key={t.id}
                  tache={t}
                  peutGerer={peutGerer}
                  occupe={!collaborateur.actif || enVol !== null}
                  onLancer={() => faireAgir({ tache_id: t.id })}
                  onEditer={() => setTacheEditee(t)}
                  onSupprimer={() => retirerTache(t)}
                  onBasculer={async (actif) => {
                    await modifierTache(collaborateur.id, t.id, { actif }, base);
                    await onChange();
                  }}
                />
              ))}
            </ul>
          )}

          <p className="flex items-center gap-1.5 text-label-sm uppercase text-outline mb-2">
            <HistoryOutlined style={{ fontSize: 14 }} />
            Ses passages
          </p>
          {missions === null ? (
            <p className="text-body-sm text-on-surface-variant">Chargement…</p>
          ) : missions.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">
              Il n&apos;est encore jamais passé.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {missions.map((m) => (
                <LigneMission
                  key={m.id}
                  mission={m}
                  nomDeLaTache={
                    collaborateur.taches.find((t) => t.id === m.tache_id)?.nom ?? null
                  }
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {profilEdite && (
        <FormulaireProfil
          collaborateur={collaborateur}
          base={base}
          onClose={() => setProfilEdite(false)}
          onEnregistre={async () => {
            setProfilEdite(false);
            await onChange();
          }}
        />
      )}

      {tacheEditee !== null && (
        <FormulaireTache
          collaborateurId={collaborateur.id}
          tache={tacheEditee === "nouvelle" ? null : tacheEditee}
          base={base}
          onClose={() => setTacheEditee(null)}
          onEnregistre={async () => {
            setTacheEditee(null);
            await onChange();
          }}
        />
      )}

      {dialogue}

      {ponctuelle && (
        <FormulairePonctuel
          nom={collaborateur.nom}
          taches={collaborateur.taches}
          onClose={() => setPonctuelle(false)}
          onLancer={async (corps) => {
            setPonctuelle(false);
            await faireAgir(corps);
          }}
        />
      )}
    </li>
  );
}

function LigneTache({
  tache,
  peutGerer,
  occupe,
  onLancer,
  onEditer,
  onSupprimer,
  onBasculer,
}: {
  tache: TacheRecurrente;
  peutGerer: boolean;
  occupe: boolean;
  onLancer: () => void;
  onEditer: () => void;
  onSupprimer: () => void;
  onBasculer: (actif: boolean) => Promise<void>;
}) {
  return (
    <li className="flex items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className={`truncate text-body-sm ${tache.actif ? "text-on-surface" : "text-outline"}`}>
          {tache.nom}
        </p>
        <p className="truncate text-label-sm text-on-surface-variant">
          {quand(tache)} · dernier passage&nbsp;: {dateCourte(tache.dernier_passage)}
        </p>
      </div>
      {peutGerer && (
        <>
          <button
            type="button"
            onClick={onLancer}
            disabled={occupe}
            title="Faire passer maintenant"
            className="flex-none rounded-lg border border-outline-soft p-1.5 text-on-surface hover:bg-surface-container disabled:opacity-40 transition-colors"
          >
            <PlayArrowOutlined style={{ fontSize: 16 }} />
          </button>
          <button
            type="button"
            onClick={onEditer}
            title="Modifier"
            className="flex-none rounded-lg border border-outline-soft p-1.5 text-on-surface hover:bg-surface-container transition-colors"
          >
            <EditOutlined style={{ fontSize: 16 }} />
          </button>
          <button
            type="button"
            onClick={onSupprimer}
            title="Supprimer"
            className="flex-none rounded-lg border border-outline-soft p-1.5 text-on-surface-variant hover:bg-error-container hover:text-error transition-colors"
          >
            <DeleteOutlineOutlined style={{ fontSize: 16 }} />
          </button>
          <Switch
            checked={tache.actif}
            onChange={(v) => void onBasculer(v)}
            label={`Activer ${tache.nom}`}
          />
        </>
      )}
    </li>
  );
}

function LigneMission({
  mission,
  nomDeLaTache,
}: {
  mission: Mission;
  nomDeLaTache: string | null;
}) {
  return (
    <li className="rounded-xl bg-surface-container-low p-3">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <span className={`rounded-full px-2 py-0.5 text-label-sm ${TEINTE_STATUT[mission.statut]}`}>
          {LIBELLE_STATUT[mission.statut]}
        </span>
        {nomDeLaTache && (
          <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
            {nomDeLaTache}
          </span>
        )}
        <span className="text-label-sm text-on-surface-variant">
          {dateCourte(mission.terminee_le ?? mission.cree_le)}
          {ORIGINE[mission.declencheur]}
        </span>
      </div>
      {mission.erreur ? (
        <p className="text-body-sm text-error">{mission.erreur}</p>
      ) : mission.compte_rendu ? (
        <div className="text-body-sm text-on-surface">
          <Markdown texte={mission.compte_rendu} />
        </div>
      ) : (
        <p className="text-body-sm text-on-surface-variant">Pas encore de compte rendu.</p>
      )}
      {mission.outils_appeles.length > 0 && (
        <p className="mt-2 text-label-sm text-outline">
          Outils employés&nbsp;: {mission.outils_appeles.join(", ")}
        </p>
      )}
    </li>
  );
}

// ─── les formulaires ─────────────────────────────────────────────────────────

function FormulaireCollaborateur({
  roles,
  base,
  onClose,
  onCree,
}: {
  roles: RoleCollaborateur[];
  base?: string;
  onClose: () => void;
  onCree: () => Promise<void>;
}) {
  const [nom, setNom] = useState("");
  const [cle, setCle] = useState("");
  const [role, setRole] = useState(roles[0]?.cle ?? "controleur");
  const [profil, setProfil] = useState(PROFILS["controleur"] ?? "");
  // Vrai dès que la personne a écrit : on ne remplace jamais son texte en
  // changeant de métier, même si le gabarit d'origine n'a pas été touché.
  const [profilTouche, setProfilTouche] = useState(false);
  const [cleTouchee, setCleTouchee] = useState(false);
  const [avecTaches, setAvecTaches] = useState(true);

  const suggerees = TACHES_SUGGEREES[role] ?? [];

  function choisirRole(nouveau: string) {
    setRole(nouveau);
    if (!profilTouche) setProfil(PROFILS[nouveau] ?? "");
  }

  // La clé suit le nom tant qu'on n'y a pas touché : elle ne change plus
  // après la création, et la faire saisir deux fois est le plus sûr moyen
  // d'obtenir une faute de frappe définitive.
  function nommer(valeur: string) {
    setNom(valeur);
    if (!cleTouchee) setCle(enCle(valeur));
  }

  return (
    <FormDrawer
      title="Nouveau collaborateur"
      submitLabel="Créer"
      onClose={onClose}
      onSubmit={async () => {
        const cree = await creerCollaborateur(
          {
            cle: cle.trim().toLowerCase(),
            nom: nom.trim(),
            role,
            profil,
            group_ids: [],
          },
          base
        );
        // Les tâches APRÈS le compte : si l'une d'elles échoue, le
        // collaborateur existe quand même et se complète à l'écran. L'inverse
        // — des tâches sans collaborateur — n'a aucun rattrapage.
        if (avecTaches) {
          for (const t of suggerees) {
            await creerTache(
              cree.id,
              {
                nom: t.nom,
                consigne: t.consigne,
                cadence: t.cadence,
                heure: t.heure,
                jour: t.jour ?? null,
              },
              base
            ).catch(() => undefined);
          }
        }
        await onCree();
      }}
    >
      <div className="flex flex-col gap-4">
        <FormField label="Nom">
          <input
            className={FORM_CONTROL}
            value={nom}
            onChange={(e) => nommer(e.target.value)}
            placeholder="Contrôleur interne"
            required
          />
        </FormField>

        <FormField label="Clé">
          <input
            className={FORM_CONTROL}
            value={cle}
            onChange={(e) => {
              setCle(e.target.value);
              setCleTouchee(true);
            }}
            placeholder="controleur"
            pattern="[a-zA-Z][a-zA-Z0-9-]{1,38}[a-zA-Z0-9]"
            required
          />
          <p className="mt-1 text-label-sm text-outline">
            Elle devient son adresse interne et ne change plus. Lettres, chiffres et
            tirets.
          </p>
        </FormField>

        <FormField label="Métier">
          <select
            className={FORM_CONTROL}
            value={role}
            onChange={(e) => choisirRole(e.target.value)}
          >
            {roles.map((r) => (
              <option key={r.cle} value={r.cle}>
                {r.libelle}
              </option>
            ))}
          </select>
          <p className="mt-1 text-label-sm text-outline">
            Le métier borne les applications qu&apos;il peut regarder, et c&apos;est une
            mesure de sûreté — pas une description. Le profil ci-dessous dit comment il
            travaille ; il ne peut pas lui ouvrir une porte que le métier ferme.
          </p>
        </FormField>

        <FormField label="Son profil">
          <textarea
            className={`${FORM_CONTROL} min-h-[240px] font-body-md`}
            value={profil}
            onChange={(e) => {
              setProfil(e.target.value);
              setProfilTouche(true);
            }}
          />
          <p className="mt-1 text-label-sm text-outline">
            Qui il est et comment il travaille. Il le relit chaque fois qu&apos;il
            travaille — à l&apos;heure dite comme quand on lui écrit.
          </p>
        </FormField>

        {suggerees.length > 0 && (
          <label className="flex items-start gap-2.5 rounded-xl bg-surface-container-low p-3">
            <input
              type="checkbox"
              checked={avecTaches}
              onChange={(e) => setAvecTaches(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-body-sm text-on-surface-variant">
              Créer aussi{" "}
              {suggerees.length === 1 ? "sa tâche de départ" : `ses ${suggerees.length} tâches de départ`}{" "}
              : {suggerees.map((t) => `${t.nom} (${quand({ ...t, jour: t.jour ?? null }).toLowerCase()})`).join(", ")}.
              Elles se modifient ensuite une par une.
            </span>
          </label>
        )}

        <p className="rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
          Il naît <strong className="text-on-surface">sans aucun droit</strong>. Pour
          qu&apos;il voie quelque chose, ajoutez-le à un groupe depuis Membres — il y
          apparaît comme n&apos;importe quel membre.
        </p>
      </div>
    </FormDrawer>
  );
}

function FormulaireProfil({
  collaborateur,
  base,
  onClose,
  onEnregistre,
}: {
  collaborateur: Collaborateur;
  base?: string;
  onClose: () => void;
  onEnregistre: () => Promise<void>;
}) {
  const [nom, setNom] = useState(collaborateur.nom);
  const [profil, setProfil] = useState(collaborateur.profil);

  return (
    <FormDrawer
      title={`Profil de ${collaborateur.nom}`}
      submitLabel="Enregistrer"
      onClose={onClose}
      onSubmit={async () => {
        await modifierCollaborateur(collaborateur.id, { nom: nom.trim(), profil }, base);
        await onEnregistre();
      }}
    >
      <div className="flex flex-col gap-4">
        <FormField label="Nom">
          <input
            className={FORM_CONTROL}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Son profil">
          <textarea
            className={`${FORM_CONTROL} min-h-[280px] font-body-md`}
            value={profil}
            onChange={(e) => setProfil(e.target.value)}
          />
          <p className="mt-1 text-label-sm text-outline">
            Le profil ne peut pas lever les règles du moteur : il travaille seul, en
            lecture seule, et doit dire ce qu&apos;il n&apos;a pas pu vérifier.
          </p>
        </FormField>
      </div>
    </FormDrawer>
  );
}

function FormulaireTache({
  collaborateurId,
  tache,
  base,
  onClose,
  onEnregistre,
}: {
  collaborateurId: number;
  tache: TacheRecurrente | null;
  base?: string;
  onClose: () => void;
  onEnregistre: () => Promise<void>;
}) {
  const [nom, setNom] = useState(tache?.nom ?? "");
  const [consigne, setConsigne] = useState(tache?.consigne ?? "");
  const [cadence, setCadence] = useState(tache?.cadence ?? "QUOTIDIENNE");
  const [heure, setHeure] = useState(tache?.heure ?? 7);
  const [jour, setJour] = useState(tache?.jour ?? 0);

  return (
    <FormDrawer
      title={tache ? `Modifier « ${tache.nom} »` : "Nouvelle tâche"}
      submitLabel={tache ? "Enregistrer" : "Ajouter"}
      onClose={onClose}
      onSubmit={async () => {
        const corps = {
          nom: nom.trim(),
          consigne,
          cadence,
          heure,
          jour: cadence === "HEBDOMADAIRE" ? jour : null,
        };
        if (tache) await modifierTache(collaborateurId, tache.id, corps, base);
        else await creerTache(collaborateurId, corps, base);
        await onEnregistre();
      }}
    >
      <div className="flex flex-col gap-4">
        <FormField label="Nom de la tâche">
          <input
            className={FORM_CONTROL}
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Clôture du soir"
            maxLength={120}
          />
          <p className="mt-1 text-label-sm text-outline">
            Pour vous repérer dans la liste. Il ne le lit pas. Laissé vide, la première
            ligne de la consigne fera l&apos;affaire.
          </p>
        </FormField>

        <FormField label="Ce qu'il doit faire">
          <textarea
            className={`${FORM_CONTROL} min-h-[220px] font-body-md`}
            value={consigne}
            onChange={(e) => setConsigne(e.target.value)}
            required
          />
          <p className="mt-1 text-label-sm text-outline">
            Dites ce qu&apos;il regarde et ce qu&apos;il rapporte. C&apos;est ce texte
            qui part, tel quel, à chaque passage.
          </p>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Quand">
            <select
              className={FORM_CONTROL}
              value={cadence}
              onChange={(e) => setCadence(e.target.value as TacheRecurrente["cadence"])}
            >
              <option value="MANUELLE">À la demande</option>
              <option value="QUOTIDIENNE">Tous les jours</option>
              <option value="HEBDOMADAIRE">Chaque semaine</option>
            </select>
          </FormField>

          {cadence !== "MANUELLE" && (
            <FormField label="À partir de">
              <select
                className={FORM_CONTROL}
                value={heure}
                onChange={(e) => setHeure(Number(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")} h
                  </option>
                ))}
              </select>
            </FormField>
          )}
        </div>

        {cadence === "HEBDOMADAIRE" && (
          <FormField label="Jour">
            <select
              className={FORM_CONTROL}
              value={jour}
              onChange={(e) => setJour(Number(e.target.value))}
            >
              {JOURS.map((libelle, index) => (
                <option key={libelle} value={index}>
                  {libelle.charAt(0).toUpperCase() + libelle.slice(1)}
                </option>
              ))}
            </select>
          </FormField>
        )}
      </div>
    </FormDrawer>
  );
}

function FormulairePonctuel({
  nom,
  taches,
  onClose,
  onLancer,
}: {
  nom: string;
  taches: TacheRecurrente[];
  onClose: () => void;
  onLancer: (corps: { tache_id?: number; invite?: string }) => Promise<void>;
}) {
  const [choix, setChoix] = useState<string>(taches[0] ? String(taches[0].id) : "libre");
  const [invite, setInvite] = useState("");

  return (
    <FormDrawer
      title={`Demander à ${nom}`}
      submitLabel="Lancer"
      onClose={onClose}
      onSubmit={async () => {
        if (choix === "libre") {
          if (!invite.trim()) throw new Error("Écrivez ce qu'il doit faire.");
          await onLancer({ invite: invite.trim() });
        } else {
          await onLancer({ tache_id: Number(choix) });
        }
      }}
    >
      <div className="flex flex-col gap-4">
        <FormField label="Quoi">
          <select
            className={FORM_CONTROL}
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
          >
            {taches.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.nom}
              </option>
            ))}
            <option value="libre">Autre chose…</option>
          </select>
        </FormField>

        {choix === "libre" && (
          <FormField label="Ce qu'il doit faire">
            <textarea
              className={`${FORM_CONTROL} min-h-[180px] font-body-md`}
              value={invite}
              onChange={(e) => setInvite(e.target.value)}
              placeholder="Vérifie les écritures du mois de septembre et dis-moi lesquelles ne sont pas lettrées."
            />
            <p className="mt-1 text-label-sm text-outline">
              Une fois, maintenant. Rien n&apos;est enregistré : pour un travail qui
              revient, créez une tâche.
            </p>
          </FormField>
        )}
      </div>
    </FormDrawer>
  );
}
