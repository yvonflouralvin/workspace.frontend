"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined } from "@mui/icons-material";
import { Switch } from "@repo/ui/Switch";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { sgrApi, type Campagne, type Responsable, type TypeDossier } from "@/app/lib/api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary";

/** Ce que le Secrétariat règle lui-même.
 *
 *  Ouvrir et fermer une campagne était, dans la plateforme d'origine, une page
 *  en dur qu'il fallait redéployer. C'est un réglage : celui qui décide de la
 *  fermeture doit pouvoir l'appliquer le jour où il la décide.
 */
export default function ParametresPage() {
  const { can } = usePermissions();
  const [types, setTypes] = useState<TypeDossier[]>([]);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nom, setNom] = useState("");
  const [fonction, setFonction] = useState("");

  const annee = new Date().getFullYear();

  const charger = useCallback(async () => {
    try {
      const [t, c, r] = await Promise.all([
        sgrApi.types(),
        sgrApi.campagnes(),
        sgrApi.responsables(),
      ]);
      setTypes(t);
      setCampagnes(c);
      setResponsables(r);
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  if (!can("sgr.referentiel.manage")) {
    return (
      <DashboardShell>
        <div className="mx-auto max-w-[1024px] p-4 md:p-8">
          <p className="text-body-md text-on-surface-variant">
            Ces réglages sont réservés au Secrétariat Général à la Recherche.
          </p>
        </div>
      </DashboardShell>
    );
  }

  async function basculer(type: TypeDossier, ouverte: boolean) {
    setBusy(true);
    try {
      await sgrApi.reglerCampagne({
        type_dossier: type.cle,
        annee,
        ouverte,
        message_fermeture: ouverte
          ? null
          : `Les demandes « ${type.libelle} » sont temporairement fermées.`,
      });
      setToast(ouverte ? "Campagne ouverte." : "Campagne fermée.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Réglage impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function ajouterResponsable() {
    if (!nom.trim() || !fonction.trim()) return;
    setBusy(true);
    try {
      await sgrApi.creerResponsable({
        nom: nom.trim(),
        fonction: fonction.trim(),
        position: responsables.length,
      });
      setNom("");
      setFonction("");
      setToast("Responsable ajouté.");
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Ajout impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[840px] p-4 md:p-8">
        <h1 className="font-display text-headline-sm text-on-surface">Paramètres</h1>
        <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
          Les campagnes ouvertes et les responsables joignables en rendez-vous.
        </p>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        <section className="mt-5 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <h2 className="text-body-md font-semibold text-on-surface">Campagnes {annee}</h2>
          <p className="mt-0.5 text-label-md text-outline">
            Fermer une campagne empêche les nouvelles demandes ; les dossiers en cours
            poursuivent leur instruction.
          </p>
          <div className="mt-3 divide-y divide-hairline">
            {types.map((type) => {
              const campagne = campagnes.find(
                (c) => c.type_dossier === type.cle && c.annee === annee
              );
              const ouverte = campagne ? campagne.ouverte : true;
              return (
                <div key={type.cle} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-sm text-on-surface">{type.libelle}</span>
                    <span className="block text-label-md text-outline">
                      {type.pieces.length} pièce{type.pieces.length > 1 ? "s" : ""} au catalogue
                    </span>
                  </span>
                  <Switch
                    checked={ouverte}
                    disabled={busy}
                    onChange={(v) => basculer(type, v)}
                    aria-label={`Campagne ${type.libelle}`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
          <h2 className="text-body-md font-semibold text-on-surface">Responsables</h2>
          <p className="mt-0.5 text-label-md text-outline">
            Les personnes qu&apos;un candidat peut solliciter pour un rendez-vous.
          </p>
          <ul className="mt-3 divide-y divide-hairline">
            {responsables.map((r) => (
              <li key={r.id} className="py-2 text-body-sm text-on-surface">
                {r.fonction}
                <span className="text-on-surface-variant"> — {r.nom}</span>
                {!r.actif && <span className="ml-2 text-label-md text-outline">(inactif)</span>}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline-soft pt-3">
            <input
              className={`${CHAMP} w-[200px]`}
              placeholder="Nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
            />
            <input
              className={`${CHAMP} min-w-[220px] flex-1`}
              placeholder="Fonction (ex. Assistant Principal du SGR)"
              value={fonction}
              onChange={(e) => setFonction(e.target.value)}
            />
            <button
              type="button"
              disabled={busy || !nom.trim() || !fonction.trim()}
              onClick={ajouterResponsable}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Ajouter
            </button>
          </div>
        </section>

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </DashboardShell>
  );
}
