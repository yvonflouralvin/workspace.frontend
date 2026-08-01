"use client";

import type { Question } from "@/app/lib/forms-api";

const CHAMP =
  "w-full h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

/** Le champ qui correspond à une question.
 *
 *  Un SEUL rendu, partagé par le formulaire interne et par la page publique.
 *  Deux rendus divergeraient au premier type ajouté, et le visiteur sans compte
 *  — celui qu'on voit le moins — hériterait de la version oubliée.
 */
export function ChampReponse({
  question,
  valeur,
  onChange,
  disabled,
}: {
  question: Question;
  valeur: unknown;
  onChange: (valeur: unknown) => void;
  disabled?: boolean;
}) {
  const commun = { disabled, "aria-label": question.libelle };

  switch (question.type) {
    case "TEXTE_LONG":
      return (
        <textarea
          {...commun}
          rows={4}
          className="w-full resize-y rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
          value={(valeur as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "CHOIX_UNIQUE":
      return (
        <div className="space-y-1.5">
          {question.options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-body-sm text-on-surface">
              <input
                type="radio"
                disabled={disabled}
                name={`q-${question.id}`}
                checked={valeur === option}
                onChange={() => onChange(option)}
              />
              {option}
            </label>
          ))}
        </div>
      );

    case "CHOIX_MULTIPLE": {
      const coches = Array.isArray(valeur) ? (valeur as string[]) : [];
      return (
        <div className="space-y-1.5">
          {question.options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-body-sm text-on-surface">
              <input
                type="checkbox"
                disabled={disabled}
                checked={coches.includes(option)}
                onChange={() =>
                  onChange(
                    coches.includes(option)
                      ? coches.filter((o) => o !== option)
                      : [...coches, option]
                  )
                }
              />
              {option}
            </label>
          ))}
        </div>
      );
    }

    case "LISTE":
      return (
        <select
          {...commun}
          className={CHAMP}
          value={(valeur as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        >
          <option value="">—</option>
          {question.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case "NOMBRE":
      return (
        <input
          {...commun}
          type="number"
          className={`${CHAMP} max-w-[12rem]`}
          value={(valeur as string) ?? ""}
          min={question.config.min}
          max={question.config.max}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        />
      );

    case "ECHELLE": {
      const min = question.config.min ?? 1;
      const max = question.config.max ?? 5;
      const notes = Array.from({ length: Math.max(1, max - min + 1) }, (_, i) => min + i);
      return (
        <div className="flex flex-wrap items-center gap-1.5">
          {notes.map((note) => (
            <button
              key={note}
              type="button"
              disabled={disabled}
              aria-pressed={valeur === note}
              onClick={() => onChange(valeur === note ? null : note)}
              className={`h-9 min-w-9 rounded-lg border px-3 text-body-sm tabular-nums transition-colors ${
                valeur === note
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-soft text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {note}
            </button>
          ))}
        </div>
      );
    }

    case "DATE":
      return (
        <input
          {...commun}
          type="date"
          className={`${CHAMP} max-w-[12rem]`}
          value={(valeur as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );

    case "EMAIL":
      return (
        <input
          {...commun}
          type="email"
          className={CHAMP}
          value={(valeur as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="nom@exemple.cd"
        />
      );

    default:
      return (
        <input
          {...commun}
          className={CHAMP}
          value={(valeur as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/** Affiche une réponse déjà donnée, dans le tableau des résultats. */
export function ValeurLisible({ valeur }: { valeur: unknown }) {
  if (valeur === null || valeur === undefined || valeur === "") {
    return <span className="text-outline-variant">—</span>;
  }
  if (Array.isArray(valeur)) return <>{valeur.join(", ")}</>;
  return <>{String(valeur)}</>;
}
