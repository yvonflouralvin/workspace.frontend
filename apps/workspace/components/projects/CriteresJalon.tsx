"use client";

import { useState } from "react";
import { AddOutlined, LockOutlined } from "@mui/icons-material";
import {
  COMPARATEUR_LABELS,
  COMPARATEUR_ORDER,
  CRITERE_TYPE_LABELS,
  CRITERE_TYPE_ORDER,
  jalonsApi,
  type Comparateur,
  type Critere,
  type CritereType,
  type JalonDetail,
} from "@/app/lib/jalons-api";
import type { Deliverable } from "@/app/lib/projects-api";
import { fmtInstant } from "./JalonBadges";

const FIELD =
  "h-8 px-2 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface focus:outline-none focus:border-primary transition-colors";

/** Les critères ÉCLAIRENT la décision, ils ne la calculent pas : aucun total,
 *  aucune coloration, aucun « 3/4 satisfaits ». */
export function CriteresJalon({
  jalon,
  deliverables,
  canManage,
  onChange,
}: {
  jalon: JalonDetail;
  deliverables: Deliverable[];
  canManage: boolean;
  onChange: () => void | Promise<void>;
}) {
  const [ajout, setAjout] = useState(false);
  const [libelle, setLibelle] = useState("");
  const [type, setType] = useState<CritereType>("texte");
  const [comparateur, setComparateur] = useState<Comparateur>("appreciation");
  const [cible, setCible] = useState("");
  const [livrableId, setLivrableId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const figes = jalon.criteres.filter((c) => c.verrouille_le).length;

  async function creer() {
    if (!libelle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await jalonsApi.createCritere(jalon.id, {
        libelle: libelle.trim(),
        type,
        comparateur,
        cible: cible.trim() || null,
        livrable_id: livrableId,
        position: jalon.criteres.length,
      });
      setLibelle("");
      setCible("");
      setLivrableId(null);
      setAjout(false);
      await onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ajout impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-label-sm uppercase text-outline">Critères d&apos;examen</p>
        {figes > 0 && (
          <span className="inline-flex items-center gap-1 text-label-md font-medium text-locked">
            <LockOutlined style={{ fontSize: 13 }} />
            {figes} figé{figes > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest divide-y divide-hairline overflow-hidden">
        {jalon.criteres.length === 0 && !ajout && (
          <p className="px-4 py-3 text-body-sm text-on-surface-variant">
            Aucun critère. Une gate peut se décider sans critère — ils servent à documenter ce
            qu&apos;on regarde, pas à autoriser la décision.
          </p>
        )}

        {jalon.criteres.map((critere) => (
          <LigneCritere
            key={critere.id}
            critere={critere}
            deliverables={deliverables}
            canManage={canManage}
            onChange={onChange}
          />
        ))}

        {ajout && (
          <div className="px-4 py-3 space-y-2">
            <input
              className={`${FIELD} w-full`}
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Ce qu'on regarde — ex. Budget consommé, Recette fonctionnelle signée…"
              autoFocus
            />
            <div className="flex flex-wrap items-center gap-2">
              <select className={FIELD} value={type} onChange={(e) => setType(e.target.value as CritereType)}>
                {CRITERE_TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {CRITERE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
              <select
                className={FIELD}
                value={comparateur}
                onChange={(e) => setComparateur(e.target.value as Comparateur)}
              >
                {COMPARATEUR_ORDER.map((c) => (
                  <option key={c} value={c}>
                    {COMPARATEUR_LABELS[c]}
                  </option>
                ))}
              </select>
              {comparateur !== "appreciation" && (
                <input
                  className={`${FIELD} w-[140px]`}
                  value={cible}
                  onChange={(e) => setCible(e.target.value)}
                  placeholder="Cible"
                />
              )}
              <select
                className={FIELD}
                value={livrableId ?? ""}
                onChange={(e) => setLivrableId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Aucun livrable lié</option>
                {deliverables.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy || !libelle.trim()}
                onClick={creer}
                className="h-8 px-3 rounded-lg bg-primary text-on-primary text-body-sm font-semibold hover:bg-primary-container disabled:opacity-50 transition-colors"
              >
                Ajouter
              </button>
              <button
                type="button"
                onClick={() => setAjout(false)}
                className="h-8 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {canManage && !ajout && (
          <div className="px-4 py-3">
            <button
              type="button"
              onClick={() => setAjout(true)}
              className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline"
            >
              <AddOutlined style={{ fontSize: 16 }} />
              Ajouter un critère
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-body-sm text-error">{error}</p>}
    </section>
  );
}

function LigneCritere({
  critere,
  deliverables,
  canManage,
  onChange,
}: {
  critere: Critere;
  deliverables: Deliverable[];
  canManage: boolean;
  onChange: () => void | Promise<void>;
}) {
  const [libelle, setLibelle] = useState(critere.libelle);
  const [deverrouillage, setDeverrouillage] = useState(false);
  const [motif, setMotif] = useState("");
  const [busy, setBusy] = useState(false);

  const fige = Boolean(critere.verrouille_le);
  const livrable = deliverables.find((d) => d.id === critere.livrable_id) ?? null;
  const regle =
    critere.comparateur === "appreciation"
      ? COMPARATEUR_LABELS.appreciation
      : `${COMPARATEUR_LABELS[critere.comparateur] ?? critere.comparateur} ${critere.cible ?? "—"}`;

  return (
    // Teinte `locked` du design system : elle dit « figé, non éditable ». Le
    // composant LockedBadge, lui, parle d'un objet publié par une autre app — ce
    // n'est pas le sujet ici.
    <div className={`px-4 py-3 ${fige ? "bg-locked-surface" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {fige || !canManage ? (
            <p className="text-body-sm font-medium text-on-surface">{critere.libelle}</p>
          ) : (
            <input
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              onBlur={() => {
                const valeur = libelle.trim();
                if (!valeur || valeur === critere.libelle) return;
                void jalonsApi.updateCritere(critere.id, { libelle: valeur }).then(onChange);
              }}
              className="w-full bg-transparent text-body-sm font-medium text-on-surface outline-none border-b border-transparent hover:border-outline-soft focus:border-primary transition-colors"
            />
          )}
          <p className="mt-0.5 text-label-md text-outline">
            {CRITERE_TYPE_LABELS[critere.type] ?? critere.type} · {regle}
            {livrable && ` · Livrable « ${livrable.title} »`}
          </p>
          {critere.valeur_pre_remplie && (
            <p className="mt-0.5 text-label-md text-on-surface-variant">
              Valeur proposée : {critere.valeur_pre_remplie}
            </p>
          )}
        </div>

        {fige && (
          <span className="flex-none inline-flex items-center gap-1 rounded-md bg-locked-container px-1.5 py-0.5 text-label-sm font-semibold text-locked">
            <LockOutlined style={{ fontSize: 11 }} />
            Figé
          </span>
        )}
      </div>

      {fige && (
        <p className="mt-1 text-label-md text-outline">
          Figé le {fmtInstant(critere.verrouille_le)}
          {critere.deverrouille_motif && ` · Déjà déverrouillé une fois : ${critere.deverrouille_motif}`}
        </p>
      )}

      {fige && canManage && !deverrouillage && (
        <button
          type="button"
          onClick={() => setDeverrouillage(true)}
          className="mt-1 text-label-md text-on-surface-variant hover:text-error hover:underline transition-colors"
        >
          Déverrouiller
        </button>
      )}

      {deverrouillage && (
        <div className="mt-2 space-y-2">
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            rows={2}
            autoFocus
            placeholder="Pourquoi ce critère doit changer après avoir été figé…"
            className="w-full resize-none rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
          />
          <p className="text-label-md text-outline">
            Le motif est conservé avec votre nom : rouvrir un critère figé se voit.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || !motif.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  await jalonsApi.deverrouillerCritere(critere.id, motif.trim());
                  setDeverrouillage(false);
                  setMotif("");
                  await onChange();
                } finally {
                  setBusy(false);
                }
              }}
              className="h-8 px-3 rounded-lg bg-error text-on-error text-body-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              Déverrouiller
            </button>
            <button
              type="button"
              onClick={() => setDeverrouillage(false)}
              className="h-8 px-3 rounded-lg text-body-sm text-on-surface-variant hover:bg-surface-container transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
