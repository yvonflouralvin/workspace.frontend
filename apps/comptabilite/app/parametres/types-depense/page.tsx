"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { SearchSelect } from "@repo/ui/SearchSelect";
import { ArrowBackOutlined } from "@mui/icons-material";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listCategoriesFrais,
  chargerCategoriesFraisDefaut,
  updateCategorieFrais,
  createCategorieFrais,
  listComptes,
  type CategorieFrais,
  type Compte,
} from "@/lib/compta-api";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

export default function TypesDepensePage() {
  const { can } = usePermissions();
  const canManage = can("comptabilite.parametrage.manage");

  const [categories, setCategories] = useState<CategorieFrais[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nouveau, setNouveau] = useState("");

  function recharger() {
    listCategoriesFrais(true).then(setCategories);
  }
  useEffect(recharger, []);

  async function agir(action: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await action();
      recharger();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setBusy(false);
    }
  }

  const sansCompte = (categories ?? []).filter((c) => c.actif && !c.compte_id).length;

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-[1000px] mx-auto space-y-5">
        <div className="flex items-start gap-3">
          <Link href="/parametres" className="text-outline hover:text-on-surface transition-colors mt-1">
            <ArrowBackOutlined style={{ fontSize: 20 }} />
          </Link>
          <div>
            <h1 className="font-display text-headline-lg text-on-surface">Types de dépense</h1>
            <p className="text-body-md text-on-surface-variant mt-0.5">
              Ce que choisit celui qui monte une note de frais, et le compte de charge que la
              comptabilité utilisera. Il n&rsquo;a pas à connaître le plan comptable ; vous faites la
              correspondance une fois.
            </p>
          </div>
        </div>

        {error && <p className="text-body-sm text-error">{error}</p>}

        {categories !== null && categories.length === 0 && (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-5 space-y-3">
            <p className="text-body-md text-on-surface-variant">
              Aucun type de dépense. Une liste de départ en langage courant est disponible —
              elle arrive <strong>sans compte rattaché</strong> : les deviner poserait des écritures
              sur des comptes que personne n&rsquo;a choisis.
            </p>
            <button
              type="button"
              disabled={!canManage || busy}
              onClick={() => agir(chargerCategoriesFraisDefaut)}
              className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
            >
              Charger la liste de départ
            </button>
          </div>
        )}

        {sansCompte > 0 && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-body-sm text-amber-900">
            {sansCompte} type{sansCompte > 1 ? "s" : ""} de dépense sans compte rattaché. Les notes
            qui les utilisent passent quand même, mais ne produiront pas d&rsquo;écriture automatique
            à l&rsquo;approbation.
          </p>
        )}

        {categories === null ? (
          <p className="text-body-md text-on-surface-variant">Chargement…</p>
        ) : categories.length > 0 && (
          <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <thead>
                  <tr className="bg-surface-row-alt text-label-sm uppercase text-outline">
                    <th className="text-left px-3 py-2 min-w-[180px]">Type de dépense</th>
                    <th className="text-left px-3 py-2 min-w-[200px]">Aide affichée</th>
                    <th className="text-left px-3 py-2 min-w-[260px]">Compte de charge</th>
                    <th className="text-left px-3 py-2 w-24">Proposé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {categories.map((c) => (
                    <tr key={c.id} className={c.actif ? "" : "opacity-60"}>
                      <td className="px-3 py-2 font-semibold text-on-surface">{c.libelle}</td>
                      <td className="px-3 py-2 text-on-surface-variant">{c.aide ?? "—"}</td>
                      <td className="px-3 py-2">
                        <SearchSelect<Compte>
                          fetchOptions={(q) => listComptes({ q })}
                          value={c.compte_id}
                          disabled={!canManage}
                          onChange={(value) =>
                            agir(() =>
                              updateCategorieFrais(c.id, {
                                libelle: c.libelle, aide: c.aide,
                                compte_id: (value as number) ?? null,
                                actif: c.actif, position: c.position,
                              }),
                            )
                          }
                          getOptionLabel={(x) => `${x.numero} — ${x.libelle}`}
                          initialLabel={c.compte_numero ? `${c.compte_numero} — ${c.compte_libelle}` : ""}
                          placeholder="Aucun — pas d'écriture automatique"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <label className="inline-flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            checked={c.actif}
                            disabled={!canManage || busy}
                            onChange={() =>
                              agir(() =>
                                updateCategorieFrais(c.id, {
                                  libelle: c.libelle, aide: c.aide, compte_id: c.compte_id,
                                  actif: !c.actif, position: c.position,
                                }),
                              )
                            }
                          />
                          <span className="text-label-md text-outline">{c.actif ? "oui" : "non"}</span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {canManage && (
              <div className="px-3 py-2.5 border-t border-hairline flex items-center gap-2">
                <input
                  value={nouveau}
                  onChange={(e) => setNouveau(e.target.value)}
                  placeholder="Ajouter un type — « Frais de douane »…"
                  className={`${FIELD} flex-1 max-w-sm`}
                />
                <button
                  type="button"
                  disabled={busy || nouveau.trim().length < 2}
                  onClick={() =>
                    agir(async () => {
                      await createCategorieFrais({
                        libelle: nouveau.trim(), aide: null, compte_id: null,
                        actif: true, position: categories.length,
                      });
                      setNouveau("");
                    })
                  }
                  className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface hover:bg-surface-container-low disabled:opacity-50 transition-colors"
                >
                  Ajouter
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
