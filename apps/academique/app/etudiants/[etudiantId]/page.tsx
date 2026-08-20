"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowBackOutlined,
  BadgeOutlined,
  CakeOutlined,
  EmailOutlined,
  PersonOutlineOutlined,
  PhoneOutlined,
  PlaceOutlined,
  PublicOutlined,
} from "@mui/icons-material";
import { Avatar } from "@repo/ui/Avatar";
import { Tabs } from "@repo/ui/Tabs";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { useContexte } from "@/app/lib/etablissement";
import { BOUTON, BOUTON_PLAT, CHAMP, Carte, Erreur, Kpi, Pastille, Vide } from "@/components/Bloc";
import {
  api,
  type AuditCotes,
  type Etudiant,
  type Inscription,
  type ParcoursResultats,
  type Projet,
  type Promotion,
  type SituationFrais,
} from "@/app/lib/api";

const TEINTE: Record<string, string> = {
  INSCRIT: "ok",
  ABANDON: "neutre",
  EXCLU: "alerte",
  DIPLOME: "info",
};

const LIBELLE: Record<string, string> = {
  INSCRIT: "Inscrit",
  ABANDON: "Abandon",
  EXCLU: "Exclu",
  DIPLOME: "Diplômé",
};

const TON_DECISION: Record<string, string> = {
  ADMIS: "ok",
  AJOURNE: "alerte",
  EXCLU: "alerte",
};

function montant(v: number, devise: string): string {
  return `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${devise}`;
}

function Ligne({
  icone,
  libelle,
  valeur,
}: {
  icone: React.ReactNode;
  libelle: string;
  valeur: string | null;
}) {
  return (
    <div className="flex items-center gap-3 text-body-sm">
      <span className="text-on-surface-variant">{icone}</span>
      <span className="w-24 shrink-0 text-on-surface-variant">{libelle}</span>
      <span className="min-w-0 truncate text-on-surface">{valeur || "—"}</span>
    </div>
  );
}

/** Un onglet qui charge sa propre section.
 *
 *  Chacun tire ses données quand on l'ouvre : la fiche s'affiche dès que
 *  l'identité est là, sans attendre les frais, le projet et l'audit.
 */
function useSection<T>(charger: () => Promise<T>, actif: boolean) {
  const [donnees, setDonnees] = useState<T | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (!actif) return;
    let vivant = true;
    setChargement(true);
    charger()
      .then((d) => {
        if (vivant) {
          setDonnees(d);
          setErreur(null);
        }
      })
      .catch((e) => {
        if (vivant) setErreur(e instanceof Error ? e.message : "Lecture impossible.");
      })
      .finally(() => {
        if (vivant) setChargement(false);
      });
    return () => {
      vivant = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actif]);

  return { donnees, erreur, chargement };
}

// ── Parcours ────────────────────────────────────────────────────────────────

function OngletParcours({
  etudiant,
  parcours,
  promotions,
  peutInscrire,
  onInscrire,
  busy,
  anneeLibelle,
}: {
  etudiant: Etudiant;
  parcours: Inscription[];
  promotions: Promotion[];
  peutInscrire: boolean;
  onInscrire: (promotion_id: number) => void;
  busy: boolean;
  anneeLibelle: string | null;
}) {
  const [choix, setChoix] = useState("");

  return (
    <Carte
      titre="Parcours"
      sousTitre="Chaque année reste : passer en année supérieure ajoute une ligne, n'en remplace aucune."
    >
      {parcours.length === 0 ? (
        <Vide message="Aucune inscription pour l'instant." />
      ) : (
        <div className="divide-y divide-hairline">
          {parcours.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <span className="w-[110px] flex-none text-label-md text-outline">
                {i.annee_libelle}
              </span>
              <span className="min-w-0 flex-1">
                <Link
                  href={`/promotions/${i.promotion_id}`}
                  className="block truncate text-body-sm text-on-surface hover:text-primary"
                >
                  {i.promotion_libelle}
                </Link>
                {i.motif && (
                  <span className="block truncate text-label-md text-on-surface-variant">
                    {i.motif}
                  </span>
                )}
              </span>
              <Pastille ton={TEINTE[i.statut]}>{LIBELLE[i.statut]}</Pastille>
            </div>
          ))}
        </div>
      )}

      {peutInscrire && !etudiant.archive && (
        <div className="flex flex-wrap items-center gap-2 border-t border-hairline px-4 py-3">
          <select
            aria-label="Promotion"
            className={CHAMP}
            value={choix}
            onChange={(e) => setChoix(e.target.value)}
          >
            <option value="">
              {anneeLibelle ? `Inscrire en ${anneeLibelle}…` : "Aucune année de travail"}
            </option>
            {promotions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.libelle}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !choix}
            onClick={() => {
              onInscrire(Number(choix));
              setChoix("");
            }}
            className={BOUTON}
          >
            Inscrire
          </button>
        </div>
      )}
    </Carte>
  );
}

// ── Résultats ───────────────────────────────────────────────────────────────

function OngletResultats({ etudiantId, actif }: { etudiantId: number; actif: boolean }) {
  const { donnees, erreur, chargement } = useSection<ParcoursResultats>(
    () => api.resultats(etudiantId),
    actif
  );

  if (erreur) return <Erreur message={erreur} />;
  if (!donnees) return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi valeur={donnees.credits_cumules} libelle="crédits acquis" />
        <Kpi valeur={donnees.annees.length} libelle="délibérations closes" />
      </div>

      <Carte
        titre="Décisions arrêtées"
        sousTitre="Telles qu'elles ont été figées le jour de la délibération : un réglage modifié depuis ne réécrit pas un résultat."
      >
        {donnees.annees.length === 0 ? (
          <Vide
            message={
              chargement
                ? "Chargement…"
                : "Aucune délibération close. Une grille en cours ne paraît pas ici : elle donnerait l'impression d'un résultat arrêté."
            }
          />
        ) : (
          <div className="divide-y divide-hairline">
            {donnees.annees.map((a) => (
              <div key={a.deliberation_id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="w-[110px] flex-none text-label-md text-outline">
                  {a.annee_libelle}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm text-on-surface">
                    {a.promotion_libelle}
                  </span>
                  <span className="block text-label-md text-outline">
                    {a.session_libelle}
                    {a.periode > 0 && ` · période ${a.periode}`} · close le{" "}
                    {a.close_le.slice(0, 10)}
                  </span>
                </span>
                <span className="w-[92px] flex-none text-right tabular-nums text-body-sm text-on-surface">
                  {a.credits_acquis}/{a.credits_totaux} cr.
                </span>
                <span className="w-[64px] flex-none text-right tabular-nums text-body-sm text-on-surface">
                  {a.moyenne === null ? "—" : a.moyenne.toFixed(2)}
                </span>
                <span className="w-[110px] flex-none truncate text-label-md text-on-surface-variant">
                  {a.mention ?? ""}
                </span>
                <Pastille ton={TON_DECISION[a.decision] ?? "neutre"}>{a.decision_libelle}</Pastille>
              </div>
            ))}
          </div>
        )}
      </Carte>
    </div>
  );
}

// ── Frais ───────────────────────────────────────────────────────────────────

function OngletFrais({
  inscription,
  actif,
}: {
  inscription: Inscription | null;
  actif: boolean;
}) {
  const { donnees, erreur } = useSection<SituationFrais>(
    () => api.situationFrais(inscription!.id),
    actif && inscription !== null
  );

  // L'onglet reste, et DIT pourquoi il est vide : le masquer laisserait
  // chercher les frais ailleurs.
  if (!inscription)
    return (
      <Carte titre="Frais">
        <Vide message="Les frais suivent une inscription. Cet étudiant n'en a aucune pour l'instant." />
      </Carte>
    );
  if (erreur) return <Erreur message={erreur} />;
  if (!donnees) return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;

  const devise = donnees.lignes[0]?.devise ?? "USD";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi valeur={montant(donnees.total_du, devise)} libelle="dû" />
        <Kpi valeur={montant(donnees.total_paye, devise)} libelle="payé" />
        <Kpi valeur={montant(donnees.total_reste, devise)} libelle="reste" />
        <Kpi
          valeur={donnees.en_ordre ? "En ordre" : "Pas en ordre"}
          libelle={inscription.annee_libelle}
        />
      </div>

      {donnees.manquants.length > 0 && (
        <div className="rounded-xl border border-error/30 bg-error-container/30 px-3 py-2.5">
          <p className="text-body-sm font-medium text-on-surface">Ce qui manque</p>
          <ul className="mt-1 space-y-0.5">
            {donnees.manquants.map((m, n) => (
              <li key={n} className="text-label-md text-on-surface-variant">
                {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Carte titre="Détail par frais">
        {donnees.lignes.length === 0 ? (
          <Vide message="Aucun frais n'est défini pour cette promotion." />
        ) : (
          <div className="divide-y divide-hairline">
            {donnees.lignes.map((l) => (
              <div key={l.type_frais_id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm text-on-surface">{l.libelle}</span>
                  <span className="block text-label-md text-outline">
                    {l.portee === "PERIODE" ? `période ${l.periode ?? "?"}` : "année"}
                    {l.obligatoire ? " · obligatoire" : " · facultatif"}
                    {l.pourcentage_minimum > 0 && ` · seuil ${l.pourcentage_minimum} %`}
                  </span>
                </span>
                <span className="w-[110px] flex-none text-right tabular-nums text-body-sm text-on-surface-variant">
                  {montant(l.du, l.devise)}
                </span>
                <span className="w-[110px] flex-none text-right tabular-nums text-body-sm text-on-surface">
                  {montant(l.paye, l.devise)}
                </span>
                <Pastille ton={l.en_ordre ? "ok" : "alerte"}>
                  {l.en_ordre ? "en ordre" : montant(l.reste, l.devise)}
                </Pastille>
              </div>
            ))}
          </div>
        )}
      </Carte>
    </div>
  );
}

// ── Projet ──────────────────────────────────────────────────────────────────

function OngletProjet({
  inscription,
  actif,
}: {
  inscription: Inscription | null;
  actif: boolean;
}) {
  const { donnees, erreur } = useSection<Projet>(
    () => api.projet(inscription!.id),
    actif && inscription !== null
  );

  if (!inscription)
    return (
      <Carte titre="Travail de fin de cycle">
        <Vide message="Un projet est porté par une inscription. Cet étudiant n'en a aucune pour l'instant." />
      </Carte>
    );
  if (erreur) return <Erreur message={erreur} />;
  if (!donnees) return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;

  const jalons: [string, boolean][] = [
    ["Sujet approuvé", donnees.avancement.sujet_approuve],
    ["Directeur attribué", donnees.avancement.directeur_attribue],
    ["Rapporteur attribué", donnees.avancement.rapporteur_attribue],
    ["Mémoire déposé", donnees.avancement.fichier_depose],
    ["Anti-plagiat déposé", donnees.avancement.plagiat_depose],
  ];

  return (
    <div className="space-y-3">
      <Carte
        titre={donnees.titre ?? "Sujet non déposé"}
        sousTitre={`${donnees.titre_statut_libelle}${
          donnees.titre_soumis_le ? ` · soumis le ${donnees.titre_soumis_le.slice(0, 10)}` : ""
        }`}
        action={
          <Pastille ton={donnees.avancement.commission_peut_travailler ? "ok" : "attente"}>
            {donnees.avancement.commission_peut_travailler
              ? "la commission peut travailler"
              : "dossier incomplet"}
          </Pastille>
        }
      >
        <div className="grid gap-3 px-4 py-3 sm:grid-cols-2">
          <Ligne
            icone={<PersonOutlineOutlined style={{ fontSize: 18 }} />}
            libelle="Directeur"
            valeur={donnees.directeur_nom || null}
          />
          <Ligne
            icone={<PersonOutlineOutlined style={{ fontSize: 18 }} />}
            libelle="Rapporteur"
            valeur={donnees.rapporteur_nom || null}
          />
          <Ligne
            icone={<BadgeOutlined style={{ fontSize: 18 }} />}
            libelle="Fichier"
            valeur={donnees.fichier_nom}
          />
          <Ligne
            icone={<BadgeOutlined style={{ fontSize: 18 }} />}
            libelle="Plagiat"
            valeur={
              donnees.plagiat_taux === null
                ? null
                : `${donnees.plagiat_taux} %${donnees.plagiat_valide ? "" : " — au-dessus du seuil"}`
            }
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-hairline px-4 py-3">
          {jalons.map(([libelle, fait]) => (
            <Pastille key={libelle} ton={fait ? "ok" : "neutre"}>
              {fait ? "✓ " : "· "}
              {libelle}
            </Pastille>
          ))}
        </div>

        {donnees.avancement.manquants.length > 0 && (
          <div className="border-t border-hairline px-4 py-3">
            <p className="text-label-md text-outline">Il manque</p>
            <ul className="mt-1 space-y-0.5">
              {donnees.avancement.manquants.map((m, n) => (
                <li key={n} className="text-body-sm text-on-surface-variant">
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Carte>

      {(donnees.objectifs || donnees.interets || donnees.ressources_souhaitees) && (
        <Carte titre="Ce que l'étudiant a écrit">
          <div className="space-y-2 px-4 py-3 text-body-sm">
            {(
              [
                ["Objectifs", donnees.objectifs],
                ["Centres d'intérêt", donnees.interets],
                ["Domaines", donnees.domaines],
                ["Thématiques", donnees.thematiques],
                ["Niveau perçu", donnees.niveau_libelle || donnees.niveau_percu],
                ["Ressources souhaitées", donnees.ressources_souhaitees],
              ] as [string, string | null][]
            )
              .filter(([, v]) => v)
              .map(([libelle, valeur]) => (
                <div key={libelle}>
                  <p className="text-label-md text-outline">{libelle}</p>
                  <p className="whitespace-pre-line text-on-surface">{valeur}</p>
                </div>
              ))}
          </div>
        </Carte>
      )}
    </div>
  );
}

// ── Audit des cotes ─────────────────────────────────────────────────────────

function OngletAudit({ etudiantId, actif }: { etudiantId: number; actif: boolean }) {
  const { donnees, erreur } = useSection<AuditCotes>(() => api.auditCotes(etudiantId), actif);

  if (erreur) return <Erreur message={erreur} />;
  if (!donnees) return <p className="text-body-sm text-on-surface-variant">Chargement…</p>;

  return (
    <Carte
      titre="Cotes réécrites"
      sousTitre="Toute correction laisse sa trace : qui, quand, la valeur d'avant et le motif. Une cote ne se modifie jamais en silence."
    >
      {donnees.lignes.length === 0 ? (
        <Vide message="Aucune cote de cet étudiant n'a été réécrite." />
      ) : (
        <div className="divide-y divide-hairline">
          {donnees.lignes.map((l, n) => (
            <div key={n} className="px-4 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-body-sm text-on-surface">
                  {l.element_intitule}
                  <span className="ml-1.5 font-mono text-label-md text-outline">{l.code_ue}</span>
                </span>
                <Pastille>{l.contexte}</Pastille>
                <span className="flex-none text-label-md text-outline">{l.le.slice(0, 16)}</span>
              </div>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                <span className="line-through">{l.avant}</span>
                {" → "}
                <span className="font-medium text-on-surface">{l.apres}</span>
                {l.motif && <span className="text-on-surface-variant"> — {l.motif}</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </Carte>
  );
}

// ── Fiche ───────────────────────────────────────────────────────────────────

/** La fiche d'un étudiant : une identité, puis des onglets.
 *
 *  Le parcours est la raison d'être du modèle — chaque année y reste, avec sa
 *  promotion et sa fin. Tout le reste de ce qu'on sait d'un étudiant (résultats
 *  arrêtés, frais, mémoire, cotes réécrites) tenait dans d'autres écrans, qu'il
 *  fallait connaître pour y aller. Les onglets les rassemblent là où on cherche
 *  la personne, sans allonger la page : chacun charge sa section à l'ouverture.
 *
 *  **Aucun onglet n'est masqué par l'absence de données** — un onglet qui
 *  disparaît quand il est vide fait chercher ailleurs ce qui n'existe pas
 *  encore. Il reste et il DIT ce qui manque. Seule la permission cache.
 */
export default function EtudiantPage({
  params,
}: {
  params: Promise<{ etudiantId: string }>;
}) {
  const { etudiantId } = use(params);
  const id = Number(etudiantId);
  const { can } = usePermissions();
  const peutGerer = can("academique.etudiants.manage");
  const peutInscrire = can("academique.inscriptions.manage");
  // Les portes sont celles des routes appelées, pas des noms inventés ici : un
  // droit qui n'existe pas côté service n'est jamais accordé, et l'onglet
  // disparaîtrait pour tout le monde sans que rien ne le signale.
  const peutVoirResultats = can("academique.deliberation.view");
  const peutVoirDossier = can("academique.structure.view");
  const peutAuditerCotes = can("academique.cotes.gerer");
  const contexte = useContexte();

  const [etudiant, setEtudiant] = useState<Etudiant | null>(null);
  const [parcours, setParcours] = useState<Inscription[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [onglet, setOnglet] = useState("parcours");
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const charger = useCallback(async () => {
    try {
      const [fiche, suite] = await Promise.all([api.etudiant(id), api.parcours(id)]);
      setEtudiant(fiche);
      setParcours(suite);
      if (contexte.etablissement && contexte.annee) {
        setPromotions(
          await api.promotions(contexte.etablissement.id, { annee: contexte.annee.id })
        );
      }
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Fiche introuvable.");
    }
  }, [id, contexte.etablissement, contexte.annee]);

  useEffect(() => {
    void charger();
  }, [charger]);

  // L'inscription COURANTE porte les frais et le projet : la dernière ouverte,
  // sinon la plus récente — le parcours arrive déjà trié par le serveur.
  const courante =
    parcours.find((i) => i.statut === "INSCRIT") ?? parcours[parcours.length - 1] ?? null;

  async function inscrire(promotion_id: number) {
    setBusy(true);
    setErreur(null);
    try {
      await api.inscrire(id, promotion_id);
      setToast("Inscription enregistrée.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Inscription impossible.");
    } finally {
      setBusy(false);
    }
  }

  const onglets = [
    {
      key: "parcours",
      label: "Parcours",
      content: etudiant && (
        <OngletParcours
          etudiant={etudiant}
          parcours={parcours}
          promotions={promotions}
          peutInscrire={peutInscrire}
          onInscrire={inscrire}
          busy={busy}
          anneeLibelle={contexte.annee?.libelle ?? null}
        />
      ),
    },
    ...(peutVoirResultats
      ? [
          {
            key: "resultats",
            label: "Résultats",
            content: <OngletResultats etudiantId={id} actif={onglet === "resultats"} />,
          },
        ]
      : []),
    ...(peutVoirDossier
      ? [
          {
            key: "frais",
            label: "Frais",
            content: <OngletFrais inscription={courante} actif={onglet === "frais"} />,
          },
        ]
      : []),
    ...(peutVoirDossier
      ? [
          {
            key: "projet",
            label: "Mémoire",
            content: <OngletProjet inscription={courante} actif={onglet === "projet"} />,
          },
        ]
      : []),
    ...(peutAuditerCotes
      ? [
          {
            key: "audit",
            label: "Audit des cotes",
            content: <OngletAudit etudiantId={id} actif={onglet === "audit"} />,
          },
        ]
      : []),
  ];

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1024px] space-y-4 p-4 md:p-8">
        <Link
          href="/etudiants"
          className="inline-flex items-center gap-1.5 text-body-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
        >
          <ArrowBackOutlined style={{ fontSize: 15 }} />
          Registre
        </Link>

        <Erreur message={erreur} />

        {!etudiant ? (
          !erreur && <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        ) : (
          <>
            <div className="space-y-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 md:p-6">
              <div className="flex flex-wrap items-start gap-4">
                <Avatar
                  name={etudiant.nom_complet}
                  letters={1}
                  size={48}
                  color="var(--color-tertiary)"
                />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate font-display text-headline-md text-on-surface">
                    {etudiant.nom_complet}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-body-sm text-on-surface-variant">
                      {etudiant.matricule}
                    </span>
                    {courante && (
                      <Pastille ton={TEINTE[courante.statut]}>
                        {LIBELLE[courante.statut]} · {courante.promotion_libelle}
                      </Pastille>
                    )}
                    {etudiant.archive && <Pastille>archivé</Pastille>}
                  </div>
                </div>
                {peutGerer && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api.modifierEtudiant(id, { archive: !etudiant.archive });
                        setToast(etudiant.archive ? "Fiche réactivée." : "Fiche archivée.");
                        await charger();
                      } catch (e) {
                        setErreur(e instanceof Error ? e.message : "Action impossible.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                    title="On n'efface pas une personne : archiver la sort des listes sans toucher à son parcours."
                    className={BOUTON_PLAT}
                  >
                    {etudiant.archive ? "Réactiver la fiche" : "Archiver la fiche"}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Ligne
                  icone={<PersonOutlineOutlined style={{ fontSize: 18 }} />}
                  libelle="Sexe"
                  valeur={
                    etudiant.sexe === "M" ? "Masculin" : etudiant.sexe === "F" ? "Féminin" : null
                  }
                />
                <Ligne
                  icone={<PhoneOutlined style={{ fontSize: 18 }} />}
                  libelle="Téléphone"
                  valeur={etudiant.telephone}
                />
                <Ligne
                  icone={<EmailOutlined style={{ fontSize: 18 }} />}
                  libelle="Courriel"
                  valeur={etudiant.email}
                />
                <Ligne
                  icone={<CakeOutlined style={{ fontSize: 18 }} />}
                  libelle="Naissance"
                  valeur={
                    [etudiant.date_naissance, etudiant.lieu_naissance]
                      .filter(Boolean)
                      .join(" · ") || null
                  }
                />
                <Ligne
                  icone={<PublicOutlined style={{ fontSize: 18 }} />}
                  libelle="Nationalité"
                  valeur={etudiant.nationalite}
                />
                <Ligne
                  icone={<PlaceOutlined style={{ fontSize: 18 }} />}
                  libelle="Adresse"
                  valeur={etudiant.adresse}
                />
              </div>
            </div>

            <Tabs tabs={onglets} activeTab={onglet} onChange={setOnglet} />
          </>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
