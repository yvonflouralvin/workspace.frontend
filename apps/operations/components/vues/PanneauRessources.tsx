"use client";

import { useCallback, useEffect, useState } from "react";
import { AddOutlined, GroupsOutlined, PersonAddAltOutlined } from "@mui/icons-material";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { ConfirmDialog } from "@repo/ui/ConfirmDialog";
import { Pagination } from "@repo/ui/Pagination";
import { SearchField } from "@repo/ui/SearchField";
import { Toast } from "@repo/ui/Toast";
import { FormulaireRessource } from "@/components/FormulaireRessource";
import { ImportRH } from "@/components/ImportRH";
import {
  TEINTES_TYPE,
  operationsApi,
  type Groupe,
  type Ressource,
  type TypeDef,
  type TypePlanning,
} from "@/lib/operations-api";

export function PanneauRessources() {
  const { can } = usePermissions();
  const peutGerer = can("operations.ressources.manage");

  const [types, setTypes] = useState<TypeDef[]>([]);
  const [typeChoisi, setTypeChoisi] = useState<TypePlanning>("PRESTATION");
  const [recherche, setRecherche] = useState("");
  const [page, setPage] = useState(1);
  const [donnees, setDonnees] = useState<{ items: Ressource[]; pages: number; total: number } | null>(null);
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [edition, setEdition] = useState<Ressource | "nouveau" | null>(null);
  const [importRH, setImportRH] = useState(false);
  const [aSupprimer, setASupprimer] = useState<Ressource | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const typeCourant = types.find((t) => t.cle === typeChoisi);

  const charger = useCallback(async () => {
    try {
      const [c, liste, g] = await Promise.all([
        operationsApi.types(),
        operationsApi.ressources({ type: typeChoisi, q: recherche || undefined, page }),
        operationsApi.groupes(typeChoisi),
      ]);
      setTypes(c.types);
      setDonnees({ items: liste.items, pages: liste.pages, total: liste.total });
      setGroupes(g);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger les ressources.");
      setDonnees({ items: [], pages: 1, total: 0 });
    }
  }, [typeChoisi, recherche, page]);

  useEffect(() => {
    void charger();
  }, [charger]);

  return (
    <>
      <div className="p-4 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-headline-md text-on-surface">Ressources</h1>
            <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
              {typeCourant?.description ?? "Ce que l'on planifie."}
            </p>
          </div>
          {peutGerer && (
            <div className="flex flex-wrap gap-2">
              {/* L'import RH n'apparaît que pour les types qui en viennent —
                  le catalogue le dit, l'écran n'en décide pas. */}
              {typeCourant?.source_rh && (
                <button
                  type="button"
                  onClick={() => setImportRH(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-outline-soft px-3 text-body-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low"
                >
                  <PersonAddAltOutlined style={{ fontSize: 16 }} />
                  Importer depuis les RH
                </button>
              )}
              <button
                type="button"
                onClick={() => setEdition("nouveau")}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-body-sm font-semibold text-on-primary shadow-button transition-colors hover:bg-primary-container"
              >
                <AddOutlined style={{ fontSize: 16 }} />
                {typeCourant ? typeCourant.ressource_libelle : "Ressource"}
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {types.map((t) => (
              <button
                key={t.cle}
                type="button"
                onClick={() => {
                  setTypeChoisi(t.cle);
                  setPage(1);
                }}
                className={`h-9 rounded-lg border px-3 text-body-sm transition-colors ${
                  typeChoisi === t.cle
                    ? "border-primary bg-surface-container-low text-on-surface"
                    : "border-outline-soft text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TEINTES_TYPE[t.cle] }} />
                  {t.libelle_pluriel}
                </span>
              </button>
            ))}
          </div>
          <SearchField
            value={recherche}
            onChange={(v) => {
              setRecherche(v);
              setPage(1);
            }}
            placeholder="Rechercher…"
            className="w-full sm:w-[240px]"
          />
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">{erreur}</p>
        )}

        {donnees === null ? (
          <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : donnees.items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-10 text-center">
            <p className="text-body-md text-on-surface">
              Aucun{typeCourant?.ressource_libelle === "Espace" ? "" : "e"}{" "}
              {typeCourant?.ressource_pluriel.toLowerCase() ?? "ressource"}.
            </p>
            {typeCourant?.source_rh && (
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Les intervenants viennent du module RH : importez-les plutôt que de les
                ressaisir, pour que les deux fiches ne divergent pas.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
              {donnees.items.map((r) => (
                <article
                  key={r.id}
                  className={`rounded-2xl border border-outline-soft bg-surface-container-lowest p-4 ${r.active ? "" : "opacity-60"}`}
                >
                  <p className="flex flex-wrap items-center gap-2 text-body-md font-medium text-on-surface">
                    {r.nom_affiche}
                    {r.employee_id && (
                      <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                        Fiche RH
                      </span>
                    )}
                    {!r.active && (
                      <span className="rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                        Inactif
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">
                    {[r.categorie, r.reference, r.capacite ? `${r.capacite} places` : null]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  {peutGerer && (
                    <div className="mt-3 flex gap-3">
                      <button type="button" onClick={() => setEdition(r)} className="text-label-md text-primary">
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => setASupprimer(r)}
                        className="text-label-md text-on-surface-variant hover:text-error"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
            {donnees.pages > 1 && (
              <div className="mt-4">
                <Pagination page={page} pages={donnees.pages} onChange={setPage} />
              </div>
            )}
          </>
        )}

        {/* Groupes du type courant */}
        <section className="mt-8">
          <p className="mb-2 flex items-center gap-1.5 text-label-md uppercase text-outline">
            <GroupsOutlined style={{ fontSize: 15 }} />
            Groupes
            {groupes.length > 0 && <span className="text-outline-variant">{groupes.length}</span>}
          </p>
          {groupes.length === 0 ? (
            <p className="rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-6 text-center text-body-sm text-on-surface-variant">
              Aucun groupe. Un groupe sert à affecter plusieurs ressources d&apos;un geste — il
              matérialise une affectation par membre, pas un engagement collectif.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {groupes.map((g) => (
                <div
                  key={g.id}
                  className="rounded-xl border border-outline-soft bg-surface-container-lowest px-4 py-3"
                >
                  <p className="text-body-md text-on-surface">{g.nom}</p>
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">
                    {g.membres.length} membre{g.membres.length > 1 ? "s" : ""}
                    {g.membres.length > 0 && ` — ${g.membres.map((m) => m.nom_affiche).join(", ")}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {edition && typeCourant && (
        <FormulaireRessource
          typeDef={typeCourant}
          ressource={edition === "nouveau" ? null : edition}
          onClose={() => setEdition(null)}
          onDone={() => {
            setEdition(null);
            setToast("Ressource enregistrée.");
            void charger();
          }}
        />
      )}

      {importRH && (
        <ImportRH
          onClose={() => setImportRH(false)}
          onDone={(n) => {
            setImportRH(false);
            setToast(`${n} intervenant(s) importé(s).`);
            void charger();
          }}
        />
      )}

      {aSupprimer && (
        <ConfirmDialog
          title={`Supprimer « ${aSupprimer.nom_affiche} » ?`}
          message="Une ressource déjà planifiée ne peut pas être supprimée — son historique partirait avec elle. Désactivez-la pour la retirer des choix futurs."
          confirmLabel="Supprimer"
          onCancel={() => setASupprimer(null)}
          onConfirm={async () => {
            try {
              await operationsApi.supprimerRessource(aSupprimer.id);
              setToast("Ressource supprimée.");
              await charger();
            } catch (e) {
              setErreur(e instanceof Error ? e.message : "Suppression impossible.");
            } finally {
              setASupprimer(null);
            }
          }}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
