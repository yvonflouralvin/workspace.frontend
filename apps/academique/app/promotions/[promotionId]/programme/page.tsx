"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AddOutlined,
  ContentCopyOutlined,
  DeleteOutlineOutlined,
  MenuBookOutlined,
} from "@mui/icons-material";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Toast } from "@repo/ui/Toast";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { useContexte } from "@/app/lib/etablissement";
import { usePromotion } from "../promotion-context";
import {
  api,
  type ElementConstitutif,
  type Enseignant,
  type Programme,
  type Promotion,
  type UniteEnseignement,
} from "@/app/lib/api";

const CHAMP =
  "h-9 w-full rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none transition-colors focus:border-primary disabled:opacity-60";

const BCC = [
  { valeur: "FONDAMENTALE", court: "Fondamentale" },
  { valeur: "TRANSVERSALE", court: "Transversale" },
  { valeur: "DECOUVERTE", court: "Découverte" },
];

const TEINTE_BCC: Record<string, string> = {
  FONDAMENTALE: "bg-primary/10 text-primary",
  TRANSVERSALE: "bg-tertiary/12 text-tertiary",
  DECOUVERTE: "bg-secondary/12 text-secondary",
};

/** Le programme d'une promotion : UE, EC, volumes et titulaires.
 *
 *  Les volumes affichés sur une UE sont la SOMME de ses EC — l'UE n'en déclare
 *  aucun. C'est ce qui empêche une maquette d'annoncer 30 h quand ses éléments
 *  en totalisent 45.
 */
export default function ProgrammePage() {
  const { promotionId: id } = usePromotion();
  const { can } = usePermissions();
  const peutGerer = can("academique.programme.manage");
  const contexte = useContexte();

  const [programme, setProgramme] = useState<Programme | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nouvelleUE, setNouvelleUE] = useState<number | null>(null);
  const [ecEnCours, setEcEnCours] = useState<number | null>(null);
  const [aSupprimer, setASupprimer] = useState<{ ue: UniteEnseignement; detail: string } | null>(
    null
  );
  const [source, setSource] = useState("");
  const [avecTitulaires, setAvecTitulaires] = useState(true);
  const [ecarts, setEcarts] = useState<string[] | null>(null);

  const charger = useCallback(async () => {
    try {
      setProgramme(await api.programme(id));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, [id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  useEffect(() => {
    if (!contexte.etablissement) return;
    void api.promotions(contexte.etablissement.id).then(setPromotions).catch(() => {});
    void api.enseignants(contexte.etablissement.id).then(setEnseignants).catch(() => {});
  }, [contexte.etablissement]);

  const modifiable = peutGerer && (programme?.annee_modifiable ?? false);
  const periodes = useMemo(() => {
    const groupes = new Map<number, UniteEnseignement[]>();
    for (const ue of programme?.unites ?? []) {
      groupes.set(ue.periode, [...(groupes.get(ue.periode) ?? []), ue]);
    }
    return [...groupes.entries()].sort((a, b) => a[0] - b[0]);
  }, [programme]);

  async function agir(action: () => Promise<unknown>, message?: string) {
    setBusy(true);
    setErreur(null);
    try {
      await action();
      await charger();
      if (message) setToast(message);
      return true;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Action impossible.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const vide = programme !== null && programme.unites.length === 0;

  return (
    <div>
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-body-sm text-on-surface-variant">
              {programme && !programme.annee_modifiable
                ? "Année clôturée — le programme est en lecture seule."
                : "Les volumes d'une unité sont la somme de ses éléments."}
            </p>
          </div>
          {programme && programme.unites.length > 0 && (
            <div className="flex gap-4 text-right">
              <div>
                <p className="font-display text-headline-sm text-on-surface">
                  {programme.total_credits}
                </p>
                <p className="text-label-md text-outline">crédits</p>
              </div>
              <div>
                <p className="font-display text-headline-sm text-on-surface">
                  {programme.total_volume}
                </p>
                <p className="text-label-md text-outline">heures</p>
              </div>
            </div>
          )}
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {/* Reprendre le programme d'une autre promotion — le geste de rentrée.
            Proposé seulement quand la maquette est VIDE : au-delà, le serveur
            refuse d'écraser un travail en cours, et l'offrir serait mentir. */}
        {modifiable && vide && (
          <section className="mt-4 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
            <h2 className="text-body-md font-semibold text-on-surface">
              Reprendre un programme existant
            </h2>
            <p className="mt-0.5 text-label-md text-outline">
              Recopie les unités, les éléments et leurs volumes depuis une autre promotion.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                aria-label="Promotion source"
                className={`${CHAMP} w-auto min-w-[16rem]`}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                <option value="">Choisir la promotion à recopier…</option>
                {promotions
                  .filter((p) => p.id !== id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.libelle} — {p.annee_libelle}
                    </option>
                  ))}
              </select>
              <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={avecTitulaires}
                  onChange={(e) => setAvecTitulaires(e.target.checked)}
                />
                Reprendre aussi les titulaires
              </label>
              <button
                type="button"
                disabled={busy || !source}
                onClick={async () => {
                  setBusy(true);
                  setErreur(null);
                  try {
                    const bilan = await api.reprendreProgramme(
                      id,
                      Number(source),
                      avecTitulaires
                    );
                    setEcarts(bilan.ecarts);
                    setToast(
                      `${bilan.unites} unité(s) et ${bilan.elements} élément(s) repris.`
                    );
                    await charger();
                  } catch (e) {
                    setErreur(e instanceof Error ? e.message : "Reprise impossible.");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
              >
                <ContentCopyOutlined style={{ fontSize: 16 }} />
                Reprendre
              </button>
            </div>
          </section>
        )}

        {/* Ce que la reprise n'a PAS fait. Sans cet encart, un titulaire non
            reconduit se découvrirait en délibération. */}
        {ecarts && ecarts.length > 0 && (
          <div className="mt-3 rounded-xl border border-outline-soft bg-surface-container-low p-3">
            <p className="text-body-sm font-medium text-on-surface">
              Reprise partielle — {ecarts.length} point(s) à reprendre à la main :
            </p>
            <ul className="mt-1 space-y-0.5">
              {ecarts.map((e, n) => (
                <li key={n} className="text-label-md text-on-surface-variant">
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {programme === null ? (
          <p className="mt-5 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : vide && !modifiable ? (
          <div className="mt-5 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
            <MenuBookOutlined style={{ fontSize: 28 }} className="text-outline" />
            <p className="mt-2 text-body-sm text-on-surface-variant">
              Aucune unité d&apos;enseignement dans cette promotion.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-6">
            {periodes.map(([periode, unites]) => (
              <section key={periode}>
                <h2 className="text-label-sm uppercase tracking-wide text-outline">
                  Période {periode}
                  <span className="ml-2 normal-case tracking-normal">
                    {unites.reduce((s, u) => s + u.credits, 0)} crédits ·{" "}
                    {unites.reduce((s, u) => s + u.cmi + u.td + u.tp, 0)} h
                  </span>
                </h2>
                <div className="mt-2 space-y-3">
                  {unites.map((ue) => (
                    <BlocUE
                      key={ue.id}
                      ue={ue}
                      enseignants={enseignants}
                      modifiable={modifiable}
                      busy={busy}
                      ouvert={ecEnCours === ue.id}
                      onOuvrir={() => setEcEnCours(ecEnCours === ue.id ? null : ue.id)}
                      onSupprimer={() =>
                        agir(() => api.supprimerUE(ue.id), "Unité supprimée.").then((ok) => {
                          if (!ok && erreur) setASupprimer({ ue, detail: erreur });
                        })
                      }
                      onAjouterEC={(corps) =>
                        agir(() => api.creerEC(ue.id, corps), "Élément ajouté.")
                      }
                      onSupprimerEC={(ec) =>
                        agir(() => api.supprimerEC(ec.id), "Élément supprimé.")
                      }
                    />
                  ))}
                </div>
              </section>
            ))}

            {modifiable && (
              <FormulaireUE
                ouvert={nouvelleUE !== null}
                busy={busy}
                onOuvrir={() => setNouvelleUE(1)}
                onFermer={() => setNouvelleUE(null)}
                onValider={async (corps) => {
                  const ok = await agir(() => api.creerUE(id, corps), "Unité ajoutée.");
                  if (ok) setNouvelleUE(null);
                }}
              />
            )}
          </div>
        )}

        {/* Le refus du serveur NOMME les éléments qu'on s'apprête à perdre :
            on le remonte tel quel, il porte l'information. */}
        {aSupprimer && (
          <ConfirmDialog
            title={`Supprimer « ${aSupprimer.ue.intitule} » ?`}
            message={aSupprimer.detail}
            confirmLabel="Supprimer l'unité et ses éléments"
            onConfirm={async () => {
              await agir(() => api.supprimerUE(aSupprimer.ue.id, true), "Unité supprimée.");
              setASupprimer(null);
            }}
            onCancel={() => setASupprimer(null)}
          />
        )}

        {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
      </div>
    </div>
  );
}

function BlocUE({
  ue,
  enseignants,
  modifiable,
  busy,
  ouvert,
  onOuvrir,
  onSupprimer,
  onAjouterEC,
  onSupprimerEC,
}: {
  ue: UniteEnseignement;
  enseignants: Enseignant[];
  modifiable: boolean;
  busy: boolean;
  ouvert: boolean;
  onOuvrir: () => void;
  onSupprimer: () => void;
  onAjouterEC: (corps: Record<string, unknown>) => Promise<boolean>;
  onSupprimerEC: (ec: ElementConstitutif) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
      <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-4 py-3">
        <span className="font-mono text-label-md text-outline">{ue.code}</span>
        <span className="min-w-0 flex-1 text-body-md font-medium text-on-surface">
          {ue.intitule}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-label-sm ${TEINTE_BCC[ue.bcc] ?? ""}`}>
          {BCC.find((b) => b.valeur === ue.bcc)?.court ?? ue.bcc}
        </span>
        <span className="text-label-md tabular-nums text-on-surface-variant">
          {ue.credits} cr · {ue.cmi + ue.td + ue.tp} h
        </span>
        {modifiable && (
          <button
            type="button"
            disabled={busy}
            onClick={onSupprimer}
            title="Supprimer l'unité"
            className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-error/8 hover:text-error"
          >
            <DeleteOutlineOutlined style={{ fontSize: 17 }} />
          </button>
        )}
      </div>

      {ue.elements.length === 0 ? (
        <p className="px-4 py-3 text-label-md text-outline">
          Aucun élément constitutif — cette unité ne pèse encore aucun crédit.
        </p>
      ) : (
        <div className="divide-y divide-hairline">
          {ue.elements.map((ec) => (
            <div key={ec.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1 text-body-sm text-on-surface">
                {ec.intitule}
                {ec.est_projet && (
                  <span className="ml-2 rounded bg-surface-container px-1.5 py-0.5 text-label-sm uppercase text-outline">
                    Projet
                  </span>
                )}
                {ec.est_stage && (
                  <span className="ml-2 rounded bg-surface-container px-1.5 py-0.5 text-label-sm uppercase text-outline">
                    Stage
                  </span>
                )}
              </span>
              <span className="w-[13rem] flex-none truncate text-label-md text-on-surface-variant">
                {ec.titulaire_nom || "Titulaire non attribué"}
              </span>
              <span className="w-[9rem] flex-none text-right text-label-md tabular-nums text-on-surface-variant">
                {ec.credits} cr · {ec.cmi}/{ec.td}/{ec.tp}
              </span>
              {modifiable && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onSupprimerEC(ec)}
                  className="flex-none text-label-md text-on-surface-variant transition-colors hover:text-error"
                >
                  Retirer
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {modifiable && (
        <div className="border-t border-hairline px-4 py-2.5">
          {ouvert ? (
            <FormulaireEC
              enseignants={enseignants}
              busy={busy}
              onFermer={onOuvrir}
              onValider={async (corps) => {
                const ok = await onAjouterEC(corps);
                if (ok) onOuvrir();
              }}
            />
          ) : (
            <button
              type="button"
              onClick={onOuvrir}
              className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Ajouter un élément constitutif
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FormulaireUE({
  ouvert,
  busy,
  onOuvrir,
  onFermer,
  onValider,
}: {
  ouvert: boolean;
  busy: boolean;
  onOuvrir: () => void;
  onFermer: () => void;
  onValider: (corps: Record<string, unknown>) => void;
}) {
  const [code, setCode] = useState("");
  const [intitule, setIntitule] = useState("");
  const [periode, setPeriode] = useState(1);
  const [bcc, setBcc] = useState("FONDAMENTALE");

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={onOuvrir}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container"
      >
        <AddOutlined style={{ fontSize: 17 }} />
        Ajouter une unité d&apos;enseignement
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
      <div className="grid gap-3 md:grid-cols-[8rem_1fr_9rem_11rem]">
        <input
          className={CHAMP}
          placeholder="Code (COM1111)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <input
          className={CHAMP}
          placeholder="Intitulé de l'unité"
          value={intitule}
          onChange={(e) => setIntitule(e.target.value)}
        />
        <select
          aria-label="Période"
          className={CHAMP}
          value={periode}
          onChange={(e) => setPeriode(Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5, 6].map((p) => (
            <option key={p} value={p}>
              Période {p}
            </option>
          ))}
        </select>
        <select aria-label="BCC" className={CHAMP} value={bcc} onChange={(e) => setBcc(e.target.value)}>
          {BCC.map((b) => (
            <option key={b.valeur} value={b.valeur}>
              {b.court}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy || !code.trim() || !intitule.trim()}
          onClick={() => {
            onValider({ code, intitule, periode, bcc });
            setCode("");
            setIntitule("");
          }}
          className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
        >
          Ajouter
        </button>
        <button
          type="button"
          onClick={onFermer}
          className="h-9 rounded-lg px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

function FormulaireEC({
  enseignants,
  busy,
  onFermer,
  onValider,
}: {
  enseignants: Enseignant[];
  busy: boolean;
  onFermer: () => void;
  onValider: (corps: Record<string, unknown>) => void;
}) {
  const [intitule, setIntitule] = useState("");
  const [credits, setCredits] = useState(0);
  const [cmi, setCmi] = useState(0);
  const [td, setTd] = useState(0);
  const [tp, setTp] = useState(0);
  const [titulaire, setTitulaire] = useState("");
  const [estProjet, setEstProjet] = useState(false);

  return (
    <div className="space-y-3 py-1">
      <div className="grid gap-2 md:grid-cols-[1fr_5rem_5rem_5rem_5rem]">
        <input
          className={CHAMP}
          placeholder="Intitulé de l'élément"
          value={intitule}
          onChange={(e) => setIntitule(e.target.value)}
        />
        <input
          className={CHAMP}
          type="number"
          min={0}
          aria-label="Crédits"
          placeholder="Cr."
          value={credits}
          onChange={(e) => setCredits(Number(e.target.value))}
        />
        <input
          className={CHAMP}
          type="number"
          min={0}
          aria-label="CMI"
          placeholder="CMI"
          value={cmi}
          onChange={(e) => setCmi(Number(e.target.value))}
        />
        <input
          className={CHAMP}
          type="number"
          min={0}
          aria-label="TD"
          placeholder="TD"
          value={td}
          onChange={(e) => setTd(Number(e.target.value))}
        />
        <input
          className={CHAMP}
          type="number"
          min={0}
          aria-label="TP"
          placeholder="TP"
          value={tp}
          onChange={(e) => setTp(Number(e.target.value))}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Titulaire"
          className={`${CHAMP} w-auto min-w-[15rem]`}
          value={titulaire}
          onChange={(e) => setTitulaire(e.target.value)}
        >
          <option value="">Titulaire — non attribué</option>
          {enseignants.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nom_complet}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={estProjet}
            onChange={(e) => setEstProjet(e.target.checked)}
          />
          Relié à la gestion des projets
        </label>
        <span className="flex-1" />
        <button
          type="button"
          disabled={busy || !intitule.trim()}
          onClick={() =>
            onValider({
              intitule,
              credits,
              cmi,
              td,
              tp,
              titulaire_id: titulaire ? Number(titulaire) : null,
              est_projet: estProjet,
            })
          }
          className="h-9 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:opacity-50"
        >
          Ajouter
        </button>
        <button
          type="button"
          onClick={onFermer}
          className="h-9 rounded-lg px-3 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
