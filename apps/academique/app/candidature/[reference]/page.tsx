"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  AddOutlined,
  ArrowBackOutlined,
  ArrowForwardOutlined,
  CheckCircleOutlined,
  DeleteOutlineOutlined,
  PrintOutlined,
  SearchOutlined,
} from "@mui/icons-material";
import { SearchSelect } from "@repo/ui/SearchSelect";

import { CodeQR } from "@/components/CodeQR";
import {
  api,
  type LigneParcours,
  type OuvertureCandidatures,
  type RecuCandidature,
  type SuiviCandidature,
  type UniteOuverte,
} from "@/app/lib/api";
import { libelleAvecParents } from "@/app/lib/ascendance";

/** Le dépôt d'une candidature — PUBLIC, sans compte.
 *
 *  Hors du shell applicatif : ni barre latérale, ni sélecteur d'espace, aucun
 *  élément du produit. Un candidat vient déposer un dossier, pas visiter un
 *  logiciel — et rien de ce qu'il voit ne doit lui apprendre ce qu'il y a
 *  derrière.
 *
 *  **Une section à la fois, et un récapitulatif avant l'envoi.** La version
 *  précédente déroulait tout d'un bloc : sur un téléphone, cela fait un mur de
 *  quarante champs où l'on ne sait plus ce qui reste à faire, et où l'on envoie
 *  sans avoir relu. Ici chaque étape tient dans un écran, la progression se
 *  voit, et la dernière page montre ce qui part — parce qu'on ne corrige pas
 *  une candidature après coup.
 *
 *  Il n'a pas de compte, et n'en aura pas : sa clé est le numéro de référence
 *  rendu à l'envoi. Exiger une inscription avant l'admission ferait ouvrir des
 *  milliers d'accès pour des dossiers qui seront refusés.
 */

const CHAMP =
  "h-10 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

interface Champ {
  cle: string;
  libelle: string;
  type?: "text" | "date" | "number" | "email" | "tel";
  requis?: boolean;
  aide?: string;
}

const IDENTITE: Champ[] = [
  { cle: "nom", libelle: "Nom", requis: true },
  { cle: "postnom", libelle: "Post-nom" },
  { cle: "prenom", libelle: "Prénom" },
  { cle: "date_naissance", libelle: "Date de naissance", type: "date" },
  { cle: "lieu_naissance", libelle: "Lieu de naissance" },
  { cle: "nationalite", libelle: "Nationalité" },
];

const CONTACT: Champ[] = [
  { cle: "telephone", libelle: "Téléphone", type: "tel", requis: true },
  { cle: "email", libelle: "Email", type: "email" },
  { cle: "province", libelle: "Province" },
  { cle: "ville", libelle: "Ville" },
  { cle: "commune", libelle: "Commune" },
  { cle: "adresse", libelle: "Adresse" },
];

const FAMILLE: Champ[] = [
  { cle: "nom_pere", libelle: "Nom du père" },
  { cle: "profession_pere", libelle: "Profession du père" },
  { cle: "nom_mere", libelle: "Nom de la mère" },
  { cle: "profession_mere", libelle: "Profession de la mère" },
  { cle: "urgence_nom", libelle: "Personne à prévenir" },
  { cle: "urgence_telephone", libelle: "Téléphone de cette personne", type: "tel" },
];

const DIPLOME: Champ[] = [
  { cle: "titre_diplome", libelle: "Diplôme obtenu", aide: "Ex. Diplôme d'État" },
  { cle: "numero_diplome", libelle: "Numéro du diplôme" },
  { cle: "annee_terminale", libelle: "Année d'obtention" },
  { cle: "etablissement_terminal", libelle: "École fréquentée" },
  { cle: "section_terminale", libelle: "Section / option" },
  { cle: "pourcentage_diplome", libelle: "Pourcentage obtenu", type: "number", aide: "Sur 100" },
];

const ETAPES = [
  { cle: "choix", titre: "Votre choix" },
  { cle: "identite", titre: "Votre identité" },
  { cle: "contact", titre: "Vous joindre" },
  { cle: "famille", titre: "Votre famille" },
  { cle: "etudes", titre: "Vos études" },
  { cle: "recap", titre: "Vérification" },
] as const;

const NATURES = [
  { valeur: "SECONDAIRE", libelle: "Humanités" },
  { valeur: "SUPERIEUR", libelle: "Supérieur" },
];

function ligneVide(): LigneParcours {
  return {
    nature: "SECONDAIRE",
    annee: "",
    etablissement: "",
    section: "",
    document_obtenu: "",
    pourcentage: "",
  };
}

export default function CandidaturePubliquePage() {
  const params = useParams<{ reference: string }>();
  const recherche = useSearchParams();

  const [ouverture, setOuverture] = useState<OuvertureCandidatures | null>(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [etape, setEtape] = useState(0);

  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [premier, setPremier] = useState<number | null>(null);
  const [second, setSecond] = useState<number | null>(null);
  const [parcours, setParcours] = useState<LigneParcours[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recu, setRecu] = useState<RecuCandidature | null>(null);

  const [reference, setReference] = useState(recherche.get("ref") ?? "");
  const [suivi, setSuivi] = useState<SuiviCandidature | null>(null);
  const [erreurSuivi, setErreurSuivi] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setOuverture(await api.ouvertureCandidatures(params.reference));
    } catch {
      setIntrouvable(true);
    }
  }, [params.reference]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const unite = useCallback(
    (id: number | null) => (ouverture?.unites ?? []).find((u) => u.id === id) ?? null,
    [ouverture],
  );

  const lienSuivi = useMemo(() => {
    if (typeof window === "undefined" || !recu) return "";
    return `${window.location.origin}/candidature/${params.reference}?ref=${encodeURIComponent(
      recu.reference,
    )}`;
  }, [params.reference, recu]);

  async function chercherUnite(q: string): Promise<UniteOuverte[]> {
    const mots = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const toutes = ouverture?.unites ?? [];
    if (!mots.length) return toutes;
    return toutes.filter((u) =>
      mots.every((m) => libelleAvecParents(u.chemin_libelles).toLowerCase().includes(m)),
    );
  }

  /** Ce qui manque pour quitter l'étape courante — nommé, jamais deviné. */
  function manquant(index: number): string | null {
    if (index === 0 && !premier) return "Choisissez la filière que vous demandez.";
    if (index === 1 && !valeurs.nom?.trim()) return "Votre nom est obligatoire.";
    if (index === 2 && !valeurs.telephone?.trim())
      return "Un téléphone est obligatoire : c'est par là qu'on vous joindra.";
    return null;
  }

  function avancer() {
    const souci = manquant(etape);
    if (souci) {
      setErreur(souci);
      return;
    }
    setErreur(null);
    setEtape((e) => Math.min(e + 1, ETAPES.length - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reculer() {
    setErreur(null);
    setEtape((e) => Math.max(e - 1, 0));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function envoyer() {
    if (!ouverture?.annee_id || !premier) return;
    setBusy(true);
    setErreur(null);
    try {
      const corps: Record<string, unknown> = {
        annee_id: ouverture.annee_id,
        choix_unite_id: premier,
        second_choix_unite_id: second,
        parcours: parcours
          .filter((l) => l.etablissement.trim() || l.annee.trim() || l.document_obtenu.trim())
          .map((l) => ({
            nature: l.nature,
            annee: l.annee.trim() || null,
            etablissement: l.etablissement.trim() || null,
            section: l.section.trim() || null,
            document_obtenu: l.document_obtenu.trim() || null,
            pourcentage: l.pourcentage.trim() ? Number(l.pourcentage) : null,
          })),
      };
      for (const [cle, valeur] of Object.entries(valeurs)) {
        const propre = valeur.trim();
        if (!propre) continue;
        corps[cle] = cle === "pourcentage_diplome" ? Number(propre) : propre;
      }
      setRecu(await api.deposerCandidature(corps));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'envoi a échoué.");
    } finally {
      setBusy(false);
    }
  }

  async function suivre() {
    if (!reference.trim() || !ouverture?.annee_id) return;
    setErreurSuivi(null);
    setSuivi(null);
    try {
      setSuivi(await api.suivreCandidature(reference.trim(), ouverture.annee_id));
    } catch (e) {
      setErreurSuivi(e instanceof Error ? e.message : "Dossier introuvable.");
    }
  }

  function champs(liste: Champ[]) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {liste.map((c) => (
          <label key={c.cle} className="block">
            <span className="mb-1 block text-label-md text-on-surface-variant">
              {c.libelle}
              {c.requis && <span className="text-error"> *</span>}
            </span>
            <input
              className={CHAMP}
              type={c.type ?? "text"}
              value={valeurs[c.cle] ?? ""}
              onChange={(e) => setValeurs((v) => ({ ...v, [c.cle]: e.target.value }))}
            />
            {c.aide && <span className="mt-0.5 block text-label-sm text-outline">{c.aide}</span>}
          </label>
        ))}
      </div>
    );
  }

  if (introuvable) {
    return (
      <Coquille>
        <p className="text-body-md text-on-surface-variant">
          Cette adresse ne correspond à aucun établissement.
        </p>
      </Coquille>
    );
  }

  if (!ouverture) {
    return (
      <Coquille>
        <p className="text-body-sm text-on-surface-variant">Chargement…</p>
      </Coquille>
    );
  }

  // ── Le reçu remplace tout : c'est la seule chose que le candidat emporte ──
  if (recu) {
    return (
      <Recu
        recu={recu}
        etablissement={ouverture.etablissement_libelle}
        annee={ouverture.annee_libelle ?? ""}
        lienSuivi={lienSuivi}
        valeurs={valeurs}
        premier={unite(premier)}
        second={unite(second)}
        parcours={parcours}
      />
    );
  }

  return (
    <Coquille titre={ouverture.etablissement_libelle}>
      <section className="mb-6 rounded-2xl border border-outline-soft bg-surface-container-low p-4">
        <h2 className="text-body-md font-semibold text-on-surface">
          Vous avez déjà déposé un dossier ?
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            className={`${CHAMP} max-w-[16rem]`}
            placeholder="Votre numéro de référence"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void suivre()}
          />
          <button
            type="button"
            onClick={() => void suivre()}
            disabled={!reference.trim() || !ouverture.annee_id}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-outline-soft px-4 text-body-sm text-on-surface transition-colors hover:bg-surface-container disabled:opacity-40"
          >
            <SearchOutlined style={{ fontSize: 18 }} />
            Suivre
          </button>
        </div>
        {erreurSuivi && <p className="mt-2 text-body-sm text-error">{erreurSuivi}</p>}
        {suivi && (
          <div className="mt-3 rounded-xl bg-surface-container-lowest p-3">
            <p className="text-body-sm text-on-surface">
              <span className="font-mono">{suivi.reference}</span> — {suivi.statut_libelle}
            </p>
            {suivi.motif && (
              <p className="mt-1 text-body-sm text-on-surface-variant">{suivi.motif}</p>
            )}
          </div>
        )}
      </section>

      {!ouverture.ouvertes ? (
        <div className="rounded-2xl border border-dashed border-outline-soft p-8 text-center">
          <p className="text-title-sm text-on-surface">Les dépôts sont fermés</p>
          <p className="mx-auto mt-1 max-w-[52ch] text-body-sm text-on-surface-variant">
            {ouverture.raison}
          </p>
        </div>
      ) : (
        <>
          {/* La progression. Sans elle, une saisie en étapes est une suite
              d'écrans dont on ignore la longueur — et l'on abandonne au
              troisième. */}
          <ol className="mb-4 flex flex-wrap gap-1.5">
            {ETAPES.map((e, i) => (
              <li key={e.cle} className="flex-1 min-w-[5rem]">
                <button
                  type="button"
                  // On revient en arrière librement ; on n'avance qu'en
                  // validant, sinon l'étape sautée manquerait sans le dire.
                  disabled={i > etape}
                  onClick={() => setEtape(i)}
                  className={`w-full rounded-lg px-2 py-1.5 text-left text-label-md transition-colors ${
                    i === etape
                      ? "bg-primary text-on-primary"
                      : i < etape
                        ? "bg-secondary/15 text-secondary hover:bg-secondary/25"
                        : "bg-surface-container text-outline"
                  }`}
                >
                  <span className="block text-label-sm opacity-80">
                    {i + 1}/{ETAPES.length}
                  </span>
                  <span className="block truncate">{e.titre}</span>
                </button>
              </li>
            ))}
          </ol>

          <section className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <h2 className="text-title-sm text-on-surface">{ETAPES[etape]!.titre}</h2>

            <div className="mt-4">
              {etape === 0 && (
                <>
                  <p className="mb-3 text-body-sm text-on-surface-variant">
                    Année académique {ouverture.annee_libelle}.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <span className="mb-1 block text-label-md text-on-surface-variant">
                        Filière demandée <span className="text-error">*</span>
                      </span>
                      <SearchSelect<UniteOuverte>
                        fetchOptions={chercherUnite}
                        value={premier}
                        onChange={(v) => setPremier(v ? Number(v) : null)}
                        getOptionLabel={(u) => libelleAvecParents(u.chemin_libelles)}
                        placeholder="Chercher une filière…"
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-label-md text-on-surface-variant">
                        Second choix
                      </span>
                      <SearchSelect<UniteOuverte>
                        fetchOptions={chercherUnite}
                        value={second}
                        onChange={(v) => setSecond(v ? Number(v) : null)}
                        getOptionLabel={(u) => libelleAvecParents(u.chemin_libelles)}
                        placeholder="Facultatif"
                      />
                    </div>
                  </div>
                </>
              )}

              {etape === 1 && (
                <>
                  {champs(IDENTITE)}
                  <div className="mt-4">
                    <span className="mb-1 block text-label-md text-on-surface-variant">Sexe</span>
                    <div className="flex gap-2">
                      {[
                        { valeur: "M", libelle: "Masculin" },
                        { valeur: "F", libelle: "Féminin" },
                      ].map((s) => (
                        <button
                          key={s.valeur}
                          type="button"
                          onClick={() => setValeurs((v) => ({ ...v, sexe: s.valeur }))}
                          className={`h-10 rounded-lg border px-4 text-body-sm transition-colors ${
                            valeurs.sexe === s.valeur
                              ? "border-primary bg-primary text-on-primary"
                              : "border-outline-soft text-on-surface-variant hover:bg-surface-container"
                          }`}
                        >
                          {s.libelle}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {etape === 2 && champs(CONTACT)}
              {etape === 3 && champs(FAMILLE)}

              {etape === 4 && (
                <>
                  {champs(DIPLOME)}
                  <TableauParcours lignes={parcours} onChange={setParcours} />
                </>
              )}

              {etape === 5 && (
                <Recapitulatif
                  annee={ouverture.annee_libelle ?? ""}
                  premier={unite(premier)}
                  second={unite(second)}
                  valeurs={valeurs}
                  parcours={parcours}
                  onCorriger={(i) => setEtape(i)}
                />
              )}
            </div>

            {erreur && (
              <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
                {erreur}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-outline-soft pt-4">
              <button
                type="button"
                onClick={reculer}
                disabled={etape === 0}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-outline-soft px-4 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-30"
              >
                <ArrowBackOutlined style={{ fontSize: 17 }} />
                Retour
              </button>

              {etape < ETAPES.length - 1 ? (
                <button
                  type="button"
                  onClick={avancer}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-5 text-body-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
                >
                  Continuer
                  <ArrowForwardOutlined style={{ fontSize: 17 }} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void envoyer()}
                  className="inline-flex h-11 items-center rounded-lg bg-primary px-6 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {busy ? "Envoi…" : "Envoyer ma candidature"}
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </Coquille>
  );
}

/** Les études antérieures, ligne par ligne.
 *
 *  Un tableau et non des champs fixes : un candidat a fait quatre ans
 *  d'humanités, un autre deux ans de supérieur avant de se réorienter. Fixer le
 *  nombre de lignes obligerait à choisir un parcours type — et à écarter les
 *  autres.
 */
function TableauParcours({
  lignes,
  onChange,
}: {
  lignes: LigneParcours[];
  onChange: (l: LigneParcours[]) => void;
}) {
  function modifier(index: number, champ: keyof LigneParcours, valeur: string) {
    onChange(lignes.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)));
  }

  return (
    <div className="mt-6 border-t border-outline-soft pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-body-md font-semibold text-on-surface">Parcours antérieur</h3>
          <p className="mt-0.5 max-w-[60ch] text-label-md text-outline">
            Les écoles fréquentées avant celle-ci, de la plus ancienne à la plus récente.
            Laissez vide si vous n&apos;en avez pas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...lignes, ligneVide()])}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
        >
          <AddOutlined style={{ fontSize: 16 }} />
          Ajouter une ligne
        </button>
      </div>

      {lignes.length === 0 ? (
        <p className="mt-3 rounded-xl bg-surface-container-low px-3 py-4 text-center text-body-sm text-on-surface-variant">
          Aucune ligne. « Ajouter une ligne » pour décrire une école fréquentée.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {lignes.map((ligne, i) => (
            <div key={i} className="rounded-xl border border-outline-soft p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  {NATURES.map((n) => (
                    <button
                      key={n.valeur}
                      type="button"
                      onClick={() => modifier(i, "nature", n.valeur)}
                      className={`h-8 rounded-lg border px-3 text-label-md transition-colors ${
                        ligne.nature === n.valeur
                          ? "border-primary bg-primary text-on-primary"
                          : "border-outline-soft text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      {n.libelle}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  aria-label={`Retirer la ligne ${i + 1}`}
                  onClick={() => onChange(lignes.filter((_, n) => n !== i))}
                  className="text-outline transition-colors hover:text-error"
                >
                  <DeleteOutlineOutlined style={{ fontSize: 18 }} />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className={CHAMP}
                  placeholder="Année (ex. 2024-2025)"
                  value={ligne.annee}
                  onChange={(e) => modifier(i, "annee", e.target.value)}
                />
                <input
                  className={CHAMP}
                  placeholder="Établissement"
                  value={ligne.etablissement}
                  onChange={(e) => modifier(i, "etablissement", e.target.value)}
                />
                <input
                  className={CHAMP}
                  placeholder="Section / option"
                  value={ligne.section}
                  onChange={(e) => modifier(i, "section", e.target.value)}
                />
                <input
                  className={CHAMP}
                  placeholder="Document obtenu"
                  value={ligne.document_obtenu}
                  onChange={(e) => modifier(i, "document_obtenu", e.target.value)}
                />
                <input
                  className={CHAMP}
                  type="number"
                  placeholder="Pourcentage"
                  value={ligne.pourcentage}
                  onChange={(e) => modifier(i, "pourcentage", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TOUS_LES_CHAMPS = [...IDENTITE, ...CONTACT, ...FAMILLE, ...DIPLOME];

function lignesRemplies(valeurs: Record<string, string>, liste: Champ[]) {
  return liste
    .map((c) => ({ libelle: c.libelle, valeur: (valeurs[c.cle] ?? "").trim() }))
    .filter((l) => l.valeur);
}

/** Ce qui part. Montré AVANT l'envoi, parce qu'on ne corrige pas une
 *  candidature après coup — et que la corriger par téléphone coûte un
 *  déplacement au candidat. */
function Recapitulatif({
  annee,
  premier,
  second,
  valeurs,
  parcours,
  onCorriger,
}: {
  annee: string;
  premier: UniteOuverte | null;
  second: UniteOuverte | null;
  valeurs: Record<string, string>;
  parcours: LigneParcours[];
  onCorriger: (etape: number) => void;
}) {
  const groupes: { titre: string; etape: number; lignes: { libelle: string; valeur: string }[] }[] =
    [
      {
        titre: "Votre choix",
        etape: 0,
        lignes: [
          { libelle: "Année", valeur: annee },
          {
            libelle: "Filière demandée",
            valeur: premier ? libelleAvecParents(premier.chemin_libelles) : "—",
          },
          ...(second
            ? [{ libelle: "Second choix", valeur: libelleAvecParents(second.chemin_libelles) }]
            : []),
        ],
      },
      {
        titre: "Votre identité",
        etape: 1,
        lignes: [
          ...lignesRemplies(valeurs, IDENTITE),
          ...(valeurs.sexe
            ? [{ libelle: "Sexe", valeur: valeurs.sexe === "M" ? "Masculin" : "Féminin" }]
            : []),
        ],
      },
      { titre: "Vous joindre", etape: 2, lignes: lignesRemplies(valeurs, CONTACT) },
      { titre: "Votre famille", etape: 3, lignes: lignesRemplies(valeurs, FAMILLE) },
      { titre: "Vos études", etape: 4, lignes: lignesRemplies(valeurs, DIPLOME) },
    ];

  return (
    <div className="space-y-4">
      <p className="text-body-sm text-on-surface-variant">
        Relisez : une fois envoyée, une candidature ne se corrige plus depuis cette page.
      </p>

      {groupes.map((g) => (
        <div key={g.titre} className="rounded-xl border border-outline-soft p-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-body-md font-semibold text-on-surface">{g.titre}</h3>
            <button
              type="button"
              onClick={() => onCorriger(g.etape)}
              className="text-label-md text-primary hover:underline"
            >
              Corriger
            </button>
          </div>
          {g.lignes.length === 0 ? (
            <p className="mt-1 text-label-md text-outline">Rien de renseigné.</p>
          ) : (
            <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {g.lignes.map((l) => (
                <div key={l.libelle} className="flex gap-2 text-body-sm">
                  <dt className="text-on-surface-variant">{l.libelle} :</dt>
                  <dd className="min-w-0 flex-1 truncate text-on-surface">{l.valeur}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      ))}

      <div className="rounded-xl border border-outline-soft p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-body-md font-semibold text-on-surface">Parcours antérieur</h3>
          <button
            type="button"
            onClick={() => onCorriger(4)}
            className="text-label-md text-primary hover:underline"
          >
            Corriger
          </button>
        </div>
        {parcours.length === 0 ? (
          <p className="mt-1 text-label-md text-outline">Aucune ligne.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-body-sm text-on-surface">
            {parcours.map((l, i) => (
              <li key={i}>
                {[
                  l.nature === "SUPERIEUR" ? "Supérieur" : "Humanités",
                  l.annee,
                  l.etablissement,
                  l.section,
                  l.document_obtenu,
                  l.pourcentage && `${l.pourcentage} %`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Le reçu, et le document à emporter.
 *
 *  Le téléchargement passe par l'impression du navigateur (« Enregistrer au
 *  format PDF »), et non par un fichier servi par le serveur. C'est délibéré :
 *  le suivi public est volontairement pauvre — il ne rend ni identité, ni
 *  dossier — et ouvrir une route qui rendrait le formulaire complet à qui
 *  connaît une référence annulerait cette discipline. Ce document se fabrique
 *  donc dans le navigateur qui vient de le saisir, et nulle part ailleurs.
 */
function Recu({
  recu,
  etablissement,
  annee,
  lienSuivi,
  valeurs,
  premier,
  second,
  parcours,
}: {
  recu: RecuCandidature;
  etablissement: string;
  annee: string;
  lienSuivi: string;
  valeurs: Record<string, string>;
  premier: UniteOuverte | null;
  second: UniteOuverte | null;
  parcours: LigneParcours[];
}) {
  return (
    <div className="min-h-screen bg-surface">
      <style>{`
        @media print {
          .sans-impression { display: none !important; }
          .a-imprimer { display: block !important; }
          body { background: #fff; }
        }
      `}</style>

      <div className="sans-impression mx-auto max-w-[860px] p-4 md:p-8">
        <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-6 text-center">
          <CheckCircleOutlined style={{ fontSize: 42 }} className="text-secondary" />
          <p className="mt-2 text-title-sm text-on-surface">Votre dossier est enregistré</p>
          <p className="mx-auto mt-3 max-w-[46ch] text-body-sm text-on-surface-variant">
            Conservez ce numéro : c&apos;est avec lui, et lui seul, que vous suivrez votre
            candidature.
          </p>
          <p className="mt-4 select-all rounded-xl bg-surface-container px-4 py-3 font-mono text-headline-sm text-on-surface">
            {recu.reference}
          </p>
          <p className="mt-3 text-label-md text-outline">{recu.statut_libelle}</p>

          {lienSuivi && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <CodeQR valeur={lienSuivi} taille={148} />
              <p className="max-w-[40ch] text-label-md text-outline">
                Scannez ce code pour revenir suivre votre dossier, sans retaper le numéro.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            <PrintOutlined style={{ fontSize: 19 }} />
            Télécharger mon formulaire
          </button>
          <p className="mx-auto mt-2 max-w-[46ch] text-label-md text-outline">
            Choisissez « Enregistrer au format PDF » dans la fenêtre d&apos;impression.
          </p>
        </div>
      </div>

      {/* Le document lui-même — invisible à l'écran, seul visible à l'impression. */}
      <FormulaireImprimable
        recu={recu}
        etablissement={etablissement}
        annee={annee}
        lienSuivi={lienSuivi}
        valeurs={valeurs}
        premier={premier}
        second={second}
        parcours={parcours}
      />
    </div>
  );
}

function FormulaireImprimable({
  recu,
  etablissement,
  annee,
  lienSuivi,
  valeurs,
  premier,
  second,
  parcours,
}: {
  recu: RecuCandidature;
  etablissement: string;
  annee: string;
  lienSuivi: string;
  valeurs: Record<string, string>;
  premier: UniteOuverte | null;
  second: UniteOuverte | null;
  parcours: LigneParcours[];
}) {
  const remplis = lignesRemplies(valeurs, TOUS_LES_CHAMPS);

  return (
    <div className="a-imprimer hidden bg-white p-8 text-black">
      <div className="flex items-start justify-between gap-6 border-b border-black/20 pb-4">
        <div>
          <p className="text-xl font-bold">{etablissement}</p>
          <p className="mt-1 text-sm">Demande d&apos;inscription — année {annee}</p>
          <p className="mt-3 text-sm">
            Référence : <span className="font-mono text-lg font-bold">{recu.reference}</span>
          </p>
          <p className="text-xs">Déposée le {recu.soumis_le.slice(0, 10)}</p>
        </div>
        {lienSuivi && (
          <div className="text-center">
            <CodeQR valeur={lienSuivi} taille={110} />
            <p className="mt-1 text-[10px]">Suivi du dossier</p>
          </div>
        )}
      </div>

      <p className="mt-4 text-sm font-bold">Choix</p>
      <p className="text-sm">
        Filière : {premier ? libelleAvecParents(premier.chemin_libelles) : "—"}
        {second ? ` · Second choix : ${libelleAvecParents(second.chemin_libelles)}` : ""}
      </p>

      <p className="mt-4 text-sm font-bold">Dossier</p>
      <table className="mt-1 w-full text-sm">
        <tbody>
          {remplis.map((l) => (
            <tr key={l.libelle} className="align-top">
              <td className="w-[38%] py-0.5 pr-3">{l.libelle}</td>
              <td className="py-0.5 font-medium">{l.valeur}</td>
            </tr>
          ))}
          {valeurs.sexe && (
            <tr>
              <td className="py-0.5 pr-3">Sexe</td>
              <td className="py-0.5 font-medium">
                {valeurs.sexe === "M" ? "Masculin" : "Féminin"}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {parcours.length > 0 && (
        <>
          <p className="mt-4 text-sm font-bold">Parcours antérieur</p>
          <table className="mt-1 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/30 text-left">
                <th className="py-1 pr-2 font-semibold">Nature</th>
                <th className="py-1 pr-2 font-semibold">Année</th>
                <th className="py-1 pr-2 font-semibold">Établissement</th>
                <th className="py-1 pr-2 font-semibold">Section</th>
                <th className="py-1 pr-2 font-semibold">Document</th>
                <th className="py-1 font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {parcours.map((l, i) => (
                <tr key={i} className="border-b border-black/10">
                  <td className="py-1 pr-2">
                    {l.nature === "SUPERIEUR" ? "Supérieur" : "Humanités"}
                  </td>
                  <td className="py-1 pr-2">{l.annee}</td>
                  <td className="py-1 pr-2">{l.etablissement}</td>
                  <td className="py-1 pr-2">{l.section}</td>
                  <td className="py-1 pr-2">{l.document_obtenu}</td>
                  <td className="py-1">{l.pourcentage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <p className="mt-6 text-xs">
        Ce document atteste du dépôt, non de l&apos;admission. Conservez la référence
        {" "}
        {recu.reference} : elle est le seul moyen de suivre ce dossier.
      </p>
    </div>
  );
}

function Coquille({ titre, children }: { titre?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto max-w-[860px] p-4 md:p-8">
        <header className="mb-6">
          <p className="font-display text-headline-sm text-on-surface">{titre ?? "Candidature"}</p>
          <p className="mt-1 text-body-sm text-on-surface-variant">Demande d&apos;inscription</p>
        </header>
        {children}
      </div>
    </div>
  );
}
