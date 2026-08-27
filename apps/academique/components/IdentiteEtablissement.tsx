"use client";

import { useEffect, useState } from "react";

import { api, type Etablissement } from "@/app/lib/api";
import { BOUTON, CHAMP, Carte, Erreur } from "@/components/Bloc";

/** L'identité de l'établissement — nom, coordonnées, numéros légaux.
 *
 *  **Elle vit dans les paramètres, et nulle part ailleurs.** L'établissement ne
 *  se crée pas : il naît quand le workspace active Academia, au nom du
 *  workspace. Ce qui reste à faire ici est de le corriger — un nom d'usage
 *  différent du nom de l'espace, une adresse, les numéros qu'une attestation
 *  ou un relevé de notes doit porter.
 *
 *  Les identifiants légaux sont du **texte libre**, jamais validés par un
 *  format : un RCCM s'écrit « CD/KIN/RCCM/22-B-01234 », plusieurs portent des
 *  zéros de tête, et chaque pays a sa forme. Refuser une valeur exacte parce
 *  qu'elle ne ressemble pas à celle du voisin coûte plus cher qu'accepter une
 *  coquille — qui, elle, se corrige ici en dix secondes.
 */

type Champ = keyof Etablissement;

const IDENTITE: { cle: Champ; libelle: string; aide?: string }[] = [
  { cle: "nom", libelle: "Nom officiel" },
  { cle: "sigle", libelle: "Sigle", aide: "Ex. ISP, ISC, UNIKIN" },
  {
    cle: "slug",
    libelle: "Nom court (adresse publique)",
    aide: "Sert dans le lien de candidature : /candidature/isp-gombe. Normalisé à l'enregistrement.",
  },
];

const CONTACT: { cle: Champ; libelle: string; aide?: string }[] = [
  { cle: "adresse", libelle: "Adresse" },
  { cle: "ville", libelle: "Ville" },
  { cle: "boite_postale", libelle: "Boîte postale" },
  { cle: "telephone", libelle: "Téléphone" },
  { cle: "email", libelle: "Email" },
  { cle: "site_web", libelle: "Site web" },
];

const LEGAL: { cle: Champ; libelle: string; aide?: string }[] = [
  { cle: "rccm", libelle: "RCCM", aide: "Registre du commerce et du crédit mobilier" },
  { cle: "id_national", libelle: "ID. NAT.", aide: "Identification nationale" },
  { cle: "nif", libelle: "NIF", aide: "Numéro d'identification fiscale" },
  {
    cle: "numero_autorisation",
    libelle: "Autorisation de fonctionnement",
    aide: "Arrêté ou agrément ministériel",
  },
];

export function IdentiteEtablissement({
  etablissement,
  peutModifier,
  onEnregistre,
}: {
  etablissement: Etablissement;
  peutModifier: boolean;
  onEnregistre: (message: string) => void;
}) {
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const depart: Record<string, string> = {};
    for (const { cle } of [...IDENTITE, ...CONTACT, ...LEGAL]) {
      depart[cle] = (etablissement[cle] as string | null) ?? "";
    }
    setValeurs(depart);
  }, [etablissement]);

  const modifie = [...IDENTITE, ...CONTACT, ...LEGAL].some(
    ({ cle }) => (valeurs[cle] ?? "") !== (((etablissement[cle] as string | null) ?? "")),
  );

  async function enregistrer() {
    if (!valeurs.nom?.trim()) {
      setErreur("Un établissement a besoin d'un nom.");
      return;
    }
    setBusy(true);
    setErreur(null);
    try {
      const corps: Record<string, unknown> = {};
      for (const { cle } of [...IDENTITE, ...CONTACT, ...LEGAL]) {
        const propre = (valeurs[cle] ?? "").trim();
        // Vidé à l'écran = vidé en base : on envoie `null`, pas la chaîne
        // vide. Sinon un NIF effacé resterait « renseigné, mais vide ».
        corps[cle] = propre || (cle === "nom" ? valeurs.nom.trim() : null);
      }
      await api.modifierEtablissement(etablissement.id, corps);
      onEnregistre("Identité de l'établissement enregistrée.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  function ligne({ cle, libelle, aide }: { cle: Champ; libelle: string; aide?: string }) {
    return (
      <label key={cle} className="block">
        <span className="mb-1 block text-label-md text-on-surface-variant">{libelle}</span>
        <input
          className={`${CHAMP} w-full`}
          value={valeurs[cle] ?? ""}
          disabled={!peutModifier || busy}
          onChange={(e) => setValeurs((v) => ({ ...v, [cle]: e.target.value }))}
        />
        {aide && <span className="mt-0.5 block text-label-sm text-outline">{aide}</span>}
      </label>
    );
  }

  return (
    <Carte
      titre="Établissement"
      sousTitre="Ce que porteront les attestations, relevés et documents officiels. L'établissement est créé à l'activation d'Academia, au nom de l'espace de travail — c'est ici qu'on le corrige."
    >
      <div className="space-y-4 p-4">
        <Erreur message={erreur} />

        <div className="grid gap-3 md:grid-cols-2">{IDENTITE.map(ligne)}</div>

        <div>
          <p className="mb-2 text-label-md font-semibold text-on-surface">Coordonnées</p>
          <div className="grid gap-3 md:grid-cols-2">{CONTACT.map(ligne)}</div>
        </div>

        <div>
          <p className="mb-2 text-label-md font-semibold text-on-surface">
            Identifiants légaux
          </p>
          <div className="grid gap-3 md:grid-cols-2">{LEGAL.map(ligne)}</div>
        </div>

        {peutModifier && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={BOUTON}
              disabled={busy || !modifie}
              onClick={() => void enregistrer()}
            >
              Enregistrer
            </button>
            {modifie && (
              <span className="text-label-md text-outline">Modifications non enregistrées.</span>
            )}
          </div>
        )}
      </div>
    </Carte>
  );
}
