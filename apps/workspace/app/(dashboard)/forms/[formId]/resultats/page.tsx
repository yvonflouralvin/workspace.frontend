"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DownloadOutlined } from "@mui/icons-material";
import { ValeurLisible } from "@/components/forms/ChampReponse";
import { formsApi, type Soumission } from "@/app/lib/forms-api";
import { useFormulaire } from "../form-context";

type Vue = "tableau" | "synthese";

export default function ResultatsPage() {
  const { forme } = useFormulaire();
  const id = forme.id;
  const [soumissions, setSoumissions] = useState<Soumission[] | null>(null);
  const [vue, setVue] = useState<Vue>("synthese");
  const [refus, setRefus] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setSoumissions(await formsApi.soumissions(id));
    } catch (e) {
      setRefus(e instanceof Error ? e.message : "Résultats indisponibles.");
    }
  }, [id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  // Toutes les questions, y compris celles qui ont été retirées : les réponses
  // déjà reçues pointent dessus, et les masquer amputerait le dépouillement.
  const colonnes = useMemo(() => forme.questions, [forme]);

  const synthese = useMemo(() => {
    if (!soumissions) return [];
    return colonnes.map((question) => {
      const valeurs = soumissions
        .map((s) => s.reponses[String(question.id)])
        .filter((v) => v !== undefined && v !== null && v !== "");
      const comptes = new Map<string, number>();
      for (const valeur of valeurs) {
        for (const part of Array.isArray(valeur) ? valeur : [valeur]) {
          const cle = String(part);
          comptes.set(cle, (comptes.get(cle) ?? 0) + 1);
        }
      }
      return {
        question,
        repondu: valeurs.length,
        // Le décompte ne vaut que pour ce qui se répète. Sur du texte libre, il
        // afficherait autant de lignes que de réponses et ne dirait rien.
        parValeur:
          question.type === "TEXTE_COURT" ||
          question.type === "TEXTE_LONG" ||
          question.type === "EMAIL"
            ? null
            : [...comptes.entries()].sort((a, b) => b[1] - a[1]),
        exemples: valeurs.slice(0, 5).map(String),
      };
    });
  }, [colonnes, soumissions]);

  function exporter() {
    if (!soumissions) return;
    const echapper = (valeur: unknown) => {
      // Un fichier s'exporte par son nom : coller l'objet JSON rendrait la
      // colonne illisible dans un tableur.
      const brut =
        valeur && typeof valeur === "object" && "file_name" in (valeur as object)
          ? (valeur as { file_name: string }).file_name
          : valeur;
      const texte = Array.isArray(brut) ? brut.join(" | ") : String(brut ?? "");
      return `"${texte.replace(/"/g, '""')}"`;
    };
    const lignes = [
      ["Date", "Répondant", ...colonnes.map((q) => q.libelle)].map(echapper).join(","),
      ...soumissions.map((s) =>
        [
          new Date(s.created_at).toLocaleString("fr-FR"),
          s.repondant_nom ?? (s.repondant_user_id ? `#${s.repondant_user_id}` : "Anonyme"),
          ...colonnes.map((q) => s.reponses[String(q.id)]),
        ]
          .map(echapper)
          .join(",")
      ),
    ].join("\n");
    // BOM : sans lui, Excel ouvre l'export en Latin-1 et massacre les accents.
    const url = URL.createObjectURL(new Blob(["﻿" + lignes], { type: "text/csv" }));
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = `${forme.titre.replace(/[^\p{L}\p{N}]+/gu, "-")}.csv`;
    lien.click();
    URL.revokeObjectURL(url);
  }

  if (refus) return <p className="text-body-md text-error">{refus}</p>;
  if (!soumissions) {
    return <p className="text-body-md text-on-surface-variant">Chargement…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-body-sm text-on-surface-variant">
          {soumissions.length} réponse{soumissions.length > 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <span className="inline-flex rounded-lg border border-outline-soft overflow-hidden">
            {(["synthese", "tableau"] as Vue[]).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={vue === v}
                onClick={() => setVue(v)}
                className={`h-8 px-3 text-body-sm border-l border-outline-soft first:border-l-0 capitalize transition-colors ${
                  vue === v
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container-low"
                }`}
              >
                {v === "synthese" ? "Synthèse" : "Tableau"}
              </button>
            ))}
          </span>
          <button
            type="button"
            disabled={!soumissions.length}
            onClick={exporter}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-outline-soft text-body-sm font-medium text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50 transition-colors"
          >
            <DownloadOutlined style={{ fontSize: 16 }} />
            CSV
          </button>
        </div>
      </div>

      {soumissions.length === 0 && (
        <p className="mt-6 rounded-2xl border border-outline-soft bg-surface-container-lowest px-4 py-8 text-center text-body-sm text-on-surface-variant">
          Aucune réponse pour l&apos;instant.
        </p>
      )}

      {soumissions.length > 0 && vue === "synthese" && (
        <div className="mt-5 space-y-3">
          {synthese.map(({ question, repondu, parValeur, exemples }) => (
            <section
              key={question.id}
              className="rounded-2xl border border-outline-soft bg-surface-container-lowest p-4"
            >
              <p className="text-body-md font-medium text-on-surface">
                {question.libelle}
                {question.supprimee && (
                  <span className="ml-2 rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-outline">
                    question retirée
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-label-md text-outline">
                {repondu} réponse{repondu > 1 ? "s" : ""} sur {soumissions.length}
              </p>

              {parValeur ? (
                <div className="mt-3 space-y-1.5">
                  {parValeur.length === 0 && (
                    <p className="text-body-sm text-outline-variant">—</p>
                  )}
                  {parValeur.map(([valeur, compte]) => (
                    <div key={valeur} className="flex items-center gap-2">
                      <span className="w-[38%] min-w-0 truncate text-body-sm text-on-surface">
                        {valeur}
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-track">
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${Math.round((compte / Math.max(1, repondu)) * 100)}%` }}
                        />
                      </span>
                      <span className="w-10 flex-none text-right text-label-md tabular-nums text-outline">
                        {compte}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="mt-3 space-y-1">
                  {exemples.map((exemple, i) => (
                    <li key={i} className="truncate text-body-sm text-on-surface-variant">
                      « {exemple} »
                    </li>
                  ))}
                  {repondu > exemples.length && (
                    <li className="text-label-md text-outline">
                      … et {repondu - exemples.length} autre
                      {repondu - exemples.length > 1 ? "s" : ""} — voir le tableau
                    </li>
                  )}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}

      {soumissions.length > 0 && vue === "tableau" && (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-outline-soft bg-surface-container-lowest">
          <table className="w-full border-collapse text-body-sm">
            <thead className="bg-surface-row-alt">
              <tr>
                <th className="whitespace-nowrap px-3 py-2 text-left text-label-sm uppercase text-outline">
                  Date
                </th>
                <th className="whitespace-nowrap px-3 py-2 text-left text-label-sm uppercase text-outline">
                  Répondant
                </th>
                {colonnes.map((q) => (
                  <th
                    key={q.id}
                    className="min-w-[160px] px-3 py-2 text-left text-label-sm uppercase text-outline"
                  >
                    {q.libelle}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {soumissions.map((s) => (
                <tr key={s.id} className="border-t border-hairline">
                  <td className="whitespace-nowrap px-3 py-2 text-on-surface-variant">
                    {new Date(s.created_at).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-on-surface">
                    {s.repondant_nom ?? (
                      <span className="text-outline-variant">Anonyme</span>
                    )}
                    {s.repondant_email && (
                      <span className="ml-1 text-label-md text-outline">{s.repondant_email}</span>
                    )}
                  </td>
                  {colonnes.map((q) => (
                    <td key={q.id} className="px-3 py-2 text-on-surface">
                      <ValeurLisible
                        valeur={s.reponses[String(q.id)]}
                        lienFichier={(documentId) => formsApi.fichierUrl(id, documentId)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
