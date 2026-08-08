"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BoltOutlined,
  PlayArrowOutlined,
  StopOutlined,
} from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { FeuilleBas } from "@repo/ui/FeuilleBas";
import { Toast } from "@repo/ui/Toast";
import { DialogueDemarrage } from "@/components/groupes/DialogueDemarrage";
import { operationsApi, type GroupeElectrogene } from "@/lib/operations-api";

/** Le parc des groupes, et ce qui tourne.
 *
 *  « En marche » n'est pas un état stocké : il se lit de l'usage ouvert. Un
 *  drapeau séparé finirait par mentir le jour où quelqu'un arrête un groupe
 *  sans passer par l'écran. */
export function PanneauGroupes() {
  const { can } = usePermissions();
  const peutGerer = can("operations.groupes.manage");

  const [groupes, setGroupes] = useState<GroupeElectrogene[] | null>(null);
  const [demarrage, setDemarrage] = useState<GroupeElectrogene | null>(null);
  // Sur mobile, un tableau qui déborde oblige à faire défiler horizontalement
  // pour atteindre « Démarrer » — geste qu'on ne découvre pas tout seul. La
  // liste y devient une simple pile, et le détail monte du bas.
  const [ouvert, setOuvert] = useState<GroupeElectrogene | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setGroupes(await operationsApi.groupesElectrogenes());
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setGroupes([]);
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function arreter(g: GroupeElectrogene) {
    if (!g.usage_ouvert_id) return;
    setEnCours(true);
    try {
      await operationsApi.arreterGroupe(g.usage_ouvert_id);
      setToast(`« ${g.nom} » arrêté.`);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Arrêt impossible.");
    } finally {
      setEnCours(false);
    }
  }

  const enMarche = (groupes ?? []).filter((g) => g.en_marche);

  return (
    <>
      <div className="p-4 md:p-8">
        <div>
          <h1 className="font-display text-headline-md text-on-surface">Groupes électrogènes</h1>
          <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
            Le parc et son état. Les groupes se créent depuis Plannings › Ressources, comme
            ressources de type « Groupe électrogène ».
          </p>
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {enMarche.length > 0 && (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-3 py-1 text-label-md text-secondary">
            <BoltOutlined style={{ fontSize: 14 }} />
            {enMarche.length} groupe{enMarche.length > 1 ? "s" : ""} en marche
          </p>
        )}

        {groupes === null ? (
          <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : groupes.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
            <BoltOutlined style={{ fontSize: 28 }} className="text-outline" />
            <p className="mt-2 text-body-md text-on-surface">Aucun groupe électrogène.</p>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              Créez-en depuis Plannings › Ressources, en choisissant la nature « Groupes
              électrogènes ».
            </p>
          </div>
        ) : (
          <>
          <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-outline-soft bg-surface-container-lowest md:block">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-soft bg-surface-row-alt">
                  <Th>Groupe</Th>
                  <Th>N° de série</Th>
                  <Th align="right">Réservoir</Th>
                  <Th align="right">Carburant reçu</Th>
                  <Th>État</Th>
                  {peutGerer && <Th align="right">Action</Th>}
                </tr>
              </thead>
              <tbody>
                {groupes.map((g) => (
                  <tr
                    key={g.id}
                    className={`border-b border-hairline last:border-b-0 hover:bg-surface-container-low ${
                      g.active ? "" : "opacity-60"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/ressources/${g.id}`}
                        className="text-body-sm font-medium text-on-surface hover:underline"
                      >
                        {g.nom}
                      </Link>
                      {sousTitre(g) && (
                        <p className="text-label-sm text-outline">{sousTitre(g)}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-body-sm text-on-surface-variant">
                      {g.reference ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-body-sm tabular-nums text-on-surface-variant">
                      {g.capacite ? `${g.capacite} L` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-body-sm tabular-nums text-on-surface-variant">
                      {g.carburant_recu} L
                    </td>
                    <td className="px-4 py-2.5">
                      {!g.active ? (
                        <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                          Hors service
                        </span>
                      ) : g.en_marche ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/15 px-2 py-0.5 text-label-sm text-secondary">
                          <BoltOutlined style={{ fontSize: 12 }} />
                          En marche depuis le{" "}
                          {new Date(g.depuis!).toLocaleString("fr-FR", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      ) : (
                        <span className="text-label-md text-on-surface-variant">À l&apos;arrêt</span>
                      )}
                    </td>
                    {peutGerer && (
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        {g.en_marche ? (
                          <button
                            type="button"
                            disabled={enCours}
                            onClick={() => void arreter(g)}
                            className="inline-flex items-center gap-1 text-label-md text-error disabled:opacity-50"
                          >
                            <StopOutlined style={{ fontSize: 16 }} />
                            Arrêter
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={enCours || !g.active}
                            onClick={() => setDemarrage(g)}
                            className="inline-flex items-center gap-1 text-label-md text-primary disabled:opacity-40"
                          >
                            <PlayArrowOutlined style={{ fontSize: 16 }} />
                            Démarrer
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-2 md:hidden">
            {groupes.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setOuvert(g)}
                className={`rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 text-left ${
                  g.active ? "" : "opacity-60"
                }`}
              >
                <p className="flex items-center gap-2 text-body-md font-medium text-on-surface">
                  {g.en_marche && (
                    <BoltOutlined style={{ fontSize: 16 }} className="text-secondary" />
                  )}
                  {g.nom}
                </p>
                {sousTitre(g) && (
                  <p className="mt-0.5 text-label-md text-outline">{sousTitre(g)}</p>
                )}
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  {!g.active
                    ? "Hors service"
                    : g.en_marche
                      ? `En marche depuis le ${new Date(g.depuis!).toLocaleString("fr-FR", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}`
                      : "À l'arrêt"}
                </p>
              </button>
            ))}
          </div>
          </>
        )}
      </div>

      {ouvert && (
        <FeuilleBas
          titre={ouvert.nom}
          sousTitre={sousTitre(ouvert) || undefined}
          onClose={() => setOuvert(null)}
          actions={
            peutGerer ? (
              ouvert.en_marche ? (
                <button
                  type="button"
                  disabled={enCours}
                  onClick={() => {
                    void arreter(ouvert);
                    setOuvert(null);
                  }}
                  className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-error text-body-md font-semibold text-on-primary disabled:opacity-50"
                >
                  <StopOutlined style={{ fontSize: 18 }} />
                  Arrêter
                </button>
              ) : (
                <button
                  type="button"
                  disabled={enCours || !ouvert.active}
                  onClick={() => {
                    setDemarrage(ouvert);
                    setOuvert(null);
                  }}
                  className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-body-md font-semibold text-on-primary disabled:opacity-40"
                >
                  <PlayArrowOutlined style={{ fontSize: 18 }} />
                  Démarrer
                </button>
              )
            ) : undefined
          }
        >
          <dl className="flex flex-col gap-3">
            <Ligne terme="État" valeur={
              !ouvert.active
                ? "Hors service"
                : ouvert.en_marche
                  ? `En marche depuis le ${new Date(ouvert.depuis!).toLocaleString("fr-FR")}`
                  : "À l'arrêt"
            } />
            <Ligne terme="N° de série" valeur={ouvert.reference ?? "—"} />
            <Ligne terme="Réservoir" valeur={ouvert.capacite ? `${ouvert.capacite} L` : "—"} />
            <Ligne terme="Carburant reçu" valeur={`${ouvert.carburant_recu} L`} />
            {ouvert.categorie && <Ligne terme="Emplacement" valeur={ouvert.categorie} />}
          </dl>
        </FeuilleBas>
      )}

      {demarrage && (
        <DialogueDemarrage
          groupe={demarrage}
          enCours={enCours}
          onClose={() => setDemarrage(null)}
          onDemarrer={async (corps) => {
            setEnCours(true);
            try {
              await operationsApi.demarrerGroupe({ ...corps, ressource_id: demarrage.id });
              setDemarrage(null);
              setToast(`« ${demarrage.nom} » démarré.`);
              await charger();
            } catch (e) {
              setErreur(e instanceof Error ? e.message : "Démarrage impossible.");
            } finally {
              setEnCours(false);
            }
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

/** Marque, modèle et puissance viennent du JSON d'attributs : le catalogue les
 *  déclare, l'écran ne les connaît pas typés. On les ramène à du texte ici
 *  plutôt que d'éparpiller des conversions dans le rendu. */
function sousTitre(g: GroupeElectrogene): string {
  const { marque, modele, puissance_kva } = g.attributs as Record<string, unknown>;
  const identite = [marque, modele].filter(Boolean).map(String).join(" ");
  const puissance = puissance_kva ? `${String(puissance_kva)} kVA` : "";
  return [identite, puissance].filter(Boolean).join(" · ");
}

function Ligne({ terme, valeur }: { terme: string; valeur: string }) {
  return (
    <div>
      <dt className="text-label-md text-on-surface-variant">{terme}</dt>
      <dd className="mt-0.5 text-body-sm text-on-surface">{valeur}</dd>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={`px-4 py-2 text-label-sm uppercase tracking-wide text-outline ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
