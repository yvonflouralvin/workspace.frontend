"use client";

import { useEffect, useState } from "react";
import { usePermissions } from "@repo/auth/hooks/usePermissions";
import { DashboardShell } from "@/components/DashboardShell";
import {
  listCategories,
  createCategorie,
  updateCategorie,
  type CategorieDetail,
} from "@/lib/stock-api";
import {
  AddOutlined,
  EditOutlined,
  BlockOutlined,
  CheckCircleOutlineOutlined,
  CategoryOutlined,
} from "@mui/icons-material";

const inputCls =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors";

type EditState = { id: number; nom: string; description: string } | null;

export default function CategoriesPage() {
  const { can } = usePermissions();
  const canView = can("stock.items.view");
  const canManage = can("stock.categories.manage");

  const [categories, setCategories] = useState<CategorieDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ nom: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editState, setEditState] = useState<EditState>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    loadCategories();
  }, [canView]);

  function loadCategories() {
    setLoading(true);
    setError(null);
    listCategories()
      .then(setCategories)
      .catch(() => setError("Impossible de charger les catégories."))
      .finally(() => setLoading(false));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.nom.trim()) { setCreateError("Le nom est obligatoire."); return; }
    setCreating(true);
    setCreateError(null);
    try {
      await createCategorie({ nom: createForm.nom.trim(), description: createForm.description || undefined });
      setCreateForm({ nom: "", description: "" });
      setShowCreate(false);
      loadCategories();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Erreur inattendue");
      setCreating(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editState) return;
    if (!editState.nom.trim()) { setEditError("Le nom est obligatoire."); return; }
    setEditSaving(true);
    setEditError(null);
    try {
      await updateCategorie(editState.id, { nom: editState.nom.trim(), description: editState.description || undefined });
      setEditState(null);
      loadCategories();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Erreur inattendue");
      setEditSaving(false);
    }
  }

  async function handleToggleActive(cat: CategorieDetail) {
    try {
      await updateCategorie(cat.id, { is_active: !cat.is_active });
      loadCategories();
    } catch { /* silent */ }
  }

  const active = categories.filter((c) => c.is_active);
  const inactive = categories.filter((c) => !c.is_active);

  return (
    <DashboardShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-headline-md font-display text-on-surface">Catégories</h1>
            <p className="text-body-sm text-on-surface-variant mt-0.5">
              Regroupez vos articles par catégorie.
            </p>
          </div>
          {canManage && !showCreate && (
            <button
              onClick={() => { setShowCreate(true); setCreateError(null); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-body-md font-medium hover:bg-primary-container transition-colors shrink-0"
            >
              <AddOutlined style={{ fontSize: 18 }} />
              Nouvelle catégorie
            </button>
          )}
        </div>

        {/* Create form */}
        {showCreate && canManage && (
          <form onSubmit={handleCreate} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 space-y-4 max-w-xl">
            <h2 className="text-body-md font-semibold text-on-surface">Nouvelle catégorie</h2>
            {createError && <p className="text-body-sm text-error">{createError}</p>}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-label-md text-on-surface-variant">Nom *</label>
                <input
                  type="text"
                  value={createForm.nom}
                  onChange={(e) => setCreateForm((f) => ({ ...f, nom: e.target.value }))}
                  placeholder="Ex : Fournitures de bureau"
                  className={inputCls}
                  autoFocus
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-label-md text-on-surface-variant">Description</label>
                <input
                  type="text"
                  value={createForm.description}
                  onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optionnel"
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 bg-primary text-on-primary text-body-sm rounded-xl font-medium disabled:opacity-60 transition-colors"
              >
                {creating ? "Enregistrement…" : "Créer"}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setCreateError(null); }}
                className="px-4 py-2 text-body-sm border border-outline-variant rounded-xl hover:bg-surface-container transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        )}

        {/* Content */}
        {!canView ? (
          <p className="text-body-sm text-on-surface-variant text-center py-8">Accès non autorisé.</p>
        ) : error ? (
          <p className="text-body-sm text-error text-center py-8">{error}</p>
        ) : loading ? (
          <p className="text-body-sm text-on-surface-variant text-center py-8">Chargement…</p>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-on-surface-variant">
            <CategoryOutlined style={{ fontSize: 48 }} className="opacity-30" />
            <p className="text-body-md">Aucune catégorie créée.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-body-md font-semibold text-on-surface">Actives</h2>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-label-md text-on-surface-variant">{active.length}</span>
              </div>
              {active.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">Aucune catégorie active.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {active.map((cat) => (
                    <CatCard
                      key={cat.id}
                      cat={cat}
                      canManage={canManage}
                      editState={editState}
                      editSaving={editSaving}
                      editError={editError}
                      inputCls={inputCls}
                      onEdit={() => setEditState({ id: cat.id, nom: cat.nom, description: cat.description ?? "" })}
                      onCancelEdit={() => { setEditState(null); setEditError(null); }}
                      onSaveEdit={handleSaveEdit}
                      onEditChange={(field, val) => setEditState((s) => s ? { ...s, [field]: val } : s)}
                      onToggle={() => handleToggleActive(cat)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Inactive */}
            {inactive.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-body-md font-semibold text-on-surface-variant">Inactives</h2>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-label-md text-on-surface-variant">{inactive.length}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 opacity-60">
                  {inactive.map((cat) => (
                    <CatCard
                      key={cat.id}
                      cat={cat}
                      canManage={canManage}
                      editState={editState}
                      editSaving={editSaving}
                      editError={editError}
                      inputCls={inputCls}
                      onEdit={() => setEditState({ id: cat.id, nom: cat.nom, description: cat.description ?? "" })}
                      onCancelEdit={() => { setEditState(null); setEditError(null); }}
                      onSaveEdit={handleSaveEdit}
                      onEditChange={(field, val) => setEditState((s) => s ? { ...s, [field]: val } : s)}
                      onToggle={() => handleToggleActive(cat)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function CatCard({
  cat, canManage, editState, editSaving, editError, inputCls,
  onEdit, onCancelEdit, onSaveEdit, onEditChange, onToggle,
}: {
  cat: CategorieDetail;
  canManage: boolean;
  editState: EditState;
  editSaving: boolean;
  editError: string | null;
  inputCls: string;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (e: React.FormEvent) => void;
  onEditChange: (field: "nom" | "description", val: string) => void;
  onToggle: () => void;
}) {
  const isEditing = editState?.id === cat.id;

  if (isEditing && editState) {
    return (
      <form onSubmit={onSaveEdit} className="bg-surface-container-lowest border border-primary/40 rounded-xl p-4 space-y-3">
        {editError && <p className="text-body-sm text-error">{editError}</p>}
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant">Nom *</label>
          <input
            type="text"
            value={editState.nom}
            onChange={(e) => onEditChange("nom", e.target.value)}
            className={inputCls}
            autoFocus
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant">Description</label>
          <input
            type="text"
            value={editState.description}
            onChange={(e) => onEditChange("description", e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" disabled={editSaving} className="px-3 py-1.5 bg-primary text-on-primary text-body-sm rounded-lg font-medium disabled:opacity-60 transition-colors">
            {editSaving ? "…" : "Enregistrer"}
          </button>
          <button type="button" onClick={onCancelEdit} className="px-3 py-1.5 text-body-sm border border-outline-variant rounded-lg hover:bg-surface-container transition-colors">
            Annuler
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="group bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col gap-2 hover:border-outline transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-body-md font-semibold text-on-surface leading-tight">{cat.nom}</p>
        {canManage && (
          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              title="Modifier"
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <EditOutlined style={{ fontSize: 15 }} />
            </button>
            <button
              onClick={onToggle}
              title={cat.is_active ? "Désactiver" : "Réactiver"}
              className={`p-1.5 rounded-lg transition-colors ${cat.is_active ? "text-on-surface-variant hover:text-error hover:bg-error/5" : "text-secondary hover:bg-secondary/5"}`}
            >
              {cat.is_active
                ? <BlockOutlined style={{ fontSize: 15 }} />
                : <CheckCircleOutlineOutlined style={{ fontSize: 15 }} />
              }
            </button>
          </div>
        )}
      </div>
      {cat.description && (
        <p className="text-body-sm text-on-surface-variant line-clamp-2">{cat.description}</p>
      )}
    </div>
  );
}
