"use client";

import { useState } from "react";
import { operationsApi, type Ressource, type TypeDef } from "@/lib/operations-api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** Le formulaire se CONSTRUIT depuis le catalogue du backend.
 *
 *  `champs` dit quelles colonnes réelles ce type utilise, `attributs` ce qui vit
 *  dans le JSON. Ajouter « Engin de chantier » côté backend fera apparaître son
 *  formulaire ici sans qu'on y touche — c'est tout l'intérêt d'un type qui est
 *  une donnée plutôt qu'une branche de code. */
export function FormulaireRessource({
  typeDef, ressource, onClose, onDone,
}: {
  typeDef: TypeDef;
  ressource: Ressource | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [libelle, setLibelle] = useState(ressource?.libelle ?? "");
  const [categorie, setCategorie] = useState(ressource?.categorie ?? "");
  const [capacite, setCapacite] = useState(ressource?.capacite?.toString() ?? "");
  const [reference, setReference] = useState(ressource?.reference ?? "");
  const [hebdo, setHebdo] = useState(ressource?.heures_hebdo_cible?.toString() ?? "");
  const [mensuel, setMensuel] = useState(ressource?.heures_mensuel_cible?.toString() ?? "");
  const [attributs, setAttributs] = useState<Record<string, string>>(
    Object.fromEntries(
      typeDef.attributs.map((a) => [a.cle, String(ressource?.attributs?.[a.cle] ?? "")]),
    ),
  );
  const [actif, setActif] = useState(ressource?.active ?? true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  const utilise = (champ: string) => typeDef.champs.includes(champ);

  async function envoyer() {
    if (!libelle.trim()) { setErreur("Le libellé est requis."); return; }
    if (capacite && Number.isNaN(Number(capacite))) { setErreur("La capacité doit être un nombre."); return; }
    setEnCours(true); setErreur(null);
    const corps: Record<string, unknown> = {
      libelle: libelle.trim(),
      categorie: categorie.trim() || null,
      capacite: utilise("capacite") && capacite ? Number(capacite) : null,
      reference: utilise("reference") ? reference.trim() || null : null,
      // Vide ≠ zéro : une cible absente veut dire « on ne juge pas », une cible
      // à 0 h voudrait dire « cette personne ne doit rien faire ».
      heures_hebdo_cible: utilise("heures_hebdo_cible") && hebdo.trim() ? Number(hebdo) : null,
      heures_mensuel_cible:
        utilise("heures_mensuel_cible") && mensuel.trim() ? Number(mensuel) : null,
      attributs: Object.fromEntries(Object.entries(attributs).filter(([, v]) => v.trim())),
      ...(ressource ? { active: actif } : { type: typeDef.cle }),
    };
    try {
      if (ressource) await operationsApi.modifierRessource(ressource.id, corps);
      else await operationsApi.creerRessource(corps);
      onDone();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally { setEnCours(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 animate-overlay-in">
      <div className="w-full max-w-[30rem] rounded-2xl bg-surface-container-lowest shadow-modal animate-pop-in">
        <div className="border-b border-outline-soft px-5 py-4">
          <h2 className="text-body-lg font-medium text-on-surface">
            {ressource ? `Modifier — ${ressource.nom_affiche}` : `Nouveau — ${typeDef.ressource_libelle}`}
          </h2>
        </div>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-5 py-4">
          {erreur && <p className="text-body-sm text-error">{erreur}</p>}

          {ressource?.employee_id && (
            <p className="rounded-lg bg-surface-container px-3 py-2 text-body-sm text-on-surface-variant">
              Cette ressource vient du module RH. Son identité s&apos;y modifie — ici, seuls
              les éléments propres à la planification.
            </p>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">
              {typeDef.ressource_libelle} *
            </span>
            <input value={libelle} onChange={(e) => setLibelle(e.target.value)} className={CHAMP} />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-label-md text-on-surface-variant">Catégorie</span>
            <input
              value={categorie}
              onChange={(e) => setCategorie(e.target.value)}
              placeholder={typeDef.cle === "PRESTATION" ? "Ex. : Agent de sécurité" : "Ex. : Auditoire"}
              className={CHAMP}
            />
          </label>

          {utilise("capacite") && (
            <label className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant">Capacité (places)</span>
              <input type="number" min={0} value={capacite} onChange={(e) => setCapacite(e.target.value)} className={CHAMP} />
            </label>
          )}

          {utilise("reference") && (
            <label className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant">
                {typeDef.cle === "VEHICULE" ? "Immatriculation" : "Référence / n° de série"}
              </span>
              <input value={reference} onChange={(e) => setReference(e.target.value)} className={CHAMP} />
            </label>
          )}

          {utilise("heures_hebdo_cible") && (
            <div className="rounded-xl border border-outline-soft p-3">
              <p className="text-label-md text-on-surface-variant">Charge attendue</p>
              <p className="mt-0.5 text-label-md text-outline">
                Laissé vide, aucun jugement n&apos;est porté sur cette ressource. Renseigné,
                son rythme réel y est comparé — avec une tolérance de ± 10 %.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-label-md text-on-surface-variant">Heures / semaine</span>
                  <input
                    type="number" min={0} step={0.5} value={hebdo}
                    onChange={(e) => setHebdo(e.target.value)}
                    placeholder="Ex. : 40" className={CHAMP}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-label-md text-on-surface-variant">Heures / mois</span>
                  <input
                    type="number" min={0} step={0.5} value={mensuel}
                    onChange={(e) => setMensuel(e.target.value)}
                    placeholder="Ex. : 173" className={CHAMP}
                  />
                </label>
              </div>
            </div>
          )}

          {typeDef.attributs.map((a) => (
            <label key={a.cle} className="flex flex-col gap-1">
              <span className="text-label-md text-on-surface-variant">{a.libelle}</span>
              {a.type === "choix" && a.options.length > 0 ? (
                <select
                  value={attributs[a.cle] ?? ""}
                  onChange={(e) => setAttributs({ ...attributs, [a.cle]: e.target.value })}
                  className={CHAMP}
                >
                  <option value="">—</option>
                  {a.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input
                  value={attributs[a.cle] ?? ""}
                  onChange={(e) => setAttributs({ ...attributs, [a.cle]: e.target.value })}
                  className={CHAMP}
                />
              )}
            </label>
          ))}

          {ressource && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />
              <span className="text-body-sm text-on-surface">Ressource active</span>
            </label>
          )}
          {ressource && !actif && (
            <p className="text-label-md text-on-surface-variant">
              Une ressource inactive garde ses affectations passées mais ne peut plus être planifiée.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-outline-soft px-5 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low">
            Annuler
          </button>
          <button type="button" disabled={enCours} onClick={envoyer} className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50">
            {enCours ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
