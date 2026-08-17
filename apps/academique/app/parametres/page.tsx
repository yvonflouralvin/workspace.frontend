"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Switch } from "@repo/ui/Switch";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { useContexte } from "@/app/lib/etablissement";
import { api, type Mention, type Parametre, type Periode } from "@/app/lib/api";
import { BOUTON, BOUTON_PLAT, CHAMP, Carte, Erreur, Pastille, Vide } from "@/components/Bloc";

/** Les réglages de l'établissement — NOMMÉS.
 *
 *  L'existant relevé les nommait par identifiant numérique (« 441 », « 1241 ») :
 *  un export était illisible et personne ne pouvait dire ce que valait le
 *  réglage 856. Ici chaque ligne porte sa clé, son libellé et sa raison d'être ;
 *  un réglage laissé à son défaut se distingue d'un réglage choisi.
 */
export default function ParametresPage() {
  const { can } = usePermissions();
  const contexte = useContexte();
  const peutRegler = can("academique.parametres.manage");
  const peutStructurer = can("academique.structure.manage");

  const [parametres, setParametres] = useState<Parametre[] | null>(null);
  const [periodes, setPeriodes] = useState<Periode[]>([]);
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const etab = contexte.etablissement?.id ?? null;

  const charger = useCallback(async () => {
    if (!etab) return;
    try {
      setParametres(await api.parametres(etab));
      setPeriodes(await api.periodes(etab));
      setMentions(await api.mentions(etab));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setParametres([]);
    }
  }, [etab]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function ecrire(cle: string, valeur: string) {
    if (!etab) return;
    setBusy(true);
    setErreur(null);
    try {
      await api.ecrireParametre(etab, cle, valeur);
      setToast("Réglage enregistré.");
      await charger();
    } catch (e) {
      // Une valeur mal formée est REFUSÉE, jamais rabattue en silence : le
      // message du serveur dit ce qu'il attendait.
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
      await charger();
    } finally {
      setBusy(false);
    }
  }

  const groupes = useMemo(() => {
    const par = new Map<string, Parametre[]>();
    for (const p of parametres ?? []) par.set(p.groupe, [...(par.get(p.groupe) ?? []), p]);
    return [...par.entries()];
  }, [parametres]);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[900px] space-y-4 p-4 md:p-8">
        <div>
          <h1 className="font-display text-headline-md text-on-surface">Paramètres</h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            {contexte.etablissement?.nom ?? "Établissement"}
          </p>
        </div>

        <Erreur message={erreur} />

        {parametres === null ? (
          <p className="text-body-sm text-on-surface-variant">Chargement…</p>
        ) : (
          groupes.map(([groupe, lignes]) => (
            <Carte key={groupe} titre={groupe}>
              <div className="divide-y divide-hairline">
                {lignes.map((p) => (
                  <div key={p.cle} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm text-on-surface">
                        {p.libelle}
                        {/* Un réglage laissé à son défaut se distingue d'un
                            réglage choisi : sinon on ne sait pas ce qui a été
                            décidé et ce qui n'a jamais été touché. */}
                        {!p.personnalise && (
                          <Pastille ton="neutre" titre="Valeur par défaut, jamais modifiée">
                            défaut
                          </Pastille>
                        )}
                      </p>
                      {p.description && (
                        <p className="mt-0.5 text-label-md text-outline">{p.description}</p>
                      )}
                      <p className="mt-0.5 font-mono text-label-sm text-outline">{p.cle}</p>
                    </div>
                    {p.type === "booleen" ? (
                      <Switch
                        checked={p.valeur === "oui"}
                        disabled={!peutRegler || busy}
                        label={p.libelle}
                        onChange={(next) => void ecrire(p.cle, next ? "oui" : "non")}
                      />
                    ) : (
                      <input
                        aria-label={p.libelle}
                        type={p.type === "entier" ? "number" : "text"}
                        min={0}
                        disabled={!peutRegler || busy}
                        defaultValue={p.valeur}
                        onBlur={(e) => {
                          if (e.target.value !== p.valeur) void ecrire(p.cle, e.target.value);
                        }}
                        className={`${CHAMP} w-[8rem] text-right tabular-nums`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Carte>
          ))
        )}

        <Carte
          titre="Périodes de l'année"
          sousTitre="L'établissement les nomme : « PREMIER SEMESTRE » ici, « MI-SESSION » ailleurs."
        >
          {periodes.length === 0 ? (
            <Vide message="Aucune période." />
          ) : (
            <div className="divide-y divide-hairline">
              {periodes.map((p) => (
                <div key={p.rang} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-[6rem] flex-none text-label-md text-outline">
                    Rang {p.rang}
                  </span>
                  <input
                    aria-label={`Libellé de la période ${p.rang}`}
                    disabled={!peutStructurer || busy}
                    defaultValue={p.libelle}
                    onBlur={async (e) => {
                      if (!etab || e.target.value === p.libelle) return;
                      setBusy(true);
                      try {
                        await api.nommerPeriode(etab, p.rang, {
                          rang: p.rang,
                          libelle: e.target.value,
                        });
                        setToast("Période renommée.");
                        await charger();
                      } catch (x) {
                        setErreur(x instanceof Error ? x.message : "Enregistrement impossible.");
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className={`${CHAMP} min-w-0 flex-1`}
                  />
                  {p.id === 0 && (
                    <Pastille ton="neutre" titre="Nom implicite, jamais déclaré">
                      implicite
                    </Pastille>
                  )}
                </div>
              ))}
            </div>
          )}
        </Carte>

        <Carte
          titre="Barème des mentions"
          sousTitre="Du plus haut au plus bas, sur 20. Un barème vide ne donnerait de mention à personne."
        >
          <div className="divide-y divide-hairline">
            {mentions.map((m) => (
              <div key={`${m.libelle}-${m.seuil}`} className="flex items-center gap-3 px-4 py-2">
                <span className="min-w-0 flex-1 text-body-sm text-on-surface">{m.libelle}</span>
                <span className="text-label-md tabular-nums text-on-surface-variant">
                  à partir de {m.seuil}/20
                </span>
                {!m.personnalise && <Pastille ton="neutre">défaut</Pastille>}
              </div>
            ))}
          </div>
        </Carte>

        {!peutRegler && (
          <p className="text-body-sm text-on-surface-variant">
            Ces réglages commandent la cotation et la délibération : seule la direction académique
            les modifie.
          </p>
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
