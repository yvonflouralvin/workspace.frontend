"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeftOutlined, ChevronRightOutlined, WarningAmberOutlined } from "@mui/icons-material";
import {
  TEINTES_TYPE, isoJour, lundiDe, operationsApi,
  type Charge, type TypeDef,
} from "@/lib/operations-api";

export function PanneauCharge() {
  const [types, setTypes] = useState<TypeDef[]>([]);
  const [typeChoisi, setTypeChoisi] = useState("");
  const [granularite, setGranularite] = useState<"semaine" | "mois">("semaine");
  const [reference, setReference] = useState(() => lundiDe(new Date()));
  const [charge, setCharge] = useState<Charge[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const [c, lignes] = await Promise.all([
        operationsApi.types(),
        operationsApi.charge(isoJour(reference), granularite, typeChoisi || undefined),
      ]);
      setTypes(c.types);
      setCharge(lignes);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger la vue.");
      setCharge([]);
    }
  }, [reference, granularite, typeChoisi]);

  useEffect(() => { void charger(); }, [charger]);

  const decaler = (pas: number) => {
    const d = new Date(reference);
    if (granularite === "mois") d.setMonth(d.getMonth() + pas);
    else d.setDate(d.getDate() + pas * 7);
    setReference(d);
  };

  // Les ressources sans aucune prestation restent visibles mais reléguées :
  // savoir qui n'est PAS planifié fait partie de la lecture d'une charge.
  const planifiees = (charge ?? []).filter((c) => c.prestations > 0);
  const libres = (charge ?? []).filter((c) => c.prestations === 0);
  const maxHeures = Math.max(1, ...planifiees.map((c) => c.heures));

  return (
    <>
      <div className="p-4 md:p-8">
        <h1 className="font-display text-headline-md text-on-surface">Charge</h1>
        <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
          Prestations et heures par ressource. Une prestation à cheval sur deux périodes
          est découpée : chaque période ne compte que ses propres heures.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => decaler(-1)} aria-label="Période précédente"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant hover:bg-surface-container-low">
            <ChevronLeftOutlined style={{ fontSize: 18 }} />
          </button>
          <p className="text-body-md text-on-surface">
            {granularite === "mois"
              ? reference.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
              : `Semaine du ${reference.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}`}
          </p>
          <button type="button" onClick={() => decaler(1)} aria-label="Période suivante"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-soft text-on-surface-variant hover:bg-surface-container-low">
            <ChevronRightOutlined style={{ fontSize: 18 }} />
          </button>

          <div className="flex rounded-lg border border-outline-soft p-0.5">
            {(["semaine", "mois"] as const).map((g) => (
              <button key={g} type="button" onClick={() => setGranularite(g)}
                className={`h-8 rounded-md px-3 text-body-sm transition-colors ${
                  granularite === g ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-container-low"
                }`}>
                {g === "semaine" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>

          <select value={typeChoisi} onChange={(e) => setTypeChoisi(e.target.value)}
            className="h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary">
            <option value="">Toutes natures</option>
            {types.map((t) => <option key={t.cle} value={t.cle}>{t.libelle_pluriel}</option>)}
          </select>
        </div>

        {erreur && <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">{erreur}</p>}

        {charge === null ? (
          <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : (
          <>
            <div className="mt-6 flex flex-col gap-2">
              {planifiees.length === 0 ? (
                <p className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-8 text-center text-body-sm text-on-surface-variant">
                  Aucune ressource planifiée sur cette période.
                </p>
              ) : (
                planifiees.map((c) => (
                  <article key={c.ressource_id} className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="flex items-center gap-2 text-body-md font-medium text-on-surface">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TEINTES_TYPE[c.type] }} />
                        {c.ressource}
                      </p>
                      <p className="text-body-sm text-on-surface-variant">
                        {c.prestations} prestation{c.prestations > 1 ? "s" : ""} · <span className="font-medium text-on-surface">{c.heures} h</span>
                      </p>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-track">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((c.heures / maxHeures) * 100)}%` }} />
                    </div>
                    {c.avertissements.map((a, i) => (
                      <p key={i} className="mt-2 flex items-start gap-1.5 text-label-md text-error">
                        <WarningAmberOutlined style={{ fontSize: 14 }} className="mt-px flex-none" />
                        {a}
                      </p>
                    ))}
                  </article>
                ))
              )}
            </div>

            {libres.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-label-md uppercase text-outline">
                  Non planifiées <span className="ml-1 text-outline-variant">{libres.length}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {libres.map((c) => (
                    <span key={c.ressource_id} className="rounded-full border border-outline-soft px-3 py-1 text-body-sm text-on-surface-variant">
                      {c.ressource}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
