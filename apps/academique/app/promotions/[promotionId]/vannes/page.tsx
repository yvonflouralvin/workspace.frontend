"use client";

import { useCallback, useEffect, useState } from "react";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { Switch } from "@repo/ui/Switch";
import { api, type Vanne } from "@/app/lib/api";
import { Carte, Erreur, Pastille, Vide } from "@/components/Bloc";
import { usePromotion } from "../promotion-context";

/** Les vannes d'une promotion : qui peut écrire quoi, et depuis quand.
 *
 *  Chaque bascule est **datée et signée** : « qui a rouvert l'encodage le
 *  12 août ? » doit avoir une réponse, et c'est ici qu'elle se lit.
 *
 *  Le gel général neutralise les six autres — mais l'écran ne MENT pas : une
 *  vanne ouverte qu'il neutralise se lit « neutralisée », pas « fermée ». Dire
 *  « fermée » ferait chercher qui l'a fermée alors que personne ne l'a touchée.
 */
export default function VannesPage() {
  const { promotionId } = usePromotion();
  const { can } = usePermissions();
  const peutBasculer = can("academique.vannes.manage");

  const [vannes, setVannes] = useState<Vanne[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const charger = useCallback(async () => {
    try {
      setVannes(await api.vannes(promotionId));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setVannes([]);
    }
  }, [promotionId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function basculer(v: Vanne, ouverte: boolean) {
    setBusy(true);
    setErreur(null);
    try {
      // Le motif est facultatif côté serveur, mais il est demandé pour une
      // FERMETURE : c'est le geste qui bloque le travail des autres.
      const motif = ouverte
        ? undefined
        : window.prompt(`Pourquoi fermer « ${v.libelle} » ? (facultatif)`) ?? undefined;
      setVannes(await api.basculerVanne(promotionId, v.cle, ouverte, motif));
      setToast(ouverte ? "Vanne ouverte." : "Vanne fermée.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
      await charger();
    } finally {
      setBusy(false);
    }
  }

  const gel = vannes?.find((v) => v.cle === "modifications_bloquees");

  return (
    <div className="space-y-4">
      <Erreur message={erreur} />

      {gel?.ouverte && (
        <div className="rounded-xl border border-error/30 bg-error-container/30 px-3 py-2.5">
          <p className="text-body-sm font-medium text-on-surface">
            Cette promotion est gelée : plus aucune écriture ne passe, quelle que soit l&apos;autre
            vanne.
          </p>
          {gel.motif && (
            <p className="mt-0.5 text-label-md text-on-surface-variant">{gel.motif}</p>
          )}
        </div>
      )}

      <Carte
        titre="Vannes de la promotion"
        sousTitre="Chaque bascule garde sa date et son auteur."
      >
        {vannes === null ? (
          <Vide message="Chargement…" />
        ) : (
          <div className="divide-y divide-hairline">
            {vannes.map((v) => (
              <div key={v.cle} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm text-on-surface">{v.libelle}</p>
                  <p className="mt-0.5 text-label-md text-outline">
                    {v.change_le
                      ? `${v.ouverte ? "Ouverte" : "Fermée"} le ${new Date(
                          v.change_le
                        ).toLocaleDateString("fr-FR")}${
                          v.change_par ? ` par l'utilisateur ${v.change_par}` : ""
                        }${v.motif ? ` — ${v.motif}` : ""}`
                      : "Jamais ouverte"}
                  </p>
                </div>
                {v.neutralisee_par_le_gel && (
                  <Pastille
                    ton="alerte"
                    titre="Ouverte en propre, mais le gel général ne laisse rien passer"
                  >
                    neutralisée par le gel
                  </Pastille>
                )}
                <Switch
                  checked={v.ouverte}
                  disabled={!peutBasculer || busy}
                  label={v.libelle}
                  onChange={(next) => void basculer(v, next)}
                />
              </div>
            ))}
          </div>
        )}
      </Carte>

      {!peutBasculer && (
        <p className="text-body-sm text-on-surface-variant">
          Ouvrir l&apos;encodage engage la délibération : seule la direction académique le fait.
        </p>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
