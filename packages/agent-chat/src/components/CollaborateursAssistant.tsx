"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AddOutlined,
  ErrorOutlineOutlined,
  HistoryOutlined,
  PlayArrowOutlined,
  SmartToyOutlined,
} from "@mui/icons-material";
import { FORM_CONTROL, FormField } from "@repo/ui/FormField";
import { FormDrawer } from "@repo/ui/FormDrawer";
import { Switch } from "@repo/ui/Switch";
import {
  creerCollaborateur,
  lancerMission,
  listerCollaborateurs,
  listerMissions,
  listerRoles,
  lireMission,
  modifierCollaborateur,
} from "../api/collaborateurs";
import { CONSIGNES } from "../lib/consignes";
import { Markdown } from "../lib/markdown";
import type { Collaborateur, Mission, RoleCollaborateur } from "../types";

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** « Contrôleur interne » → « controleur-interne ». Les accents d'abord : le
 *  service n'accepte que des lettres sans accent, et « contrôleur » amputé de
 *  son ô donnerait « contr-leur ». */
export function enCle(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Tant qu'une mission tourne, on redemande. Elle dure des dizaines de
 *  secondes : un écran qui ne bouge pas pendant ce temps donne l'impression
 *  que le bouton n'a rien fait. */
const RYTHME_SUIVI_MS = 3000;

export function quand(c: Collaborateur): string {
  if (c.cadence === "MANUELLE") return "À la demande";
  const heure = `${String(c.heure).padStart(2, "0")} h`;
  if (c.cadence === "HEBDOMADAIRE") {
    return `Chaque ${JOURS[c.jour ?? 0]} à ${heure}`;
  }
  return `Tous les jours à ${heure}`;
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
    listerRoles(base).then(setRoles).catch(() => setRoles([]));
  }, [recharger, base]);

  const libelleRole = (cle: string) => roles.find((r) => r.cle === cle)?.libelle ?? cle;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-5">
        <p className="text-body-md text-on-surface-variant max-w-[62ch]">
          Un collaborateur travaille <strong className="text-on-surface">quand personne
          ne lui parle</strong> : à l&apos;heure dite, il fait ce que dit sa consigne et
          dépose son compte rendu dans vos notifications. Il a un compte, des groupes et
          des droits comme n&apos;importe quel membre — et il ne fait que lire.
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

  async function faireAgir() {
    setSouci(null);
    try {
      const mission = await lancerMission(collaborateur.id, base);
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
            {role} · {quand(collaborateur)} · dernier passage&nbsp;:{" "}
            {dateCourte(collaborateur.dernier_passage)}
          </span>
        </button>

        {enVol !== null && (
          <span className="flex-none text-label-sm text-tertiary">au travail…</span>
        )}

        {peutGerer && (
          <>
            <button
              type="button"
              onClick={faireAgir}
              disabled={!collaborateur.actif || enVol !== null}
              className="flex-none inline-flex items-center gap-1 rounded-lg border border-outline-soft px-2.5 py-1.5 text-label-md text-on-surface hover:bg-surface-container disabled:opacity-40 transition-colors"
            >
              <PlayArrowOutlined style={{ fontSize: 16 }} />
              Faire passer
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
          <p className="text-label-sm uppercase text-outline mb-1.5">Sa consigne</p>
          <p className="text-body-sm text-on-surface-variant whitespace-pre-wrap mb-4">
            {collaborateur.consigne || "— aucune consigne, il ne fera rien."}
          </p>

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
                <LigneMission key={m.id} mission={m} />
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

function LigneMission({ mission }: { mission: Mission }) {
  return (
    <li className="rounded-xl bg-surface-container-low p-3">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`rounded-full px-2 py-0.5 text-label-sm ${TEINTE_STATUT[mission.statut]}`}>
          {LIBELLE_STATUT[mission.statut]}
        </span>
        <span className="text-label-sm text-on-surface-variant">
          {dateCourte(mission.terminee_le ?? mission.cree_le)}
          {mission.declencheur === "MANUEL" && " · lancé à la main"}
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
  const [consigne, setConsigne] = useState(CONSIGNES["controleur"] ?? "");
  // Vrai dès que la personne a écrit : on ne remplace jamais son texte en
  // changeant de métier, même si le gabarit d'origine n'a pas été touché.
  const [consigneTouchee, setConsigneTouchee] = useState(false);
  const [cleTouchee, setCleTouchee] = useState(false);
  const [cadence, setCadence] = useState("HEBDOMADAIRE");
  const [heure, setHeure] = useState(7);
  const [jour, setJour] = useState(0);

  function choisirRole(nouveau: string) {
    setRole(nouveau);
    if (!consigneTouchee) setConsigne(CONSIGNES[nouveau] ?? "");
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
        await creerCollaborateur(
          {
            cle: cle.trim().toLowerCase(),
            nom: nom.trim(),
            role,
            consigne,
            cadence,
            heure,
            jour: cadence === "HEBDOMADAIRE" ? jour : null,
            group_ids: [],
          },
          base
        );
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
          <select className={FORM_CONTROL} value={role} onChange={(e) => choisirRole(e.target.value)}>
            {roles.map((r) => (
              <option key={r.cle} value={r.cle}>
                {r.libelle}
              </option>
            ))}
          </select>
          <p className="mt-1 text-label-sm text-outline">
            Le métier borne ce qu&apos;il peut regarder, et c&apos;est une mesure de
            sûreté : il travaille seul, personne ne relit ses appels un par un.
          </p>
        </FormField>

        <FormField label="Sa consigne">
          <textarea
            className={`${FORM_CONTROL} min-h-[220px] font-body-md`}
            value={consigne}
            onChange={(e) => {
              setConsigne(e.target.value);
              setConsigneTouchee(true);
            }}
          />
          <p className="mt-1 text-label-sm text-outline">
            Dites ce qu&apos;il regarde et ce qu&apos;il rapporte. Il relit ce texte à
            chaque passage.
          </p>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Quand">
            <select
              className={FORM_CONTROL}
              value={cadence}
              onChange={(e) => setCadence(e.target.value)}
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
              {JOURS.map((nom, index) => (
                <option key={nom} value={index}>
                  {nom.charAt(0).toUpperCase() + nom.slice(1)}
                </option>
              ))}
            </select>
          </FormField>
        )}

        <p className="rounded-xl bg-surface-container-low p-3 text-body-sm text-on-surface-variant">
          Il naît <strong className="text-on-surface">sans aucun droit</strong>. Pour
          qu&apos;il voie quelque chose, ajoutez-le à un groupe depuis Membres —
          il y apparaît comme n&apos;importe quel membre.
        </p>
      </div>
    </FormDrawer>
  );
}
