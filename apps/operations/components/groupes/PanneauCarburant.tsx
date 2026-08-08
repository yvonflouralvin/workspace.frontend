"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowForwardOutlined,
  DeleteOutlineOutlined,
  LocalGasStationOutlined,
} from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import { Kpi } from "@/components/Mesures";
import {
  operationsApi,
  type Carburant,
  type GroupeElectrogene,
} from "@/lib/operations-api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary";

const LIBELLE: Record<string, string> = {
  FOURNISSEUR: "Fournisseur",
  RESERVE: "Réserve",
  GROUPE: "Groupe",
};

/** Le carburant : ce qui entre, ce qui sort, ce qu'il reste.
 *
 *  Le niveau de la réserve n'est jamais saisi — il se déduit des mouvements.
 *  Un compteur se corrige à la main, diverge, et l'on finit par ne croire ni
 *  au compteur ni aux mouvements. */
export function PanneauCarburant() {
  const { can } = usePermissions();
  const peutGerer = can("operations.groupes.manage");

  const [donnees, setDonnees] = useState<Carburant | null>(null);
  const [groupes, setGroupes] = useState<GroupeElectrogene[]>([]);
  const [source, setSource] = useState<"FOURNISSEUR" | "RESERVE">("FOURNISSEUR");
  const [destination, setDestination] = useState<"RESERVE" | "GROUPE">("RESERVE");
  const [ressourceId, setRessourceId] = useState<number | "">("");
  const [quantite, setQuantite] = useState("");
  const [fournisseur, setFournisseur] = useState("");
  const [note, setNote] = useState("");
  const [aRetirer, setARetirer] = useState<number | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const [c, g] = await Promise.all([
        operationsApi.carburant(),
        operationsApi.groupesElectrogenes(),
      ]);
      setDonnees(c);
      setGroupes(g.filter((x) => x.active));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
      setDonnees({ reserve: 0, mouvements: [] });
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function enregistrer() {
    if (!quantite.trim() || Number(quantite) <= 0) {
      setErreur("Indiquez une quantité supérieure à zéro.");
      return;
    }
    if (destination === "GROUPE" && !ressourceId) {
      setErreur("Choisissez le groupe ravitaillé.");
      return;
    }
    setEnCours(true);
    setErreur(null);
    try {
      const r = await operationsApi.ravitailler({
        source,
        destination,
        quantite: Number(quantite),
        ressource_id: destination === "GROUPE" ? Number(ressourceId) : null,
        fournisseur: source === "FOURNISSEUR" ? fournisseur.trim() || null : null,
        note: note.trim() || null,
      });
      setQuantite("");
      setNote("");
      setToast(`Enregistré. Réserve : ${r.reserve} L.`);
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <>
      <div className="p-4 md:p-8">
        <div>
          <h1 className="font-display text-headline-md text-on-surface">Ravitaillement</h1>
          <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
            Chaque mouvement de carburant. Le niveau de la réserve se déduit de ces
            mouvements — il ne se saisit pas, pour qu&apos;il ne puisse pas diverger d&apos;eux.
          </p>
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            libelle="En réserve"
            valeur={donnees?.reserve ?? 0}
            unite="L"
            note="Déduit des mouvements"
          />
          <Kpi libelle="Mouvements" valeur={donnees?.mouvements.length ?? 0} />
          <Kpi
            libelle="Entré en réserve"
            valeur={(donnees?.mouvements ?? [])
              .filter((m) => m.destination === "RESERVE")
              .reduce((s, m) => s + m.quantite, 0)}
            unite="L"
          />
          <Kpi
            libelle="Versé aux groupes"
            valeur={(donnees?.mouvements ?? [])
              .filter((m) => m.destination === "GROUPE")
              .reduce((s, m) => s + m.quantite, 0)}
            unite="L"
          />
        </div>

        {peutGerer && (
          <section className="mt-5 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <h2 className="text-body-md font-medium text-on-surface">Nouveau mouvement</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-on-surface-variant">Source</span>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value as "FOURNISSEUR" | "RESERVE")}
                  className={CHAMP}
                >
                  <option value="FOURNISSEUR">Fournisseur</option>
                  <option value="RESERVE">Réserve</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-on-surface-variant">Destination</span>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value as "RESERVE" | "GROUPE")}
                  className={CHAMP}
                >
                  <option value="RESERVE">Réserve</option>
                  <option value="GROUPE">Un groupe</option>
                </select>
              </label>
              {destination === "GROUPE" ? (
                <label className="flex flex-col gap-1">
                  <span className="text-label-md text-on-surface-variant">Groupe</span>
                  <select
                    value={ressourceId}
                    onChange={(e) => setRessourceId(e.target.value ? Number(e.target.value) : "")}
                    className={CHAMP}
                  >
                    <option value="">Choisir…</option>
                    {groupes.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.nom}
                        {g.capacite ? ` — ${g.capacite} L` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : source === "FOURNISSEUR" ? (
                <label className="flex flex-col gap-1">
                  <span className="text-label-md text-on-surface-variant">Fournisseur</span>
                  <input
                    value={fournisseur}
                    onChange={(e) => setFournisseur(e.target.value)}
                    className={CHAMP}
                  />
                </label>
              ) : (
                <span />
              )}
              <label className="flex flex-col gap-1">
                <span className="text-label-md text-on-surface-variant">Quantité (L)</span>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={quantite}
                  onChange={(e) => setQuantite(e.target.value)}
                  className={CHAMP}
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="flex min-w-[16rem] flex-1 flex-col gap-1">
                <span className="text-label-md text-on-surface-variant">Note (facultative)</span>
                <input value={note} onChange={(e) => setNote(e.target.value)} className={CHAMP} />
              </label>
              <button
                type="button"
                disabled={enCours}
                onClick={() => void enregistrer()}
                className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button disabled:opacity-50"
              >
                {enCours ? "…" : "Enregistrer"}
              </button>
            </div>
            {source === "RESERVE" && (
              <p className="mt-2 text-label-md text-outline">
                Une sortie ne peut pas dépasser ce qui est en réserve ({donnees?.reserve ?? 0} L).
              </p>
            )}
          </section>
        )}

        <section className="mt-6">
          <h2 className="text-headline-sm text-on-surface">Mouvements</h2>
          {donnees === null ? (
            <p className="mt-2 text-body-sm text-on-surface-variant">Chargement…</p>
          ) : donnees.mouvements.length === 0 ? (
            <div className="mt-2 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
              <LocalGasStationOutlined style={{ fontSize: 28 }} className="text-outline" />
              <p className="mt-2 text-body-md text-on-surface">Aucun mouvement.</p>
            </div>
          ) : (
            <div className="mt-2 overflow-x-auto rounded-2xl border border-outline-soft bg-surface-container-lowest">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-soft bg-surface-row-alt">
                    <Th>Date</Th>
                    <Th>Mouvement</Th>
                    <Th align="right">Quantité</Th>
                    <Th>Détail</Th>
                    <Th>Saisi par</Th>
                    {peutGerer && <Th align="right" />}
                  </tr>
                </thead>
                <tbody>
                  {donnees.mouvements.map((m) => (
                    <tr key={m.id} className="border-b border-hairline last:border-b-0">
                      <td className="whitespace-nowrap px-4 py-2.5 text-body-sm text-on-surface-variant">
                        {new Date(m.date).toLocaleString("fr-FR", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-2.5 text-body-sm text-on-surface">
                        <span className="inline-flex items-center gap-1.5">
                          {LIBELLE[m.source]}
                          <ArrowForwardOutlined
                            style={{ fontSize: 14 }}
                            className="text-on-surface-variant"
                          />
                          {m.destination === "GROUPE" ? m.groupe ?? "Groupe" : "Réserve"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-body-sm tabular-nums text-on-surface">
                        {m.quantite} L
                      </td>
                      <td className="px-4 py-2.5 text-body-sm text-on-surface-variant">
                        {[m.fournisseur, m.note].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-body-sm text-on-surface-variant">
                        {m.saisi_par ?? "—"}
                      </td>
                      {peutGerer && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => setARetirer(m.id)}
                            aria-label="Retirer ce mouvement"
                            className="text-on-surface-variant transition-colors hover:text-error"
                          >
                            <DeleteOutlineOutlined style={{ fontSize: 17 }} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {aRetirer !== null && (
        <ConfirmDialog
          title="Retirer ce mouvement ?"
          message="Le niveau de la réserve sera recalculé. Un retrait qui rendrait la réserve négative sera refusé — du carburant en est déjà sorti."
          confirmLabel="Retirer"
          onCancel={() => setARetirer(null)}
          onConfirm={async () => {
            try {
              await operationsApi.annulerRavitaillement(aRetirer);
              setToast("Mouvement retiré.");
              await charger();
            } catch (e) {
              setErreur(e instanceof Error ? e.message : "Retrait impossible.");
            } finally {
              setARetirer(null);
            }
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align?: "right" }) {
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
