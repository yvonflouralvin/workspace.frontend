"use client";

import { useEffect, useMemo, useState } from "react";
import { AddOutlined, DeleteOutlined } from "@mui/icons-material";
import {
  listCategoriesFrais,
  createNoteFrais,
  updateNoteFrais,
  joindreJustificatif,
  type CategorieFrais,
  type Exercice,
  type NoteFrais,
  type TypeNoteFrais,
} from "@/lib/compta-api";

const FIELD =
  "rounded-lg border border-outline-soft bg-surface-container-lowest px-2.5 py-1.5 text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

interface LigneEdit {
  key: number;
  id: number | null;
  dateDepense: string;
  categorieId: number | null;
  libelle: string;
  montant: string;
  documentId: number | null;
  /** Choisi mais pas encore déposé : la note doit exister pour porter un
   *  justificatif, donc le dépôt attend le premier enregistrement. */
  fichier: File | null;
}

function ligneVide(key: number): LigneEdit {
  return {
    key, id: null, dateDepense: new Date().toISOString().slice(0, 10),
    categorieId: null, libelle: "", montant: "",
    documentId: null, fichier: null,
  };
}

function montantFr(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface Props {
  exercices: Exercice[];
  note?: NoteFrais;
  onSaved: (n: NoteFrais) => void;
  onCancel?: () => void;
}

export function NoteFraisEditor({ exercices, note, onSaved, onCancel }: Props) {
  const ouvert = exercices.find((e) => e.statut === "OUVERT");
  const [typeNote, setTypeNote] = useState<TypeNoteFrais>(note?.type_note ?? "REMBOURSEMENT");
  const [objet, setObjet] = useState(note?.objet ?? "");
  const [dateDemande, setDateDemande] = useState(
    note?.date_demande ?? new Date().toISOString().slice(0, 10),
  );
  const [exerciceId, setExerciceId] = useState(
    note ? String(note.exercice_id) : ouvert ? String(ouvert.id) : "",
  );
  const [lignes, setLignes] = useState<LigneEdit[]>(() =>
    note
      ? note.lignes.map((l, i) => ({
          key: i, id: l.id, dateDepense: l.date_depense, categorieId: l.categorie_id,
          libelle: l.libelle, montant: String(l.montant),
          documentId: l.document_id, fichier: null,
        }))
      : [ligneVide(0)],
  );
  const [nextKey, setNextKey] = useState(lignes.length);
  const [categories, setCategories] = useState<CategorieFrais[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // On ne propose QUE les catégories actives : une note de frais n'est presque
  // jamais montée par un comptable, et le plan comptable ne lui dit rien.
  useEffect(() => {
    listCategoriesFrais().then(setCategories);
  }, []);

  const total = useMemo(
    () => lignes.reduce((s, l) => s + (Number(l.montant) || 0), 0),
    [lignes],
  );

  function patch(key: number, p: Partial<LigneEdit>) {
    setLignes((prev) => prev.map((l) => (l.key === key ? { ...l, ...p } : l)));
  }

  async function enregistrer() {
    setError(null);
    if (!objet.trim() || objet.trim().length < 3) {
      setError("L'objet est obligatoire — c'est ce que liront les approbateurs.");
      return;
    }
    if (!exerciceId) {
      setError("Aucun exercice ouvert : une note de frais s'y rattache.");
      return;
    }
    const valides = lignes.filter((l) => l.categorieId && Number(l.montant) > 0 && l.libelle.trim());
    if (valides.length === 0) {
      setError("Au moins une dépense : une catégorie, un libellé et un montant supérieur à zéro.");
      return;
    }

    setSaving(true);
    try {
      const input = {
        type_note: typeNote,
        objet: objet.trim(),
        date_demande: dateDemande,
        exercice_id: Number(exerciceId),
        lignes: valides.map((l) => ({
          date_depense: l.dateDepense,
          categorie_id: l.categorieId as number,
          libelle: l.libelle.trim(),
          montant: Number(l.montant),
          document_id: l.documentId,
        })),
      };
      const saved = note ? await updateNoteFrais(note.id, input) : await createNoteFrais(input);

      // Les justificatifs choisis avant le premier enregistrement : la note
      // doit exister pour en porter un. On les dépose maintenant, dans l'ordre
      // des lignes renvoyées par le serveur.
      const aDeposer = valides
        .map((l, i) => ({ fichier: l.fichier, ligne: saved.lignes[i] }))
        .filter((x) => x.fichier && x.ligne);
      if (aDeposer.length > 0) {
        for (const { fichier, ligne } of aDeposer) {
          await joindreJustificatif(saved.id, ligne.id, fichier as File);
        }
        onSaved(await (await import("@/lib/compta-api")).getNoteFrais(saved.id));
        return;
      }
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-error-container bg-error-container/40 px-3 py-2 text-body-sm text-error">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-outline-soft bg-surface-container-lowest p-4">
        <div>
          <span className="block text-label-sm uppercase text-outline mb-1">Type</span>
          <select
            value={typeNote}
            onChange={(e) => setTypeNote(e.target.value as TypeNoteFrais)}
            className={FIELD}
          >
            <option value="REMBOURSEMENT">Remboursement — j&rsquo;ai avancé l&rsquo;argent</option>
            <option value="AVANCE">Demande d&rsquo;avance — avant de dépenser</option>
          </select>
        </div>
        <div>
          <span className="block text-label-sm uppercase text-outline mb-1">Date</span>
          <input type="date" value={dateDemande} onChange={(e) => setDateDemande(e.target.value)} className={FIELD} />
        </div>
        <div>
          <span className="block text-label-sm uppercase text-outline mb-1">Exercice</span>
          <select value={exerciceId} onChange={(e) => setExerciceId(e.target.value)} className={FIELD}>
            {exercices.filter((ex) => ex.statut === "OUVERT").map((ex) => (
              <option key={ex.id} value={ex.id}>{ex.libelle}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[240px]">
          <span className="block text-label-sm uppercase text-outline mb-1">Objet</span>
          <input
            value={objet}
            onChange={(e) => setObjet(e.target.value)}
            className={`${FIELD} w-full`}
            placeholder="Mission Lubumbashi — carburant et péage"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-outline-soft bg-surface-container-lowest overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="bg-surface-row-alt text-label-sm uppercase text-outline">
                <th className="text-left px-3 py-2 w-36">Date</th>
                <th className="text-left px-3 py-2 min-w-[220px]">Type de dépense</th>
                <th className="text-left px-3 py-2 min-w-[160px]">Dépense</th>
                <th className="text-right px-3 py-2 w-32">Montant</th>
                <th className="text-left px-3 py-2 w-48">Justificatif</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {lignes.map((l) => (
                <tr key={l.key}>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={l.dateDepense}
                      onChange={(e) => patch(l.key, { dateDepense: e.target.value })}
                      className={`${FIELD} w-full`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    {/* Une liste courte en langage courant, pas le plan
                        comptable : celui qui rentre de mission ne sait pas ce
                        qu'est un 605000. Le comptable fait la correspondance
                        une fois, dans les paramètres. */}
                    <select
                      value={l.categorieId ?? ""}
                      onChange={(e) =>
                        patch(l.key, { categorieId: e.target.value ? Number(e.target.value) : null })
                      }
                      className={`${FIELD} w-full`}
                    >
                      <option value="">Choisir…</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.libelle}</option>
                      ))}
                    </select>
                    {l.categorieId != null && (
                      <span className="block text-label-md text-outline mt-0.5">
                        {categories.find((c) => c.id === l.categorieId)?.aide ?? ""}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={l.libelle}
                      onChange={(e) => patch(l.key, { libelle: e.target.value })}
                      className={`${FIELD} w-full`}
                      placeholder="Taxi aéroport"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={l.montant}
                      onChange={(e) => patch(l.key, { montant: e.target.value })}
                      className={`${FIELD} w-full text-right`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => patch(l.key, { fichier: e.target.files?.[0] ?? null })}
                      className="text-label-md text-on-surface-variant w-full"
                    />
                    {l.documentId && !l.fichier && (
                      <span className="text-label-md text-member-active">Déjà joint</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => setLignes((p) => (p.length > 1 ? p.filter((x) => x.key !== l.key) : p))}
                      className="text-outline hover:text-error transition-colors"
                    >
                      <DeleteOutlined style={{ fontSize: 18 }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-row-alt font-semibold">
                <td className="px-3 py-2" colSpan={3}>Total</td>
                <td className="px-3 py-2 text-right">{montantFr(total)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-hairline">
          <button
            type="button"
            onClick={() => {
              setLignes((p) => [...p, ligneVide(nextKey)]);
              setNextKey((k) => k + 1);
            }}
            className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:text-primary-container transition-colors"
          >
            <AddOutlined style={{ fontSize: 16 }} />
            Ajouter une dépense
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-9 px-3.5 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-colors">
            Annuler
          </button>
        )}
        <button
          type="button"
          onClick={enregistrer}
          disabled={saving}
          className="h-9 px-4 rounded-lg bg-primary text-on-primary text-body-sm font-semibold shadow-button hover:bg-primary-container disabled:opacity-50 transition-colors"
        >
          {saving ? "Enregistrement…" : "Enregistrer en brouillon"}
        </button>
        <span className="text-label-md text-outline">
          La note part en validation quand vous la soumettez, pas à l&rsquo;enregistrement.
        </span>
      </div>

      {categories.length === 0 && (
        <p className="rounded-lg border border-outline-soft bg-surface-container-low px-3 py-2 text-body-sm text-on-surface-variant">
          Aucun type de dépense n&rsquo;est encore configuré. Un responsable de la comptabilité
          peut en charger une liste de départ depuis Paramètres → Types de dépense.
        </p>
      )}
    </div>
  );
}
