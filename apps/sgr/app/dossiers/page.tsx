"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpenOutlined } from "@mui/icons-material";
import { SearchField } from "@repo/ui/SearchField";
import { Pagination } from "@repo/ui/Pagination";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { sgrApi, type DossiersPage } from "@/app/lib/api";

const ETAPES = [
  { cle: "", libelle: "Toutes les étapes" },
  { cle: "SOUMIS", libelle: "Soumis" },
  { cle: "RECU", libelle: "Reçu" },
  { cle: "ANALYSE", libelle: "Analysé" },
  { cle: "VALIDE", libelle: "Validé" },
  { cle: "DECIDE", libelle: "Décidé" },
];

const TEINTE: Record<string, string> = {
  BROUILLON: "bg-surface-container text-outline",
  SOUMIS: "bg-primary/10 text-primary",
  RECU: "bg-tertiary/15 text-tertiary",
  ANALYSE: "bg-tertiary/15 text-tertiary",
  VALIDE: "bg-secondary/15 text-secondary",
  DECIDE: "bg-secondary/15 text-secondary",
};

/** La file d'instruction — l'écran de travail du SGR.
 *
 *  En lignes, et filtrée par étape : la question quotidienne n'est pas « quels
 *  dossiers existent » mais « lesquels attendent quelque chose de moi ».
 */
export default function DossiersPage_() {
  const router = useRouter();
  const { can } = usePermissions();
  const [page, setPage] = useState(1);
  const [recherche, setRecherche] = useState("");
  const [etape, setEtape] = useState("");
  const [liste, setListe] = useState<DossiersPage | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setListe(await sgrApi.dossiers({ q: recherche, etape, page }));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Liste indisponible.");
      setListe({ items: [], total: 0, page: 1, taille: 20 });
    }
  }, [recherche, etape, page]);

  useEffect(() => {
    const t = setTimeout(() => void charger(), 250);
    return () => clearTimeout(t);
  }, [charger]);

  if (!can("sgr.dossiers.view")) {
    return (
      <DashboardShell>
        <div className="mx-auto max-w-[1024px] p-4 md:p-8">
          <p className="text-body-md text-on-surface-variant">
            La file des dossiers est réservée au personnel du Secrétariat.
          </p>
        </div>
      </DashboardShell>
    );
  }

  const pages = Math.max(1, Math.ceil((liste?.total ?? 0) / (liste?.taille ?? 20)));

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1152px] p-4 md:p-8">
        <h1 className="font-display text-headline-sm text-on-surface">Dossiers</h1>
        <p className="mt-1 max-w-[62ch] text-body-sm text-on-surface-variant">
          Les demandes déposées en ligne, du plus récemment soumis au plus ancien.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <SearchField
            value={recherche}
            onChange={(v) => {
              setRecherche(v);
              setPage(1);
            }}
            placeholder="Nom, e-mail, référence…"
            className="w-full sm:w-[280px]"
          />
          <select
            aria-label="Filtrer par étape"
            className="h-9 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 text-body-sm text-on-surface outline-none focus:border-primary"
            value={etape}
            onChange={(e) => {
              setEtape(e.target.value);
              setPage(1);
            }}
          >
            {ETAPES.map((e) => (
              <option key={e.cle} value={e.cle}>
                {e.libelle}
              </option>
            ))}
          </select>
        </div>

        {erreur && (
          <p className="mt-4 rounded-lg bg-error-container/40 px-3 py-2 text-body-sm text-error">
            {erreur}
          </p>
        )}

        {liste === null ? (
          <p className="mt-6 text-body-sm text-on-surface-variant">Chargement…</p>
        ) : liste.items.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-12 text-center">
            <FolderOpenOutlined style={{ fontSize: 30 }} className="text-outline" />
            <p className="mt-2 text-body-md text-on-surface">Aucun dossier ne correspond.</p>
          </div>
        ) : (
          <>
            <div className="mt-5 divide-y divide-hairline overflow-hidden rounded-2xl border border-outline-soft bg-surface-container-lowest">
              {liste.items.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => router.push(`/dossiers/${d.id}`)}
                  className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-md font-medium text-on-surface">
                      {d.nom} {d.prenom}
                    </span>
                    <span className="block truncate text-label-md text-outline">
                      {d.type_libelle}
                      {d.faculte && ` · ${d.faculte}`}
                      {d.reference && ` · ${d.reference}`}
                    </span>
                  </span>
                  <span className="w-[92px] flex-none text-right text-label-md text-outline">
                    {d.nb_pieces} pièce{d.nb_pieces > 1 ? "s" : ""}
                  </span>
                  <span className="w-[110px] flex-none text-right text-label-md text-outline">
                    {d.soumis_le
                      ? new Date(d.soumis_le).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })
                      : "—"}
                  </span>
                  <span
                    className={`w-[92px] flex-none rounded-full px-2 py-0.5 text-center text-label-md ${TEINTE[d.etape] ?? ""}`}
                  >
                    {d.etape === "DECIDE" && d.decision
                      ? d.decision === "FAVORABLE"
                        ? "Favorable"
                        : "Défavorable"
                      : ETAPES.find((e) => e.cle === d.etape)?.libelle ?? d.etape}
                  </span>
                </button>
              ))}
            </div>

            {pages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination page={page} pages={pages} onChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
