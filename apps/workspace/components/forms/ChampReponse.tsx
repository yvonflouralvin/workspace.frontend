"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AttachFileOutlined } from "@mui/icons-material";
import { poidsLisible } from "@repo/ui/ApercuFichier";
import type { Depot, Question } from "@/app/lib/forms-api";

const CHAMP =
  "w-full h-9 px-3 rounded-lg border border-outline-soft bg-surface-container-lowest text-body-sm text-on-surface outline-none focus:border-primary transition-colors";

export interface Creneau {
  date: string;
  debut: string;
  fin: string;
}

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
  onDeposer,
  ressource,
  onOccupations,
}: {
  question: Question;
  valeur: unknown;
  onChange: (valeur: unknown) => void;
  disabled?: boolean;
  /** CRENEAU : la ressource choisie dans une autre question. C'est l'écran qui
   *  la résout — lui seul connaît toutes les réponses en cours. */
  ressource?: string | null;
  /** CRENEAU : va chercher ce qui est déjà pris. Fourni par l'écran, parce que
   *  le chemin diffère selon qu'on est connecté ou non. */
  onOccupations?: (
    question: Question,
    ressource: string | null,
    jour: string,
  ) => Promise<{ debut: string; fin: string }[]>;
  /** Dépose le fichier et rend sa référence. Fourni par l'écran, parce que le
   *  chemin diffère selon qu'on est connecté ou non. */
  onDeposer?: (question: Question, fichier: File) => Promise<Depot>;
}) {
  const commun = { disabled, "aria-label": question.libelle };

  switch (question.type) {
    case "FICHIER":
      return (
        <ChampFichier
          question={question}
          valeur={valeur as Depot | null}
          disabled={disabled}
          onChange={onChange}
          onDeposer={onDeposer}
        />
      );

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

    case "HEURE":
      return (
        <input
          {...commun}
          type="time"
          className={`${CHAMP} max-w-[9rem]`}
          value={(valeur as string) ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
        />
      );

    case "CRENEAU":
      return (
        <ChampCreneau
          question={question}
          valeur={valeur as Creneau | null}
          disabled={disabled}
          onChange={onChange}
          ressource={ressource ?? null}
          onOccupations={onOccupations}
        />
      );

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

/** Dépôt d'un fichier.
 *
 *  Le fichier part AVANT la soumission : on ne fait pas transiter des octets
 *  dans un corps JSON, et un envoi multipart portant vingt réponses et trois
 *  fichiers serait illisible. La valeur de la réponse est donc la RÉFÉRENCE
 *  rendue par le dépôt.
 */
function ChampFichier({
  question,
  valeur,
  disabled,
  onChange,
  onDeposer,
}: {
  question: Question;
  valeur: Depot | null;
  disabled?: boolean;
  onChange: (valeur: unknown) => void;
  onDeposer?: (question: Question, fichier: File) => Promise<Depot>;
}) {
  const champ = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const extensions = question.config.extensions ?? [];
  const plafond = question.config.taille_max_mo;

  return (
    <div>
      <input
        ref={champ}
        type="file"
        className="hidden"
        aria-label={question.libelle}
        accept={extensions.map((e) => `.${e}`).join(",") || undefined}
        onChange={async (e) => {
          const fichier = e.target.files?.[0];
          if (!fichier || !onDeposer) return;
          setBusy(true);
          setErreur(null);
          try {
            onChange(await onDeposer(question, fichier));
          } catch (err) {
            setErreur(err instanceof Error ? err.message : "Dépôt impossible.");
            onChange(null);
          } finally {
            setBusy(false);
            if (champ.current) champ.current.value = "";
          }
        }}
      />

      {valeur ? (
        <p className="inline-flex max-w-full items-center gap-2 rounded-lg border border-outline-soft bg-surface-container-lowest px-3 py-2 text-body-sm text-on-surface">
          <AttachFileOutlined style={{ fontSize: 15 }} className="flex-none text-outline" />
          <span className="truncate">{valeur.file_name}</span>
          <span className="flex-none text-label-md text-outline">
            {poidsLisible(valeur.file_size)}
          </span>
          {!disabled && (
            <button
              type="button"
              aria-label="Retirer le fichier"
              onClick={() => onChange(null)}
              className="flex-none text-outline hover:text-error transition-colors"
            >
              ×
            </button>
          )}
        </p>
      ) : (
        <button
          type="button"
          disabled={disabled || busy || !onDeposer}
          onClick={() => champ.current?.click()}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-outline-soft text-body-sm text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50 transition-colors"
        >
          <AttachFileOutlined style={{ fontSize: 15 }} />
          {busy ? "Dépôt en cours…" : "Choisir un fichier"}
        </button>
      )}

      <p className="mt-1 text-label-md text-outline">
        {extensions.length ? `Formats acceptés : ${extensions.join(", ")}. ` : ""}
        {plafond ? `${plafond} Mo au maximum.` : ""}
      </p>

      {erreur && <p className="mt-1 text-label-md text-error">{erreur}</p>}
    </div>
  );
}

/** Affiche une réponse déjà donnée, dans le tableau des résultats. */
export function ValeurLisible({
  valeur,
  lienFichier,
}: {
  valeur: unknown;
  /** Construit l'URL de téléchargement d'un fichier joint. */
  lienFichier?: (documentId: number) => string;
}) {
  if (valeur === null || valeur === undefined || valeur === "") {
    return <span className="text-outline-variant">—</span>;
  }
  if (Array.isArray(valeur)) return <>{valeur.join(", ")}</>;
  // Un créneau se lit d'un bloc : « 12/08/2026, 14:00–16:00 ». Rendre l'objet
  // brut afficherait « [object Object] » dans le dépouillement.
  if (typeof valeur === "object" && valeur !== null && "debut" in valeur && "date" in valeur) {
    const c = valeur as { date: string; debut: string; fin: string };
    return (
      <>
        {new Date(`${c.date}T12:00:00`).toLocaleDateString("fr-FR")}, {c.debut}–{c.fin}
      </>
    );
  }
  if (typeof valeur === "object" && valeur !== null && "document_id" in valeur) {
    const depot = valeur as Depot;
    if (!lienFichier) return <>{depot.file_name}</>;
    return (
      <a
        href={lienFichier(depot.document_id)}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        <AttachFileOutlined style={{ fontSize: 14 }} />
        {depot.file_name}
      </a>
    );
  }
  return <>{String(valeur)}</>;
}


/** Un créneau : un jour, deux heures, et ce qui est déjà pris.
 *
 *  Montrer les occupations AVANT le choix des heures est tout l'intérêt du
 *  type : sans elles, le répondant demande à l'aveugle et découvre le refus
 *  après coup — quand il a déjà quitté la page.
 */
function ChampCreneau({
  question,
  valeur,
  disabled,
  onChange,
  ressource,
  onOccupations,
}: {
  question: Question;
  valeur: Creneau | null;
  disabled?: boolean;
  onChange: (valeur: unknown) => void;
  ressource: string | null;
  onOccupations?: (
    question: Question,
    ressource: string | null,
    jour: string,
  ) => Promise<{ debut: string; fin: string }[]>;
}) {
  const creneau: Creneau = valeur ?? { date: "", debut: "", fin: "" };
  const [occupes, setOccupes] = useState<{ debut: string; fin: string }[] | null>(null);
  const [chargement, setChargement] = useState(false);

  const poser = (champ: keyof Creneau, v: string) => {
    const suivant = { ...creneau, [champ]: v };
    onChange(suivant.date || suivant.debut || suivant.fin ? suivant : null);
  };

  const charger = useCallback(async () => {
    if (!onOccupations || !creneau.date) {
      setOccupes(null);
      return;
    }
    setChargement(true);
    try {
      setOccupes(await onOccupations(question, ressource, creneau.date));
    } catch {
      // Une source muette n'est pas une journée libre : on le dit plutôt que
      // d'afficher une liste vide rassurante.
      setOccupes(null);
    } finally {
      setChargement(false);
    }
  }, [onOccupations, question, ressource, creneau.date]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const chevauche =
    creneau.debut && creneau.fin && occupes
      ? occupes.some((o) => creneau.debut < o.fin && creneau.fin > o.debut)
      : false;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-label-sm text-on-surface-variant">Date</span>
          <input
            type="date"
            disabled={disabled}
            min={question.config.date_min}
            max={question.config.date_max}
            className={`${CHAMP} max-w-[12rem]`}
            value={creneau.date}
            onChange={(e) => poser("date", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label-sm text-on-surface-variant">De</span>
          <input
            type="time"
            disabled={disabled}
            className={`${CHAMP} max-w-[8rem]`}
            value={creneau.debut}
            onChange={(e) => poser("debut", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label-sm text-on-surface-variant">À</span>
          <input
            type="time"
            disabled={disabled}
            className={`${CHAMP} max-w-[8rem]`}
            value={creneau.fin}
            onChange={(e) => poser("fin", e.target.value)}
          />
        </label>
      </div>

      {creneau.date && onOccupations && (
        <div className="rounded-lg bg-surface-container-low px-3 py-2">
          <p className="text-label-md text-on-surface-variant">
            Déjà pris {ressource ? `— ${ressource}` : ""}
          </p>
          {chargement ? (
            <p className="mt-0.5 text-label-md text-outline">…</p>
          ) : occupes === null ? (
            <p className="mt-0.5 text-label-md text-outline">
              Disponibilités indisponibles pour l&apos;instant.
            </p>
          ) : occupes.length === 0 ? (
            <p className="mt-0.5 text-label-md text-outline">Rien ce jour-là.</p>
          ) : (
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {occupes.map((o) => (
                <li
                  key={`${o.debut}-${o.fin}`}
                  className="rounded-full bg-surface-container px-2 py-0.5 text-label-md tabular-nums text-on-surface-variant"
                >
                  {o.debut}–{o.fin}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {chevauche && (
        <p className="text-label-md text-error">
          Ce créneau recouvre une réservation existante.
        </p>
      )}
      {creneau.debut && creneau.fin && creneau.fin <= creneau.debut && (
        <p className="text-label-md text-error">L&apos;heure de fin doit suivre le début.</p>
      )}
    </div>
  );
}
