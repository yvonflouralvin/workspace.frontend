"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import { RightDrawer } from "@repo/ui/RightDrawer";
import { listExamens, createExamen, deleteExamen, type ExamenListItem } from "@/app/lib/examens-api";
import {
  ArrowBackOutlined,
  SearchOutlined,
  AddOutlined,
  LockOutlined,
  ScienceOutlined,
  ChevronRightOutlined,
  DeleteOutlineOutlined,
} from "@mui/icons-material";

const inputCls =
  "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-label-md font-medium text-on-surface-variant mb-1.5";

export default function ExamensMedicauxPage() {
  const { can } = usePermissions();
  const canManage = can("hosto.settings.manage");
  const router = useRouter();

  const [items, setItems] = useState<ExamenListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!canManage) { setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(() => {
      listExamens({ q: search || undefined, page, per_page: 20 })
        .then((p) => { setItems(p.items); setTotal(p.total); setPages(p.pages); })
        .catch(() => setError("Impossible de charger les examens."))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [canManage, search, page]);

  function reload() {
    listExamens({ q: search || undefined, page, per_page: 20 })
      .then((p) => { setItems(p.items); setTotal(p.total); setPages(p.pages); })
      .catch(() => {});
  }

  async function onDelete(e: React.MouseEvent, id: number) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Supprimer cet examen personnalisé ?")) return;
    try {
      await deleteExamen(id);
      reload();
    } catch {
      setError("Suppression impossible.");
    }
  }

  return (
    <DashboardShell>
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <Link
          href="/parametres/prestations"
          className="inline-flex items-center gap-1.5 text-body-sm text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowBackOutlined style={{ fontSize: 16 }} /> Retour aux prestations
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Examens Médicaux</h1>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Catalogue LOINC des examens, complété par vos examens personnalisés.
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 bg-primary text-on-primary text-body-md font-medium px-4 py-2 rounded-xl hover:bg-primary-container transition-colors"
            >
              <AddOutlined style={{ fontSize: 18 }} /> Ajouter un examen
            </button>
          )}
        </div>

        <div className="relative">
          <SearchOutlined
            style={{ fontSize: 18 }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
          />
          <input
            type="search"
            placeholder="Rechercher un examen (nom, code LOINC)…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {!canManage && (
          <p className="text-body-sm text-on-surface-variant bg-surface-container rounded-xl px-4 py-3">
            Accès restreint — vous n&apos;avez pas la permission d&apos;accéder aux paramètres.
          </p>
        )}
        {error && (
          <p className="text-body-sm text-error bg-error-container/40 rounded-xl px-4 py-3">{error}</p>
        )}
        {canManage && loading && <p className="text-body-sm text-on-surface-variant">Chargement…</p>}

        {canManage && !loading && (
          <>
            <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest divide-y divide-outline-variant overflow-hidden">
              {items.length === 0 && (
                <p className="px-5 py-6 text-body-sm text-on-surface-variant">
                  {search ? `Aucun examen pour « ${search} ».` : "Aucun examen."}
                </p>
              )}
              {items.map((ex) => (
                <Link
                  key={ex.id}
                  href={`/parametres/prestations/examens-medicaux/${ex.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors"
                >
                  <span className="text-on-surface-variant">
                    <ScienceOutlined style={{ fontSize: 22 }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-body-md font-medium text-on-surface truncate">{ex.name}</p>
                      {ex.is_loinc ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm font-medium bg-surface-container-high text-on-surface-variant">
                          <LockOutlined style={{ fontSize: 12 }} /> LOINC
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-medium bg-tertiary/10 text-tertiary">
                          Personnalisé
                        </span>
                      )}
                    </div>
                    <p className="text-body-sm text-on-surface-variant">
                      {[ex.loinc_code, ex.category, `${ex.nb_parametres} paramètre${ex.nb_parametres > 1 ? "s" : ""}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {ex.editable && (
                    <button
                      onClick={(e) => onDelete(e, ex.id)}
                      title="Supprimer"
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors shrink-0"
                    >
                      <DeleteOutlineOutlined style={{ fontSize: 18 }} />
                    </button>
                  )}
                  <ChevronRightOutlined style={{ fontSize: 20 }} className="text-on-surface-variant shrink-0" />
                </Link>
              ))}
            </div>

            {pages > 1 && (
              <div className="flex items-center justify-between text-body-sm text-on-surface-variant">
                <span>{total} examen{total > 1 ? "s" : ""}</span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-40"
                  >
                    Précédent
                  </button>
                  <span>{page} / {pages}</span>
                  <button
                    disabled={page >= pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant hover:bg-surface-container transition-colors disabled:opacity-40"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {adding && (
        <AddExamenDrawer
          onClose={() => setAdding(false)}
          onCreated={(id) => { setAdding(false); router.push(`/parametres/prestations/examens-medicaux/${id}`); }}
        />
      )}
    </DashboardShell>
  );
}

function AddExamenDrawer({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [specimen, setSpecimen] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const ex = await createExamen({
        name: name.trim(),
        category: category.trim() || null,
        specimen: specimen.trim() || null,
        code: code.trim() || null,
      });
      onCreated(ex.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création.");
      setSubmitting(false);
    }
  }

  return (
    <RightDrawer title="Ajouter un examen" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="text-body-sm text-error bg-error-container/40 rounded-lg px-3 py-2">{error}</p>}
        <div>
          <label className={labelCls}>Nom de l&apos;examen *</label>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </div>
        <div>
          <label className={labelCls}>Catégorie</label>
          <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Hématologie, Biochimie…" />
        </div>
        <div>
          <label className={labelCls}>Prélèvement / échantillon</label>
          <input className={inputCls} value={specimen} onChange={(e) => setSpecimen(e.target.value)} placeholder="Sang, urine…" />
        </div>
        <div>
          <label className={labelCls}>Code interne (facultatif)</label>
          <input className={inputCls} value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-body-md font-medium text-on-surface-variant hover:bg-surface-container transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={submitting || !name.trim()} className="px-4 py-2 rounded-xl text-body-md font-medium bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-50">
            {submitting ? "Création…" : "Créer"}
          </button>
        </div>
      </form>
    </RightDrawer>
  );
}
